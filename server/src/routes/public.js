import { Router } from "express";
import mongoose from "mongoose";
import { Banner } from "../models/Banner.js";
import { Popup } from "../models/Popup.js";
import { Partner, PartnerType } from "../models/Partner.js";
import { Product } from "../models/Product.js";
import { ProductCategory } from "../models/ProductCategory.js";
import { Board } from "../models/Board.js";
import { BoardPost } from "../models/BoardPost.js";
import { Inquiry, HowHeard } from "../models/Inquiry.js";
import { SiteSetting, SITE_SETTING_KEY } from "../models/SiteSetting.js";
import { sendInquiryNotification } from "../utils/email.js";

const router = Router();

function parsePagination(req, defaultLimit = 12) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

router.get("/site-settings", async (_req, res) => {
  let doc = await SiteSetting.findOne({ key: SITE_SETTING_KEY }).lean();
  if (!doc) {
    await SiteSetting.create({ key: SITE_SETTING_KEY });
    doc = await SiteSetting.findOne({ key: SITE_SETTING_KEY }).lean();
  }
  res.json(doc);
});

router.get("/banners", async (_req, res) => {
  const items = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean();
  res.json(items);
});

router.get("/popups/active", async (_req, res) => {
  const now = new Date();
  const items = await Popup.find({
    isActive: true,
    $and: [{ $or: [{ startAt: null }, { startAt: { $lte: now } }] }, { $or: [{ endAt: null }, { endAt: { $gte: now } }] }],
  })
    .sort({ createdAt: -1 })
    .lean();
  res.json(items);
});

router.get("/partners", async (req, res) => {
  const { type, search } = req.query;
  const filter = { isActive: true };
  if (type === PartnerType.MANUFACTURER || type === PartnerType.SYNTHESIS) filter.type = type;
  if (search && String(search).trim()) {
    const rx = new RegExp(String(search).trim(), "i");
    filter.$or = [{ name: rx }, { productNumber: rx }, { shortDescription: rx }];
  }
  const items = await Partner.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  res.json(items);
});

async function productCategoryPathNames(leafId) {
  if (!leafId) return [];
  const names = [];
  let cur = leafId;
  const guard = new Set();
  while (cur && !guard.has(String(cur))) {
    guard.add(String(cur));
    const c = await ProductCategory.findById(cur).select("name parentId").lean();
    if (!c) break;
    names.unshift(c.name);
    cur = c.parentId;
  }
  return names;
}

function buildPublicCategoryTree(all) {
  const byParent = new Map();
  for (const c of all) {
    const k = c.parentId ? String(c.parentId) : "__root__";
    if (!byParent.has(k)) byParent.set(k, []);
    byParent.get(k).push(c);
  }
  function build(pid) {
    const k = pid ? String(pid) : "__root__";
    return (byParent.get(k) || []).map((c) => ({ ...c, children: build(c._id) }));
  }
  return build(null);
}

router.get("/product-categories", async (_req, res) => {
  const all = await ProductCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  res.json({ tree: buildPublicCategoryTree(all) });
});

router.get("/products", async (req, res) => {
  const { partnerId, category, categoryId, category2Id, search, isRecommended, isNew } = req.query;
  const { page, limit, skip } = parsePagination(req, 12);
  const filter = { isActive: true };
  if (partnerId && mongoose.isValidObjectId(partnerId)) filter.partnerId = partnerId;
  if (category === PartnerType.MANUFACTURER || category === PartnerType.SYNTHESIS) filter.category = category;
  if (categoryId && mongoose.isValidObjectId(categoryId)) filter.categoryId = categoryId;
  if (category2Id && mongoose.isValidObjectId(category2Id)) filter.category2Id = category2Id;
  if (isRecommended === "true") filter.isRecommended = true;
  if (isNew === "true") filter.isNew = true;
  if (search && String(search).trim()) filter.name = new RegExp(String(search).trim(), "i");

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("partnerId", "name type logoUrl")
      .populate("categoryId", "name level")
      .populate("category2Id", "name level")
      .lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit, hasMore: skip + items.length < total });
});

router.get("/products/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const doc = await Product.findOne({ _id: req.params.id, isActive: true })
    .populate("partnerId", "name type logoUrl description websiteUrl")
    .populate("categoryId", "name level parentId")
    .populate("category2Id", "name level parentId")
    .lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  const categoryPath = await productCategoryPathNames(doc.categoryId?._id || doc.categoryId);
  const category2Path = await productCategoryPathNames(doc.category2Id?._id || doc.category2Id);
  res.json({ ...doc, categoryPath, category2Path });
});

