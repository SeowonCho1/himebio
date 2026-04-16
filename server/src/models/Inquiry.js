import mongoose from "mongoose";

const InquiryStatus = {
  NEW: "NEW",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
};

/** 유입 경로 (기타 정보 수집) */
export const HowHeard = {
  SEARCH: "SEARCH",
  REFERRAL: "REFERRAL",
  AD: "AD",
  SNS: "SNS",
  BROCHURE: "BROCHURE",
  MAIL: "MAIL",
  CONFERENCE: "CONFERENCE",
  OTHER: "OTHER",
};

const inquirySchema = new mongoose.Schema(
  {
    /** 문의자 구분: 유저 / 업자 */
    inquirerType: { type: String, enum: ["USER", "DEALER", ""], default: "" },
    /** 소속 (필수 신규 폼) */
    affiliation: { type: String, default: "", trim: true },
    /** 레거시: 회사명 — 기존 데이터 호환 */
    company: { type: String, default: "", trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },

    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    brand: { type: String, default: "", trim: true },
    catalogNumber: { type: String, default: "", trim: true },
    productName: { type: String, default: "", trim: true },
    quantity: { type: String, default: "", trim: true },
    /** 문의내용 (선택) */
    message: { type: String, default: "" },

    howHeard: { type: String, default: "" },
    howHeardOther: { type: String, default: "", trim: true },
    attachmentUrl: { type: String, default: "" },
    privacyAgreed: { type: Boolean, default: false },

    status: { type: String, enum: Object.values(InquiryStatus), default: InquiryStatus.NEW },
  },
  { timestamps: true }
);

inquirySchema.index({ createdAt: -1 });

export const Inquiry = mongoose.model("Inquiry", inquirySchema);
export { InquiryStatus };
