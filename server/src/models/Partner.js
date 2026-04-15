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
    websiteUrl: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

partnerSchema.index({ type: 1, isActive: 1, sortOrder: 1 });

export const Partner = mongoose.model("Partner", partnerSchema);
