import dotenv from "dotenv";
import { connectDb } from "../src/config/db.js";
import { Partner, PartnerType } from "../src/models/Partner.js";
import { ProductCategory } from "../src/models/ProductCategory.js";
import { Product } from "../src/models/Product.js";

dotenv.config();

const TEST_CAT_PREFIX = "테스트분류";
const TEST_MANUFACTURER_NAME_PREFIX = "테스트 제조사 상품";
const TEST_SYNTHESIS_NAME_PREFIX = "테스트 합성서비스 상품";

async function ensurePartner(type, fallbackName) {
  let partner = await Partner.findOne({ type, isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
  if (!partner) {
    partner = await Partner.create({
      name: fallbackName,
      type,
      description: "테스트 자동 생성 파트너",
      sortOrder: 9999,
      isActive: true,
    });
  }
  return partner;
}

async function buildTestCategories() {
  await ProductCategory.deleteMany({ name: new RegExp(`^${TEST_CAT_PREFIX}`) });

  const roots = await ProductCategory.insertMany([
    { name: `${TEST_CAT_PREFIX}-제조사A`, parentId: null, level: 1, sortOrder: 9001, isActive: true },
    { name: `${TEST_CAT_PREFIX}-제조사B`, parentId: null, level: 1, sortOrder: 9002, isActive: true },
    { name: `${TEST_CAT_PREFIX}-합성A`, parentId: null, level: 1, sortOrder: 9003, isActive: true },
    { name: `${TEST_CAT_PREFIX}-합성B`, parentId: null, level: 1, sortOrder: 9004, isActive: true },
  ]);

  const [mA, mB, sA, sB] = roots;

  const leaves = await ProductCategory.insertMany([
    { name: `${TEST_CAT_PREFIX}-제조사A-세부1`, parentId: mA._id, level: 2, sortOrder: 1, isActive: true },
    { name: `${TEST_CAT_PREFIX}-제조사A-세부2`, parentId: mA._id, level: 2, sortOrder: 2, isActive: true },
    { name: `${TEST_CAT_PREFIX}-제조사B-세부1`, parentId: mB._id, level: 2, sortOrder: 1, isActive: true },
    { name: `${TEST_CAT_PREFIX}-제조사B-세부2`, parentId: mB._id, level: 2, sortOrder: 2, isActive: true },
    { name: `${TEST_CAT_PREFIX}-합성A-세부1`, parentId: sA._id, level: 2, sortOrder: 1, isActive: true },
    { name: `${TEST_CAT_PREFIX}-합성A-세부2`, parentId: sA._id, level: 2, sortOrder: 2, isActive: true },
    { name: `${TEST_CAT_PREFIX}-합성B-세부1`, parentId: sB._id, level: 2, sortOrder: 1, isActive: true },
    { name: `${TEST_CAT_PREFIX}-합성B-세부2`, parentId: sB._id, level: 2, sortOrder: 2, isActive: true },
  ]);

  return {
    manufacturerLeaves: leaves.slice(0, 4),
    synthesisLeaves: leaves.slice(4),
  };
}

function createProducts({
  count,
  namePrefix,
  categoryType,
  partnerId,
  leaves,
}) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const cat1 = leaves[i % leaves.length];
    const cat2 = leaves[(i + 1) % leaves.length];
    return {
      name: `${namePrefix} ${String(n).padStart(2, "0")}`,
      category: categoryType,
      partnerId,
      categoryId: cat1._id,
      category2Id: cat2._id,
      productNumber: `${categoryType === PartnerType.MANUFACTURER ? "M" : "S"}-TEST-${String(n).padStart(3, "0")}`,
      shortDescription: `테스트용 ${categoryType === PartnerType.MANUFACTURER ? "제조사 제품" : "합성서비스"} 요약 ${n}`,
      description: `테스트 데이터입니다. 분류 기반 표시 확인용 항목 ${n}`,
      specification: `- TEST SPEC ${n}\n- CATEGORY ${cat1.name}\n- CATEGORY2 ${cat2.name}`,
      isRecommended: n % 5 === 0,
      isNew: n % 7 === 0,
      isActive: true,
    };
  });
}

async function main() {
  await connectDb();

  // Remove previous test products only.
  await Product.deleteMany({
    $or: [
      { name: new RegExp(`^${TEST_MANUFACTURER_NAME_PREFIX}`) },
      { name: new RegExp(`^${TEST_SYNTHESIS_NAME_PREFIX}`) },
    ],
  });

  const manufacturerPartner = await ensurePartner(PartnerType.MANUFACTURER, "테스트 제조사 파트너");
  const synthesisPartner = await ensurePartner(PartnerType.SYNTHESIS, "테스트 합성서비스 파트너");

  const { manufacturerLeaves, synthesisLeaves } = await buildTestCategories();

  const manufacturerProducts = createProducts({
    count: 40,
    namePrefix: TEST_MANUFACTURER_NAME_PREFIX,
    categoryType: PartnerType.MANUFACTURER,
    partnerId: manufacturerPartner._id,
    leaves: manufacturerLeaves,
  });

  const synthesisProducts = createProducts({
    count: 40,
    namePrefix: TEST_SYNTHESIS_NAME_PREFIX,
    categoryType: PartnerType.SYNTHESIS,
    partnerId: synthesisPartner._id,
    leaves: synthesisLeaves,
  });

  await Product.insertMany([...manufacturerProducts, ...synthesisProducts]);

  console.log("seed complete");
  console.log(`- categories: ${manufacturerLeaves.length + synthesisLeaves.length + 4} created`);
  console.log("- manufacturer products: 40");
  console.log("- synthesis products: 40");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
