import dotenv from "dotenv";
import { connectDb } from "../src/config/db.js";
import { Partner, PartnerType } from "../src/models/Partner.js";

dotenv.config();

async function main() {
  await connectDb();

  // Remove previously auto-imported rows to avoid duplicates.
  await Partner.deleteMany({ name: /^공식제조사 로고\s\d{2}$/ });

  const docs = Array.from({ length: 36 }, (_, i) => ({
    name: `공식제조사 로고 ${String(i + 1).padStart(2, "0")}`,
    type: PartnerType.MANUFACTURER,
    logoUrl: `/manufacturer-logos/official-mfr-${String(i + 1).padStart(2, "0")}.png`,
    description: "공식제조사 소개 요약입니다.",
    websiteUrl: "",
    sortOrder: i + 1,
    isActive: true,
  }));

  await Partner.insertMany(docs);
  console.log(`inserted ${docs.length} manufacturers`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
