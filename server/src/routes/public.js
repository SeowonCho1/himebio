import { Router } from "express";
import mongoose from "mongoose";
import { Banner } from "../models/Banner.js";
import { Popup } from "../models/Popup.js";
import { Partner, PartnerType } from "../models/Partner.js";
import { Product } from "../models/Product.js";
import { Notice } from "../models/Notice.js";
import { Event } from "../models/Event.js";
import { Reference } from "../models/Reference.js";
import { Inquiry } from "../models/Inquiry.js";
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
  if (search && String(search).trim()) filter.name = new RegExp(String(search).trim(), "i");
  const items = await Partner.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
  res.json(items);
});

router.get("/products", async (req, res) => {
  const { partnerId, category, search, isRecommended, isNew } = req.query;
  const { page, limit, skip } = parsePagination(req, 12);
  const filter = { isActive: true };
  if (partnerId && mongoose.isValidObjectId(partnerId)) filter.partnerId = partnerId;
  if (category === PartnerType.MANUFACTURER || category === PartnerType.SYNTHESIS) filter.category = category;
  if (isRecommended === "true") filter.isRecommended = true;
  if (isNew === "true") filter.isNew = true;
  if (search && String(search).trim()) filter.name = new RegExp(String(search).trim(), "i");

  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("partnerId", "name type logoUrl").lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit, hasMore: skip + items.length < total });
});

router.get("/products/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const doc = await Product.findOne({ _id: req.params.id, isActive: true }).populate("partnerId", "name type logoUrl description websiteUrl").lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

router.get("/notices", async (req, res) => {
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req, 10);
  const filter = { isActive: true };
  if (search && String(search).trim()) filter.title = new RegExp(String(search).trim(), "i");
  const [items, total] = await Promise.all([
    Notice.find(filter)
      .sort({ isImportant: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-content")
      .lean(),
    Notice.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit, hasMore: skip + items.length < total });
});

router.get("/notices/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const doc = await Notice.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

router.get("/events", async (req, res) => {
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req, 10);
  const filter = { isActive: true };
  if (search && String(search).trim()) {
    filter.$or = [
      { title: new RegExp(String(search).trim(), "i") },
      { summary: new RegExp(String(search).trim(), "i") },
    ];
  }
  const [items, total] = await Promise.all([
    Event.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-content").lean(),
    Event.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit, hasMore: skip + items.length < total });
});

router.get("/events/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const doc = await Event.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

router.get("/references", async (req, res) => {
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req, 10);
  const filter = { isActive: true };
  if (search && String(search).trim()) {
    filter.$or = [
      { title: new RegExp(String(search).trim(), "i") },
      { summary: new RegExp(String(search).trim(), "i") },
    ];
  }
  const [items, total] = await Promise.all([
    Reference.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select("-content").lean(),
    Reference.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit, hasMore: skip + items.length < total });
});

router.get("/references/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Not found" });
  const doc = await Reference.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

router.post("/inquiries", async (req, res) => {
  const { name, company, email, phone, productId, productName, message } = req.body || {};
  const trimmedName = String(name || "").trim();
  const trimmedEmail = String(email || "").trim();
  const trimmedMessage = String(message || "").trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedName || !trimmedEmail) {
    return res.status(400).json({ error: "이름과 이메일은 필수입니다." });
  }
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ error: "유효한 이메일 형식이 아닙니다." });
  }
  if (!trimmedMessage) {
    return res.status(400).json({ error: "문의 내용을 입력해 주세요." });
  }
  const inquiry = await Inquiry.create({
    name: trimmedName,
    company: company != null ? String(company).trim() : "",
    email: trimmedEmail,
    phone: phone != null ? String(phone).trim() : "",
    productId: productId && mongoose.isValidObjectId(productId) ? productId : undefined,
    productName: productName != null ? String(productName).trim() : "",
    message: trimmedMessage,
  });
  try {
    await sendInquiryNotification(inquiry.toObject());
  } catch (e) {
    console.error("[email] send failed", e);
  }
  res.status(201).json({ ok: true, id: inquiry._id });
});

export default router;
