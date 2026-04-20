import mongoose from "mongoose";

export const PartnerType = {
  MANUFACTURER: "MANUFACTURER",
  SYNTHESIS: "SYNTHESIS",
};

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(PartnerType),
      default: PartnerType.MANUFACTURER,
    },
    logoUrl: { type: String, default: "" },
    description: { type: String, default: "" },
    /** 주문가이드 등에 노출: 주의사항·요구사항·납기 등 (HTML, 관리자 에디터) */
    orderGuideHtml: { type: String, default: "" },
    websiteUrl: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

partnerSchema.index({ type: 1, isActive: 1, sortOrder: 1 });

export const Partner = mongoose.model("Partner", partnerSchema);
