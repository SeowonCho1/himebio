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
    thumbnailUrl: { type: String, default: "" },
    images: [{ type: String }],
    shortDescription: { type: String, default: "" },
    description: { type: String, default: "" },
    specification: { type: String, default: "" },
    isRecommended: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ partnerId: 1, isActive: 1 });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ name: "text", shortDescription: "text" });

export const Product = mongoose.model("Product", productSchema);
