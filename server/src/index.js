import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { connectDb } from "./config/db.js";
import publicRoutes from "./routes/public.js";
import { authAdmin } from "./middleware/authAdmin.js";
import { configureCloudinary, uploadBufferToCloudinary } from "./utils/upload.js";
import { Admin } from "./models/Admin.js";
import { Banner } from "./models/Banner.js";
import { Popup } from "./models/Popup.js";
import { Partner } from "./models/Partner.js";
import { Product } from "./models/Product.js";
import { Notice } from "./models/Notice.js";
import { Event } from "./models/Event.js";
import { Reference } from "./models/Reference.js";
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
configureCloudinary();

app.use(cors({ origin: process.env.CLIENT_URL?.split(",") || "*" }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
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
createCrudRoutes("products", Product, ["name", "shortDescription", "description"]);
createCrudRoutes("notices", Notice, ["title", "summary"]);
createCrudRoutes("events", Event, ["title", "summary"]);
createCrudRoutes("references", Reference, ["title", "summary"]);

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
    const url = await uploadBufferToCloudinary(req.file.buffer);
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
    app.listen(PORT, () => console.log(`API server on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("DB connection failed", e);
    process.exit(1);
  });

