import mongoose from "mongoose";

/** 공개 목록 표시 방식 */
export const BoardDisplayType = {
  GALLERY: "GALLERY",
  TABLE: "TABLE",
  THUMBNAIL_LIST: "THUMBNAIL_LIST",
};

const boardSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "" },
    displayType: {
      type: String,
      enum: Object.values(BoardDisplayType),
      default: BoardDisplayType.TABLE,
    },
    showSearch: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

boardSchema.index({ isActive: 1, sortOrder: 1 });

export const Board = mongoose.model("Board", boardSchema);
