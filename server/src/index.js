import express from "express";
import mongoose from "mongoose";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { connectDb } from "./config/db.js";
import publicRoutes from "./routes/public.js";
import { authAdmin } from "./middleware/authAdmin.js";
import {
  configureCloudinary,
  uploadBufferToCloudinary,
  isCloudinaryConfigured,
  saveUploadedImageLocally,
  saveInquiryAttachmentLocally,
} from "./utils/upload.js";
import { Admin } from "./models/Admin.js";
import { Banner } from "./models/Banner.js";
import { Popup } from "./models/Popup.js";
import { Partner } from "./models/Partner.js";
import { Product } from "./models/Product.js";
import { ProductCategory, MAX_CATEGORY_LEVEL } from "./models/ProductCategory.js";
import { Board, BoardDisplayType } from "./models/Board.js";
import { BoardPost } from "./models/BoardPost.js";
import { ensureBoardsAndMigrateFromLegacy } from "./migrateBoards.js";
import { Inquiry, InquiryStatus } from "./models/Inquiry.js";
import { SiteSetting, SITE_SETTING_KEY } from "./models/SiteSetting.js";

dotenv.config();

const app = express();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("이미지 파일만 업로드할 수 있습니다."));
      return;
    }
    cb(null, true);
  },
});

const inquiryPublicUpload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
      return;
    }
    cb(new Error("이미지 또는 PDF만 업로드할 수 있습니다."));
  },
});
configureCloudinary();

app.use(cors({ origin: process.env.CLIENT_URL?.split(",") || "*" }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/inquiry-upload", inquiryPublicUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });
  try {
    let url;
    if (isCloudinaryConfigured() && req.file.mimetype.startsWith("image/")) {
      url = await uploadBufferToCloudinary(req.file.buffer, "bio-trade/inquiries");
    } else {
      const rel = await saveInquiryAttachmentLocally(req.file.buffer, req.file.mimetype);
      const proto = req.protocol || "http";
      const host = req.get("host") || "localhost";
      url = `${proto}://${host}${rel}`;
    }
    res.json({ url });
  } catch (e) {
    res.status(400).json({ error: e.message || "upload failed" });
  }
});

app.use("/api", publicRoutes);

app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body || {};
  const admin = await Admin.findOne({ email: String(email || "").toLowerCase() });
  if (!admin) return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  const match = await bcrypt.compare(String(password || ""), admin.passwordHash);
  if (!match) return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  const token = jwt.sign({ sub: String(admin._id), role: "admin", email: admin.email }, process.env.JWT_SECRET, { expiresIn: "1d" });
  res.json({ token, admin: { id: admin._id, email: admin.email, name: admin.name } });
});

function normalizeBody(input) {
  const out = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (typeof value !== "string") {
      out[key] = value;
      continue;
    }
    const trimmed = value.trim();
    if (trimmed === "" && /Id$/i.test(key)) {
      out[key] = null;
      continue;
    }
    if (trimmed === "" && (key === "startAt" || key === "endAt")) {
      out[key] = null;
      continue;
    }
    if (trimmed === "true") out[key] = true;
    else if (trimmed === "false") out[key] = false;
    else if (trimmed === "") out[key] = "";
    else if (/^-?\d+(\.\d+)?$/.test(trimmed)) out[key] = Number(trimmed);
    else out[key] = trimmed;
  }
  return out;
}

