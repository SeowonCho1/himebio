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
    forceEnded: { type: Boolean, default: false },
    youtubeUrl: { type: String, default: "" },
    /** 관리자 업로드 문서 URL 목록 (공지 등 첨부 다운로드용) */
    attachments: {
      type: [
        {
          fileName: { type: String, default: "" },
          url: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

boardPostSchema.index({ boardId: 1, isActive: 1, isImportant: -1, createdAt: -1 });
boardPostSchema.index({ boardId: 1, isActive: 1, createdAt: -1 });

export const BoardPost = mongoose.model("BoardPost", boardPostSchema);
