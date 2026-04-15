import dotenv from "dotenv";
import { connectDb } from "./config/db.js";
import { Banner } from "./models/Banner.js";
import { Popup } from "./models/Popup.js";
import { Partner } from "./models/Partner.js";
import { Product } from "./models/Product.js";
import { Notice } from "./models/Notice.js";
import { Event } from "./models/Event.js";
import { Reference } from "./models/Reference.js";
import { Inquiry } from "./models/Inquiry.js";

dotenv.config();

async function run() {
  await connectDb();

  const results = await Promise.all([
    Banner.deleteMany({}),
    Popup.deleteMany({}),
    Partner.deleteMany({}),
    Product.deleteMany({}),
    Notice.deleteMany({}),
    Event.deleteMany({}),
    Reference.deleteMany({}),
    Inquiry.deleteMany({}),
  ]);

  const names = ["banners", "popups", "partners", "products", "notices", "events", "references", "inquiries"];
  names.forEach((name, i) => {
    console.log(`[clean] ${name}: deleted ${results[i].deletedCount}`);
  });

  console.log("[clean] done (admin 계정은 유지됨)");
  process.exit(0);
}

run().catch((e) => {
  console.error("[clean] failed", e);
  process.exit(1);
});
