import dotenv from "dotenv";
import { connectDb } from "../src/config/db.js";
import { Partner, PartnerType } from "../src/models/Partner.js";

dotenv.config();

async function main() {
  await connectDb();

  // 기존 제조사(type=MANUFACTURER)만 교체하고, 합성 파트너는 유지합니다.
  await Partner.deleteMany({ type: PartnerType.MANUFACTURER });

  const manufacturers = [
    { name: "Cohesion Biosciences", description: "Cohesion · BIOSCIENCES" },
    { name: "ProteoGenix", description: "항체·단백질 연구 솔루션" },
    { name: "Signosis", description: "신호·분석 진단" },
    { name: "BioSpacific", description: "a Bio-Techne brand" },
    { name: "CUSABIO", description: "연구용 시약·키트" },
    { name: "AFG Scientific", description: "실험·분석 기기·소모품" },
    { name: "Acro Biosystems", description: "Acro · BIOSYSTEMS" },
    { name: "Minerva Biolabs", description: "미생물·오염 방지" },
    { name: "bioWORLD", description: "molecular tools and laboratory essentials" },
    { name: "Affinity", description: "research together" },
    { name: "BACHEM", description: "펩타이드·유기합성" },
    { name: "NIBSC", description: "Confidence in Biological Medicines" },
    { name: "BENCHCHEM", description: "실험대 시약" },
    { name: "BMA BIOMEDICALS", description: "바이오 의료" },
    { name: "Attogene", description: "분자진단" },
    { name: "Virongy Biosciences", description: "Accelerate Discovery" },
    { name: "ROTECH", description: "Research-Development" },
    { name: "AntibodySystem", description: "Recombinant Antibodies & Proteins" },
    { name: "rekom biotech", description: "바이오 연구" },
    { name: "eEnzyme", description: "효소·분자생물" },
    { name: "BioAssay Systems", description: "Solutions for Research and Analysis" },
    { name: "Elabscience", description: "ELISA·면역분석" },
    { name: "BioinGentech", description: "Biotechnology" },
    { name: "Affinity Biologicals", description: "A Precision BioLogic Company" },
    { name: "ECACC", description: "European Collection of Authenticated Cell Cultures" },
    { name: "ABS", description: "세포·미생물 자원" },
    { name: "Absolute Antibody", description: "재조합 항체" },
    { name: "101 Bio", description: "분자생물 시약" },
    { name: "ACCEGEN", description: "BIOTECHNOLOGY" },
    { name: "DSMZ", description: "Leibniz Institute · German Collection of Microorganisms and Cell Cultures" },
    { name: "AtaGenix", description: "From Gene to Antibody" },
    { name: "ichorbio", description: "THE BEST ANTIBODIES FOR IN VIVO RESEARCH" },
    { name: "BIOSYNTH", description: "바이오 시약" },
    { name: "Bovogen Biologicals", description: "BOVOGEN · BIOLOGICALS" },
    { name: "AnyGenes", description: "biomarker signaling pathway profiler" },
    { name: "Welcron", description: "웰크론 · 기능성 소재" },
  ];

  const docs = manufacturers.map((row, i) => ({
    name: row.name,
    type: PartnerType.MANUFACTURER,
    logoUrl: `/manufacturer-logos/official-mfr-${String(i + 1).padStart(2, "0")}.png`,
    description: row.description,
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