function createCrudRoutes(path, Model, searchFields = ["title"]) {
  app.get(`/api/admin/${path}`, authAdmin, async (req, res) => {
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const filter = q
      ? {
          $or: searchFields.map((field) => ({
            [field]: new RegExp(q, "i"),
          })),
        }
      : {};
    const [items, total] = await Promise.all([
      Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Model.countDocuments(filter),
    ]);
    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasMore: skip + items.length < total,
    });
  });
  app.get(`/api/admin/${path}/:id`, authAdmin, async (req, res) => {
    if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const doc = await Model.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  });
  app.post(`/api/admin/${path}`, authAdmin, async (req, res) => {
    const doc = await Model.create(normalizeBody(req.body || {}));
    res.status(201).json(doc);
  });
  app.put(`/api/admin/${path}/:id`, authAdmin, async (req, res) => {
    if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const doc = await Model.findByIdAndUpdate(req.params.id, normalizeBody(req.body || {}), {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  });
  app.delete(`/api/admin/${path}/:id`, authAdmin, async (req, res) => {
    if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  });
}

createCrudRoutes("banners", Banner, ["title"]);
createCrudRoutes("popups", Popup, ["title", "content"]);
createCrudRoutes("partners", Partner, ["name", "description"]);

const productPopulate = [
  { path: "partnerId", select: "name type" },
  { path: "categoryId", select: "name level parentId" },
  { path: "category2Id", select: "name level parentId" },
];

async function validateProductCategoryId(categoryId, label = "분류") {
  if (!categoryId) return null;
  if (!mongoose.isValidObjectId(categoryId)) throw new Error(`${label} ID가 올바르지 않습니다.`);
  const cat = await ProductCategory.findById(categoryId);
  if (!cat) throw new Error(`${label}를 찾을 수 없습니다.`);
  return categoryId;
}

async function attachProductCategoryPath(doc) {
  if (!doc) return doc;
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const buildPath = async (leafId) => {
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
  };
  o.categoryPath = await buildPath(o.categoryId?._id || o.categoryId);
  o.category2Path = await buildPath(o.category2Id?._id || o.category2Id);
  return o;
}

app.get("/api/admin/products", authAdmin, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const filter = q
    ? {
        $or: ["name", "productNumber", "shortDescription", "contentHtml", "description"].map((field) => ({
          [field]: new RegExp(q, "i"),
        })),
      }
    : {};
  let query = Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  for (const p of productPopulate) query = query.populate(p);
  const [items, total] = await Promise.all([query, Product.countDocuments(filter)]);
  res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: skip + items.length < total,
  });
});

app.get("/api/admin/products/:id", authAdmin, async (req, res) => {
  if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) return res.status(400).json({ error: "Invalid id" });
  let query = Product.findById(req.params.id);
  for (const p of productPopulate) query = query.populate(p);
  const doc = await query;
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(await attachProductCategoryPath(doc));
});

app.post("/api/admin/products", authAdmin, async (req, res) => {
  try {
    const body = normalizeBody(req.body || {});
    body.categoryId = await validateProductCategoryId(body.categoryId, "분류");
    body.category2Id = await validateProductCategoryId(body.category2Id, "분류2");
    const doc = await Product.create(body);
    let q = Product.findById(doc._id);
    for (const p of productPopulate) q = q.populate(p);
    res.status(201).json(await attachProductCategoryPath(await q));
  } catch (e) {
    res.status(400).json({ error: e.message || "저장 실패" });
  }
});

app.put("/api/admin/products/:id", authAdmin, async (req, res) => {
  if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) return res.status(400).json({ error: "Invalid id" });
  try {
    const body = normalizeBody(req.body || {});
    if (Object.prototype.hasOwnProperty.call(body, "categoryId")) {
      body.categoryId = await validateProductCategoryId(body.categoryId, "분류");
    }
    if (Object.prototype.hasOwnProperty.call(body, "category2Id")) {
      body.category2Id = await validateProductCategoryId(body.category2Id, "분류2");
    }
    const doc = await Product.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    let q = Product.findById(doc._id);
    for (const p of productPopulate) q = q.populate(p);
    res.json(await attachProductCategoryPath(await q));
  } catch (e) {
    res.status(400).json({ error: e.message || "저장 실패" });
  }
});

