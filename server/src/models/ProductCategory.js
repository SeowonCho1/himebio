import mongoose from "mongoose";

export const ProductCategoryScope = {
  PRODUCTS: "PRODUCTS",
  SYNTHESIS: "SYNTHESIS",
  BOTH: "BOTH",
};

/** 조직도형 분류. level 1 = 최상위, 최대 4단계 */
const productCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductCategory", default: null },
    level: { type: Number, required: true, min: 1, max: 4 },
    sortOrder: { type: Number, default: 0 },
    scope: {
      type: String,
      enum: Object.values(ProductCategoryScope),
      default: ProductCategoryScope.BOTH,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productCategorySchema.index({ parentId: 1, sortOrder: 1, name: 1 });

export const ProductCategory = mongoose.model("ProductCategory", productCategorySchema);
export const MAX_CATEGORY_LEVEL = 4;
