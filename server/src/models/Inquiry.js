import mongoose from "mongoose";

const InquiryStatus = {
  NEW: "NEW",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
};

const inquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, default: "", trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    productName: { type: String, default: "", trim: true },
    message: { type: String, default: "" },
    status: { type: String, enum: Object.values(InquiryStatus), default: InquiryStatus.NEW },
  },
  { timestamps: true }
);

inquirySchema.index({ createdAt: -1 });

export const Inquiry = mongoose.model("Inquiry", inquirySchema);
export { InquiryStatus };