app.delete("/api/admin/products/:id", authAdmin, async (req, res) => {
  if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) return res.status(400).json({ error: "Invalid id" });
  const doc = await Product.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

function buildCategoryTree(all) {
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

async function computeCategoryLevel(parentId) {
  if (!parentId) return 1;
  const p = await ProductCategory.findById(parentId).select("level");
  if (!p) throw new Error("상위 분류를 찾을 수 없습니다.");
  if (p.level >= MAX_CATEGORY_LEVEL) throw new Error("분류는 최대 4단계까지입니다.");
  return p.level + 1;
}

function isUnderCategory(allById, rootId, nodeId) {
  let cur = nodeId;
  const seen = new Set();
  while (cur && !seen.has(String(cur))) {
    seen.add(String(cur));
    if (String(cur) === String(rootId)) return true;
    cur = allById.get(String(cur))?.parentId;
  }
  return false;
}

async function refreshCategorySubtreeLevels(rootId) {
  const root = await ProductCategory.findById(rootId);
  if (!root) return;
  const children = await ProductCategory.find({ parentId: root._id });
  for (const ch of children) {
    ch.level = root.level + 1;
    if (ch.level > MAX_CATEGORY_LEVEL) throw new Error("분류는 최대 4단계까지입니다.");
    await ch.save();
    await refreshCategorySubtreeLevels(ch._id);
  }
}

app.get("/api/admin/product-categories", authAdmin, async (_req, res) => {
  const all = await ProductCategory.find().sort({ sortOrder: 1, name: 1 }).lean();
  res.json({ tree: buildCategoryTree(all), items: all });
});

app.post("/api/admin/product-categories", authAdmin, async (req, res) => {
  try {
    const body = normalizeBody(req.body || {});
    const name = String(body.name || "").trim();
    if (!name) return res.status(400).json({ error: "이름은 필수입니다." });
    const parentId = body.parentId && mongoose.isValidObjectId(body.parentId) ? body.parentId : null;
    const level = await computeCategoryLevel(parentId);
    const doc = await ProductCategory.create({
      name,
      parentId,
      level,
      sortOrder: Number(body.sortOrder) || 0,
      isActive: body.isActive !== false && body.isActive !== "false",
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message || "생성 실패" });
  }
});

app.put("/api/admin/product-categories/:id", authAdmin, async (req, res) => {
  if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) return res.status(400).json({ error: "Invalid id" });
  try {
    const node = await ProductCategory.findById(req.params.id);
    if (!node) return res.status(404).json({ error: "Not found" });
    const body = normalizeBody(req.body || {});
    if (body.name != null) node.name = String(body.name).trim() || node.name;
    if (body.sortOrder != null) node.sortOrder = Number(body.sortOrder) || 0;
    if (body.isActive != null) node.isActive = Boolean(body.isActive === true || body.isActive === "true");

    if (Object.prototype.hasOwnProperty.call(body, "parentId")) {
      const newParentRaw = body.parentId;
      const newParentId = newParentRaw && mongoose.isValidObjectId(newParentRaw) ? newParentRaw : null;
      if (String(newParentId || "") !== String(node.parentId || "")) {
        if (newParentId && String(newParentId) === String(node._id)) {
          return res.status(400).json({ error: "자기 자신을 상위로 지정할 수 없습니다." });
        }
        const all = await ProductCategory.find().lean();
        const byId = new Map(all.map((c) => [String(c._id), c]));
        if (newParentId && isUnderCategory(byId, node._id, newParentId)) {
          return res.status(400).json({ error: "하위 분류를 상위로 지정할 수 없습니다." });
        }
        const newLevel = await computeCategoryLevel(newParentId);
        const subtree = [];
        const stack = [node._id];
        const seen = new Set();
        while (stack.length) {
          const id = stack.pop();
          if (seen.has(String(id))) continue;
          seen.add(String(id));
          const doc = byId.get(String(id));
          if (!doc) continue;
          subtree.push(doc);
          for (const ch of all.filter((x) => String(x.parentId) === String(id))) stack.push(ch._id);
        }
        const delta = newLevel - node.level;
        const newMax = Math.max(...subtree.map((s) => s.level + delta));
        if (newMax > MAX_CATEGORY_LEVEL) return res.status(400).json({ error: "이동 시 분류가 4단계를 넘습니다." });
        node.parentId = newParentId;
        node.level = newLevel;
      }
    }
    await node.save();
    await refreshCategorySubtreeLevels(node._id);
    const fresh = await ProductCategory.findById(node._id);
    res.json(fresh);
  } catch (e) {
    res.status(400).json({ error: e.message || "수정 실패" });
  }
});

app.delete("/api/admin/product-categories/:id", authAdmin, async (req, res) => {
  if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) return res.status(400).json({ error: "Invalid id" });
  const children = await ProductCategory.countDocuments({ parentId: req.params.id });
  if (children > 0) return res.status(400).json({ error: "하위 분류가 있어 삭제할 수 없습니다." });
  const used = await Product.countDocuments({ $or: [{ categoryId: req.params.id }, { category2Id: req.params.id }] });
  if (used > 0) return res.status(400).json({ error: "이 분류를 사용 중인 제품이 있어 삭제할 수 없습니다." });
  const doc = await ProductCategory.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

const SLUG_RE = /^[a-z][a-z0-9-]{1,48}$/;

app.get("/api/admin/boards", authAdmin, async (_req, res) => {
  const items = await Board.find().sort({ sortOrder: 1, title: 1 }).lean();
  res.json({ items });
});

app.post("/api/admin/boards", authAdmin, async (req, res) => {
  const body = normalizeBody(req.body || {});
  const slug = String(body.slug || "").toLowerCase().trim();
  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({ error: "slug은 영문 소문자로 시작하고, 소문자·숫자·하이픈만 2~50자까지 사용할 수 있습니다." });
  }
  const title = String(body.title || "").trim();
  if (!title) return res.status(400).json({ error: "게시판 제목은 필수입니다." });
  const displayType = body.displayType;
  if (displayType && !Object.values(BoardDisplayType).includes(displayType)) {
    return res.status(400).json({ error: "표시 형식(displayType)이 올바르지 않습니다." });
  }
  try {
    const doc = await Board.create({
      slug,
      title,
      subtitle: String(body.subtitle || "").trim(),
      displayType: displayType || BoardDisplayType.TABLE,
      showSearch: body.showSearch !== false && body.showSearch !== "false",
      sortOrder: Number(body.sortOrder) || 0,
      isActive: body.isActive !== false && body.isActive !== "false",
    });
    res.status(201).json(doc);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ error: "이미 사용 중인 slug입니다." });
    res.status(400).json({ error: e.message || "생성 실패" });
  }
});

