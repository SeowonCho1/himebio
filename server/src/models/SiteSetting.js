import mongoose from "mongoose";

export const SITE_SETTING_KEY = "default";

const siteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: SITE_SETTING_KEY, unique: true },
    headerLogoUrl: { type: String, default: "" },
    footerLogoUrl: { type: String, default: "" },
    companyName: { type: String, default: "" },
    footerTopBar: { type: String, default: "" },
    copyrightText: { type: String, default: "" },
    showFooterAddress: { type: Boolean, default: false },
    address: { type: String, default: "" },
    tel: { type: String, default: "" },
    fax: { type: String, default: "" },
    email: { type: String, default: "" },
    businessRegistrationNumber: { type: String, default: "" },
    termsTitle: { type: String, default: "이용약관" },
    termsUrl: { type: String, default: "#" },
    privacyTitle: { type: String, default: "개인정보취급방침" },
    privacyUrl: { type: String, default: "#" },
  },
  { timestamps: true }
);

export const SiteSetting = mongoose.model("SiteSetting", siteSettingSchema);
