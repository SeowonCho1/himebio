import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: "" },
    content: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    isImportant: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

noticeSchema.index({ isActive: 1, isImportant: -1, createdAt: -1 });

export const Notice = mongoose.model("Notice", noticeSchema);