app.put("/api/admin/boards/:id", authAdmin, async (req, res) => {
  if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) return res.status(400).json({ error: "Invalid id" });
  const body = normalizeBody(req.body || {});
  const updates = {};
  if (body.title != null) updates.title = String(body.title).trim();
  if (body.subtitle != null) updates.subtitle = String(body.subtitle).trim();
  if (body.displayType != null && Object.values(BoardDisplayType).includes(body.displayType)) {
    updates.displayType = body.displayType;
  }
  if (body.showSearch != null) updates.showSearch = Boolean(body.showSearch === true || body.showSearch === "true");
  if (body.sortOrder != null) updates.sortOrder = Number(body.sortOrder) || 0;
  if (body.isActive != null) updates.isActive = Boolean(body.isActive === true || body.isActive === "true");
  const doc = await Board.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

app.delete("/api/admin/boards/:id", authAdmin, async (req, res) => {
  if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) return res.status(400).json({ error: "Invalid id" });
  const cnt = await BoardPost.countDocuments({ boardId: req.params.id });
  if (cnt > 0) return res.status(400).json({ error: "등록된 글이 있어 게시판을 삭제할 수 없습니다." });
  const doc = await Board.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

app.get("/api/admin/board-posts", authAdmin, async (req, res) => {
  const boardId = req.query.boardId;
  if (!boardId || !mongoose.isValidObjectId(boardId)) {
    return res.status(400).json({ error: "boardId 쿼리가 필요합니다." });
  }
  const q = String(req.query.q || "").trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const filter = { boardId };
  if (q) {
    filter.$or = [{ title: new RegExp(q, "i") }, { summary: new RegExp(q, "i") }];
  }
  const [items, total] = await Promise.all([
    BoardPost.find(filter).sort({ isImportant: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    BoardPost.countDocuments(filter),
  ]);
  res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasMore: skip + items.length < total,
  });
});

app.get("/api/admin/board-posts/:id", authAdmin, async (req, res) => {
  if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) return res.status(400).json({ error: "Invalid id" });
  const doc = await BoardPost.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

function parseBoardPostUpdate(body) {
  const raw = normalizeBody(body || {});
  const out = {};
  const keys = [
    "boardId",
    "title",
    "summary",
    "content",
    "thumbnailUrl",
    "isImportant",
    "isActive",
    "startAt",
    "endAt",
    "youtubeUrl",
  ];
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
    let v = raw[k];
    if (k === "startAt" || k === "endAt") {
      if (v === "" || v == null) v = null;
      else if (typeof v === "string") v = new Date(v);
    }
    out[k] = v;
  }
  return out;
}

app.post("/api/admin/board-posts", authAdmin, async (req, res) => {
  try {
    const raw = normalizeBody(req.body || {});
    const boardId = raw.boardId;
    if (!boardId || !mongoose.isValidObjectId(boardId)) return res.status(400).json({ error: "boardId가 필요합니다." });
    const b = await Board.findById(boardId);
    if (!b) return res.status(400).json({ error: "게시판을 찾을 수 없습니다." });
    const title = String(raw.title || "").trim();
    if (!title) return res.status(400).json({ error: "제목은 필수입니다." });
    const doc = await BoardPost.create({
      boardId,
      title,
      summary: String(raw.summary || "").trim(),
      content: String(raw.content || "").trim(),
      thumbnailUrl: String(raw.thumbnailUrl || "").trim(),
      isImportant: Boolean(raw.isImportant === true || raw.isImportant === "true"),
      isActive: raw.isActive !== false && raw.isActive !== "false",
      startAt: raw.startAt && String(raw.startAt).trim() ? new Date(raw.startAt) : null,
      endAt: raw.endAt && String(raw.endAt).trim() ? new Date(raw.endAt) : null,
      youtubeUrl: String(raw.youtubeUrl || "").trim(),
    });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message || "생성 실패" });
  }
});