async function listBoardPostsBySlug(req, res, slug) {
  const slugNorm = String(slug || "").toLowerCase();
  const board = await Board.findOne({ slug: slugNorm, isActive: true }).lean();
  if (!board) return res.status(404).json({ error: "Not found" });
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req, 10);
  const filter = { boardId: board._id, isActive: true };
  if (search && String(search).trim()) {
    const rx = new RegExp(String(search).trim(), "i");
    filter.$or = [{ title: rx }, { summary: rx }];
  }
  const [items, total] = await Promise.all([
    BoardPost.find(filter)
      .sort({ isImportant: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-content")
      .lean(),
    BoardPost.countDocuments(filter),
  ]);
  res.json({
    items,
    total,
    page,
    limit,
    hasMore: skip + items.length < total,
    board: {
      slug: board.slug,
      title: board.title,
      subtitle: board.subtitle,
      displayType: board.displayType,
      showSearch: board.showSearch,
    },
  });
}

async function getBoardPostBySlug(req, res, slug, idParam) {
  const slugNorm = String(slug || "").toLowerCase();
  const board = await Board.findOne({ slug: slugNorm, isActive: true });
  if (!board) return res.status(404).json({ error: "Not found" });
  if (!mongoose.isValidObjectId(idParam)) return res.status(404).json({ error: "Not found" });
  const doc = await BoardPost.findOneAndUpdate(
    { _id: idParam, boardId: board._id, isActive: true },
    { $inc: { viewCount: 1 } },
    { new: true }
  ).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
}

router.get("/boards/:slug", async (req, res) => {
  const board = await Board.findOne({ slug: String(req.params.slug || "").toLowerCase(), isActive: true }).lean();
  if (!board) return res.status(404).json({ error: "Not found" });
  res.json(board);
});

router.get("/boards/:slug/posts", async (req, res) => listBoardPostsBySlug(req, res, req.params.slug));

router.get("/boards/:slug/posts/:id", async (req, res) => getBoardPostBySlug(req, res, req.params.slug, req.params.id));

router.get("/notices", (req, res) => listBoardPostsBySlug(req, res, "notices"));
router.get("/notices/:id", (req, res) => getBoardPostBySlug(req, res, "notices", req.params.id));
router.get("/events", (req, res) => listBoardPostsBySlug(req, res, "events"));
router.get("/events/:id", (req, res) => getBoardPostBySlug(req, res, "events", req.params.id));
router.get("/references", (req, res) => listBoardPostsBySlug(req, res, "references"));
router.get("/references/:id", (req, res) => getBoardPostBySlug(req, res, "references", req.params.id));

router.post("/inquiries", async (req, res) => {
  const b = req.body || {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const inquirerType = String(b.inquirerType || "").toUpperCase();
  const affiliation = String(b.affiliation ?? b.company ?? "").trim();
  const name = String(b.name || "").trim();
  const phone = String(b.phone || "").trim();
  const email = String(b.email || "").trim();
  const brand = String(b.brand || "").trim();
  const catalogNumber = String(b.catalogNumber || "").trim();
  const productName = String(b.productName || "").trim();
  const quantity = String(b.quantity || "").trim();
  const message = String(b.message || "").trim();
  const howHeard = String(b.howHeard || "").trim();
  const howHeardOther = String(b.howHeardOther || "").trim();
  const attachmentUrl = String(b.attachmentUrl || "").trim();
  const privacyAgreed = b.privacyAgreed === true || b.privacyAgreed === "true";

  if (inquirerType !== "USER" && inquirerType !== "DEALER") {
    return res.status(400).json({ error: "구분(유저/업자)을 선택해 주세요." });
  }
  if (!affiliation) return res.status(400).json({ error: "소속을 입력해 주세요." });
  if (!name) return res.status(400).json({ error: "이름을 입력해 주세요." });
  if (!phone) return res.status(400).json({ error: "전화번호를 입력해 주세요." });
  if (!email) return res.status(400).json({ error: "이메일을 입력해 주세요." });
  if (!emailRegex.test(email)) return res.status(400).json({ error: "유효한 이메일 형식이 아닙니다." });
  if (!brand) return res.status(400).json({ error: "브랜드를 입력해 주세요." });
  if (!catalogNumber) return res.status(400).json({ error: "카탈로그 넘버를 입력해 주세요." });
  if (!productName) return res.status(400).json({ error: "제품명을 입력해 주세요." });
  if (!privacyAgreed) return res.status(400).json({ error: "개인정보 수집 및 이용에 동의해 주세요." });

  if (howHeard && !Object.values(HowHeard).includes(howHeard)) {
    return res.status(400).json({ error: "알게 된 경로 값이 올바르지 않습니다." });
  }

  const productId = b.productId && mongoose.isValidObjectId(b.productId) ? b.productId : undefined;

  const inquiry = await Inquiry.create({
    inquirerType,
    affiliation,
    company: affiliation,
    name,
    email,
    phone,
    productId,
    brand,
    catalogNumber,
    productName,
    quantity,
    message,
    howHeard: howHeard || "",
    howHeardOther: howHeard === HowHeard.OTHER ? howHeardOther : "",
    attachmentUrl,
    privacyAgreed: true,
  });
  try {
    await sendInquiryNotification(inquiry.toObject());
  } catch (e) {
    console.error("[email] send failed", e);
  }
  res.status(201).json({ ok: true, id: inquiry._id });
});

export default router;
