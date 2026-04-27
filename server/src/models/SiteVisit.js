import mongoose from "mongoose";

/**
 * 방문자(브라우저)별·일별 1문서. 페이지 이동마다 hits 증가.
 * visitorId + dayKey 유니크 (KST 기준 날짜).
 */
const siteVisitSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true, trim: true, maxlength: 80 },
    dayKey: { type: String, required: true, trim: true },
    firstPath: { type: String, default: "/", maxlength: 500 },
    lastPath: { type: String, default: "/", maxlength: 500 },
    hits: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

siteVisitSchema.index({ visitorId: 1, dayKey: 1 }, { unique: true });
siteVisitSchema.index({ dayKey: 1 });

export const SiteVisit = mongoose.model("SiteVisit", siteVisitSchema);