app.put("/api/admin/board-posts/:id", authAdmin, async (req, res) => {
  if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) return res.status(400).json({ error: "Invalid id" });
  try {
    const updates = parseBoardPostUpdate(req.body);
    if (updates.boardId && !mongoose.isValidObjectId(updates.boardId)) {
      return res.status(400).json({ error: "boardId가 올바르지 않습니다." });
    }
    if (updates.boardId) {
      const b = await Board.findById(updates.boardId);
      if (!b) return res.status(400).json({ error: "게시판을 찾을 수 없습니다." });
    }
    const doc = await BoardPost.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message || "수정 실패" });
  }
});

app.delete("/api/admin/board-posts/:id", authAdmin, async (req, res) => {
  if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) return res.status(400).json({ error: "Invalid id" });
  const doc = await BoardPost.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

app.get("/api/admin/inquiries", authAdmin, async (_req, res) => {
  const items = await Inquiry.find().sort({ createdAt: -1 }).populate("productId", "name");
  res.json(items);
});
app.get("/api/admin/inquiries/:id", authAdmin, async (req, res) => {
  const item = await Inquiry.findById(req.params.id).populate("productId", "name");
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});
app.patch("/api/admin/inquiries/:id/status", authAdmin, async (req, res) => {
  const status = String(req.body?.status || "");
  if (!Object.values(InquiryStatus).includes(status)) return res.status(400).json({ error: "Invalid status" });
  const item = await Inquiry.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

app.post("/api/admin/upload", authAdmin, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });
  try {
    let url;
    if (isCloudinaryConfigured()) {
      url = await uploadBufferToCloudinary(req.file.buffer);
    } else {
      const rel = await saveUploadedImageLocally(req.file.buffer, req.file.mimetype);
      const proto = req.protocol || "http";
      const host = req.get("host") || "localhost";
      url = `${proto}://${host}${rel}`;
    }
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: "upload failed", detail: e.message });
  }
});

