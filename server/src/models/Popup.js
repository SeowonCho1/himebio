import mongoose from "mongoose";

const PopupDisplayMode = {
  IMAGE_ONLY: "image_only",
  IMAGE_OVERLAY: "image_overlay",
};

const PopupPosition = {
  CENTER: "center",
  TOP_LEFT: "top_left",
  TOP_RIGHT: "top_right",
  BOTTOM_LEFT: "bottom_left",
  BOTTOM_RIGHT: "bottom_right",
};

const popupSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    /** 가로·세로(px). 사이트에서 max-width/max-height로 뷰포트 안으로 제한 */
    widthPx: { type: Number, default: 400 },
    heightPx: { type: Number, default: 520 },
    /** image_only: 이미지(또는 내용)만 / image_overlay: imageUrl을 배경으로 content HTML을 앞에 */
    displayMode: {
      type: String,
      enum: Object.values(PopupDisplayMode),
      default: PopupDisplayMode.IMAGE_ONLY,
    },
    position: {
      type: String,
      enum: Object.values(PopupPosition),
      default: PopupPosition.CENTER,
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Popup = mongoose.model("Popup", popupSchema);
