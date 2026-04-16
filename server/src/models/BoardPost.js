import mongoose from "mongoose";

const boardPostSchema = new mongoose.Schema(
  {
    boardId: { type: mongoose.Schema.Types.ObjectId, ref: "Board", required: true, index: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: "" },
    content: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    isImportant: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    youtubeUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

boardPostSchema.index({ boardId: 1, isActive: 1, isImportant: -1, createdAt: -1 });
boardPostSchema.index({ boardId: 1, isActive: 1, createdAt: -1 });

export const BoardPost = mongoose.model("BoardPost", boardPostSchema);