const SITE_SETTING_FIELDS = [
  "headerLogoUrl",
  "footerLogoUrl",
  "companyName",
  "footerTopBar",
  "copyrightText",
  "address",
  "tel",
  "fax",
  "email",
  "termsTitle",
  "termsUrl",
  "privacyTitle",
  "privacyUrl",
];

app.get("/api/admin/site-settings", authAdmin, async (_req, res) => {
  let doc = await SiteSetting.findOne({ key: SITE_SETTING_KEY });
  if (!doc) doc = await SiteSetting.create({ key: SITE_SETTING_KEY });
  res.json(doc);
});

app.put("/api/admin/site-settings", authAdmin, async (req, res) => {
  const update = {};
  for (const k of SITE_SETTING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) {
      update[k] = (req.body || {})[k];
    }
  }
  const doc = await SiteSetting.findOneAndUpdate(
    { key: SITE_SETTING_KEY },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json(doc);
});

app.get("/api/admin/system-admins", authAdmin, async (_req, res) => {
  const items = await Admin.find().select("-passwordHash").sort({ createdAt: -1 }).lean();
  res.json({ items });
});

app.post("/api/admin/system-admins", authAdmin, async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "이메일과 비밀번호는 필수입니다." });
  const em = String(email).toLowerCase().trim();
  const exists = await Admin.findOne({ email: em });
  if (exists) return res.status(400).json({ error: "이미 등록된 이메일입니다." });
  const hash = await bcrypt.hash(String(password), 10);
  const admin = await Admin.create({
    email: em,
    passwordHash: hash,
    name: String(name || "").trim(),
  });
  res.status(201).json({ id: admin._id, email: admin.email, name: admin.name, createdAt: admin.createdAt });
});

app.delete("/api/admin/system-admins/:id", authAdmin, async (req, res) => {
  if (!req.params.id?.match(/^[a-f0-9]{24}$/i)) return res.status(400).json({ error: "Invalid id" });
  if (req.params.id === req.adminId) return res.status(400).json({ error: "본인 계정은 삭제할 수 없습니다." });
  if ((await Admin.countDocuments()) <= 1) return res.status(400).json({ error: "마지막 관리자는 삭제할 수 없습니다." });
  const doc = await Admin.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
});

const PORT = Number(process.env.PORT || 4000);
connectDb()
  .then(async () => {
    if ((await Admin.countDocuments()) === 0) {
      const hash = await bcrypt.hash("admin1234", 10);
      await Admin.create({ email: "admin@example.com", passwordHash: hash, name: "관리자" });
      console.log("[seed] default admin created: admin@example.com / admin1234");
    }
    if ((await SiteSetting.countDocuments({ key: SITE_SETTING_KEY })) === 0) {
      await SiteSetting.create({
        key: SITE_SETTING_KEY,
        companyName: "바이오시약(주)",
        footerTopBar: "제품문의 02-0000-0000 (본사) 042-000-0000 (지사)",
        copyrightText: "COPYRIGHT (c) 2026 바이오시약(주). ALL RIGHTS RESERVED.",
        address: "(07207) 서울시 영등포구 양평로 21길 26 (주소 예시)",
        tel: "02-000-0000",
        fax: "02-000-0001",
        email: "info@example.com",
      });
      console.log("[init] default site settings created");
    }
    await ensureBoardsAndMigrateFromLegacy();
    app.listen(PORT, () => console.log(`API server on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("DB connection failed", e);
    process.exit(1);
  });

