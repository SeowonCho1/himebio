import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDb } from "./config/db.js";
import { Admin } from "./models/Admin.js";
import { Banner } from "./models/Banner.js";
import { Popup } from "./models/Popup.js";
import { Partner, PartnerType } from "./models/Partner.js";
import { Product } from "./models/Product.js";
import { Notice } from "./models/Notice.js";
import { Event } from "./models/Event.js";
import { Reference } from "./models/Reference.js";

dotenv.config();

async function run() {
  await connectDb();

  await Promise.all([
    Banner.deleteMany({}),
    Popup.deleteMany({}),
    Partner.deleteMany({}),
    Product.deleteMany({}),
    Notice.deleteMany({}),
    Event.deleteMany({}),
    Reference.deleteMany({}),
  ]);

  const adminEmail = "admin@example.com";
  const existingAdmin = await Admin.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const hash = await bcrypt.hash("admin1234", 10);
    await Admin.create({ email: adminEmail, passwordHash: hash, name: "관리자" });
  }

  const [manufacturer, manufacturer2, manufacturer3, synthesis, synthesis2] = await Partner.insertMany([
    {
      name: "Acme Bio",
      type: PartnerType.MANUFACTURER,
      logoUrl: "https://placehold.co/240x80?text=Acme+Bio",
      description: "항체/단백질/시약 제조사",
      websiteUrl: "https://example.com",
      sortOrder: 1,
      isActive: true,
    },
    {
      name: "Helix Genomics",
      type: PartnerType.MANUFACTURER,
      logoUrl: "https://placehold.co/240x80?text=Helix+Genomics",
      description: "유전자 분석 및 분자생물학 시약 제조사",
      websiteUrl: "https://example.com",
      sortOrder: 2,
      isActive: true,
    },
    {
      name: "Nova Cell Science",
      type: PartnerType.MANUFACTURER,
      logoUrl: "https://placehold.co/240x80?text=Nova+Cell",
      description: "세포배양/면역염색 제품군 제조사",
      websiteUrl: "https://example.com",
      sortOrder: 3,
      isActive: true,
    },
    {
      name: "Synth Lab Service",
      type: PartnerType.SYNTHESIS,
      logoUrl: "https://placehold.co/240x80?text=Synth+Lab",
      description: "맞춤 합성 서비스",
      websiteUrl: "https://example.com",
      sortOrder: 4,
      isActive: true,
    },
    {
      name: "Prime Oligo Factory",
      type: PartnerType.SYNTHESIS,
      logoUrl: "https://placehold.co/240x80?text=Prime+Oligo",
      description: "DNA/RNA 올리고 합성 서비스",
      websiteUrl: "https://example.com",
      sortOrder: 5,
      isActive: true,
    },
  ]);

  await Product.insertMany([
    {
      name: "Recombinant Protein A",
      category: PartnerType.MANUFACTURER,
      partnerId: manufacturer._id,
      thumbnailUrl: "https://placehold.co/400x300?text=Protein+A",
      images: ["https://placehold.co/800x500?text=Protein+A+Detail"],
      shortDescription: "고순도 recombinant protein",
      description: "세포 실험용 고순도 단백질 시약입니다.",
      specification: "1mg / 5mg / 10mg",
      isRecommended: true,
      isNew: true,
      isActive: true,
    },
    {
      name: "Custom Peptide Synthesis",
      category: PartnerType.SYNTHESIS,
      partnerId: synthesis._id,
      thumbnailUrl: "https://placehold.co/400x300?text=Peptide+Service",
      images: ["https://placehold.co/800x500?text=Peptide+Service+Detail"],
      shortDescription: "맞춤 펩타이드 합성",
      description: "서열 기반 맞춤 합성 서비스를 제공합니다.",
      specification: "Purity 95%+ / 빠른 납기 옵션",
      isRecommended: true,
      isNew: false,
      isActive: true,
    },
    {
      name: "Monoclonal Antibody Kit M-200",
      category: PartnerType.MANUFACTURER,
      partnerId: manufacturer._id,
      thumbnailUrl: "https://placehold.co/400x300?text=Antibody+Kit",
      images: ["https://placehold.co/800x500?text=Antibody+Kit+Detail"],
      shortDescription: "고감도 monoclonal 항체 키트",
      description: "ELISA 및 WB 실험에 최적화된 항체 키트입니다.",
      specification: "100 tests / 500 tests",
      isRecommended: true,
      isNew: false,
      isActive: true,
    },
    {
      name: "qPCR Master Mix H-1",
      category: PartnerType.MANUFACTURER,
      partnerId: manufacturer2._id,
      thumbnailUrl: "https://placehold.co/400x300?text=qPCR+Master+Mix",
      images: ["https://placehold.co/800x500?text=qPCR+Master+Mix+Detail"],
      shortDescription: "고효율 qPCR 마스터믹스",
      description: "민감도 높은 유전자 정량 분석용 마스터믹스입니다.",
      specification: "1mL / 5mL",
      isRecommended: false,
      isNew: true,
      isActive: true,
    },
    {
      name: "RNA Extraction Set N-5",
      category: PartnerType.MANUFACTURER,
      partnerId: manufacturer2._id,
      thumbnailUrl: "https://placehold.co/400x300?text=RNA+Extraction",
      images: ["https://placehold.co/800x500?text=RNA+Extraction+Detail"],
      shortDescription: "고순도 RNA 추출 키트",
      description: "조직/세포 샘플에서 RNA를 빠르게 추출합니다.",
      specification: "50 prep / 250 prep",
      isRecommended: true,
      isNew: false,
      isActive: true,
    },
    {
      name: "Cell Culture Medium NC-Plus",
      category: PartnerType.MANUFACTURER,
      partnerId: manufacturer3._id,
      thumbnailUrl: "https://placehold.co/400x300?text=Culture+Medium",
      images: ["https://placehold.co/800x500?text=Culture+Medium+Detail"],
      shortDescription: "세포 성장 촉진 배양액",
      description: "다양한 adherent cell line에 적용 가능한 배양액입니다.",
      specification: "500mL / 1L",
      isRecommended: false,
      isNew: true,
      isActive: true,
    },
    {
      name: "Immunofluorescence Stain Set",
      category: PartnerType.MANUFACTURER,
      partnerId: manufacturer3._id,
      thumbnailUrl: "https://placehold.co/400x300?text=IF+Stain+Set",
      images: ["https://placehold.co/800x500?text=IF+Stain+Set+Detail"],
      shortDescription: "면역형광 염색용 시약 세트",
      description: "고신호 대비를 제공하는 IF 염색 전용 키트입니다.",
      specification: "20 slides / 100 slides",
      isRecommended: true,
      isNew: false,
      isActive: true,
    },
    {
      name: "Custom Oligo DNA 25mer",
      category: PartnerType.SYNTHESIS,
      partnerId: synthesis2._id,
      thumbnailUrl: "https://placehold.co/400x300?text=Oligo+DNA",
      images: ["https://placehold.co/800x500?text=Oligo+DNA+Detail"],
      shortDescription: "맞춤 DNA 올리고 합성",
      description: "연구용 25mer 기준 맞춤 합성 서비스를 제공합니다.",
      specification: "Desalted / HPLC purification",
      isRecommended: true,
      isNew: true,
      isActive: true,
    },
    {
      name: "siRNA Design & Synthesis",
      category: PartnerType.SYNTHESIS,
      partnerId: synthesis2._id,
      thumbnailUrl: "https://placehold.co/400x300?text=siRNA+Service",
      images: ["https://placehold.co/800x500?text=siRNA+Service+Detail"],
      shortDescription: "siRNA 설계 및 합성 서비스",
      description: "타깃 유전자 기반 siRNA 설계부터 합성까지 제공합니다.",
      specification: "2 pairs / 4 pairs",
      isRecommended: false,
      isNew: false,
      isActive: true,
    },
  ]);

  await Banner.insertMany([
    {
      title: "공식 제조사 시약 라인업",
      imageUrl: "https://placehold.co/1200x400?text=Official+Manufacturers",
      linkUrl: "/partners",
      sortOrder: 1,
      isActive: true,
    },
    {
      title: "맞춤 합성 서비스 안내",
      imageUrl: "https://placehold.co/1200x400?text=Custom+Synthesis",
      linkUrl: "/synthesis",
      sortOrder: 2,
      isActive: true,
    },
  ]);

  await Popup.create({
    title: "4월 신규 프로모션",
    content: "신규 고객 대상 견적문의 이벤트 진행 중입니다.",
    imageUrl: "https://placehold.co/600x400?text=April+Promotion",
    startAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
  });

  await Notice.insertMany([
    {
      title: "배송 지연 안내",
      summary: "일부 제품 입고 지연 공지",
      content: "해외 운송 사정으로 일부 제품 출고가 지연될 수 있습니다.",
      isImportant: true,
      isActive: true,
    },
    {
      title: "GW 연구지원 프로그램 안내",
      summary: "연구기관 대상 문의 우선 대응",
      content: "연구기관 고객 대상 우선 대응 프로그램을 운영합니다.",
      isImportant: false,
      isActive: true,
    },
    {
      title: "5월 연휴 배송 일정 공지",
      summary: "연휴 기간 택배 마감/재개 일정 안내",
      content: "연휴 전 출고 마감일과 연휴 후 순차 출고 일정을 안내드립니다.",
      isImportant: true,
      isActive: true,
    },
    {
      title: "합성 서비스 접수 프로세스 변경",
      summary: "견적 접수 폼 업데이트 안내",
      content: "합성 서비스 접수 시 필요한 필수 항목이 일부 변경되었습니다.",
      isImportant: false,
      isActive: true,
    },
    {
      title: "고객센터 운영시간 변경 안내",
      summary: "평일 운영시간 변경 공지",
      content: "고객센터 운영시간이 09:00~18:00으로 변경됩니다.",
      isImportant: false,
      isActive: true,
    },
  ]);

  await Event.insertMany([
    {
      title: "2026 상반기 프로모션",
      summary: "추천 제품 할인 이벤트",
      content: "견적문의 접수 시 맞춤 할인 혜택을 제공합니다.",
      thumbnailUrl: "https://placehold.co/500x300?text=Event+1",
      isActive: true,
    },
    {
      title: "신규 고객 웰컴 쿠폰 이벤트",
      summary: "첫 견적문의 고객 대상 혜택",
      content: "신규 고객 첫 문의 시 적용 가능한 웰컴 혜택을 제공합니다.",
      thumbnailUrl: "https://placehold.co/500x300?text=Event+2",
      isActive: true,
    },
    {
      title: "합성 서비스 빠른 납기 캠페인",
      summary: "긴급 프로젝트 지원",
      content: "빠른 납기 옵션으로 연구 일정에 맞춘 합성 서비스를 제공합니다.",
      thumbnailUrl: "https://placehold.co/500x300?text=Event+3",
      isActive: true,
    },
    {
      title: "대학 연구실 패키지 프로모션",
      summary: "세트 구매 할인 제공",
      content: "연구실 단위 구매 시 전용 패키지 가격을 제공합니다.",
      thumbnailUrl: "https://placehold.co/500x300?text=Event+4",
      isActive: true,
    },
  ]);

  await Reference.insertMany([
    {
      title: "단백질 발현 실험 참고자료",
      summary: "실험 세팅 가이드와 영상 자료",
      content: "실험 디자인 시 고려해야 할 파라미터를 정리했습니다.",
      thumbnailUrl: "https://placehold.co/500x300?text=Reference+1",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      isActive: true,
    },
    {
      title: "qPCR 실험 최적화 가이드",
      summary: "프라이머 설계 및 조건 최적화",
      content: "qPCR 실험 재현성을 높이는 핵심 체크리스트를 제공합니다.",
      thumbnailUrl: "https://placehold.co/500x300?text=Reference+2",
      youtubeUrl: "https://www.youtube.com/watch?v=ysz5S6PUM-U",
      isActive: true,
    },
    {
      title: "세포배양 오염 방지 체크포인트",
      summary: "실무 중심 배양 관리 팁",
      content: "오염 빈도를 줄이기 위한 장비/공정 관리 방법을 안내합니다.",
      thumbnailUrl: "https://placehold.co/500x300?text=Reference+3",
      youtubeUrl: "",
      isActive: true,
    },
    {
      title: "siRNA 실험 설계 참고노트",
      summary: "타깃 선정과 컨트롤 구성",
      content: "siRNA 실험 설계 시 필요한 컨트롤 및 분석 포인트를 설명합니다.",
      thumbnailUrl: "https://placehold.co/500x300?text=Reference+4",
      youtubeUrl: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      isActive: true,
    },
  ]);

  console.log("[seed] sample data inserted successfully");
  process.exit(0);
}

run().catch((e) => {
  console.error("[seed] failed", e);
  process.exit(1);
});
