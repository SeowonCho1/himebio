import mongoose from "mongoose";
import { PartnerType } from "./Partner.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(PartnerType),
      default: PartnerType.MANUFACTURER,
    },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true },
    /** 조직도형 분류 (최대 4단계). PartnerType enum `category`와 별개 */
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductCategory", default: null },
    /** 조직도형 분류2 (최대 4단계). categoryId와 별도 선택 가능 */
    category2Id: { type: mongoose.Schema.Types.ObjectId, ref: "ProductCategory", default: null },
    productNumber: { type: String, default: "", trim: true },
    thumbnailUrl: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    images: [{ type: String }],
    shortDescription: { type: String, default: "" },
    description: { type: String, default: "" },
    /** 상세정보 본문(HTML) */
    contentHtml: { type: String, default: "" },
    /** 제품 상세 확장 블록(HTML, 비어 있으면 공개 페이지에서 숨김) */
    featuresHtml: { type: String, default: "" },
    applicationHtml: { type: String, default: "" },
    componentsHtml: { type: String, default: "" },
    shippingStorageHtml: { type: String, default: "" },
    dataHtml: { type: String, default: "" },
    downloadHtml: { type: String, default: "" },
    downloadFileUrl: { type: String, default: "" },
    downloadFiles: {
      type: [
        {
          fileName: { type: String, default: "" },
          url: { type: String, default: "", trim: true },
        },
      ],
      default: [],
    },
    /** 외부 크롤링 연동용 식별자 (sourceSite + sourceProductId) */
    sourceSite: { type: String, default: "", trim: true },
    sourceProductId: { type: String, default: "", trim: true },
    specification: { type: String, default: "" },
    isRecommended: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

productSchema.index({ partnerId: 1, isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ category2Id: 1, isActive: 1 });
productSchema.index({ sourceSite: 1, sourceProductId: 1 }, { unique: true, sparse: true });
productSchema.index({ name: "text", shortDescription: "text" });

export const Product = mongoose.model("Product", productSchema);
