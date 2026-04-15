import mongoose from "mongoose";

const referenceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: "" },
    content: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    youtubeUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

referenceSchema.index({ isActive: 1, createdAt: -1 });

export const Reference = mongoose.model("Reference", referenceSchema);
