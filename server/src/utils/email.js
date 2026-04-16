import nodemailer from "nodemailer";

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS || "" },
  });
}

const INQUIRER_LABEL = { USER: "유저", DEALER: "업자" };

export async function sendInquiryNotification(inquiry) {
  const to = process.env.MAIL_TO;
  if (!to) {
    console.warn("[email] MAIL_TO not set; skipping inquiry notification");
    return;
  }
  const transport = createTransport();
  const typeLabel = INQUIRER_LABEL[inquiry.inquirerType] || inquiry.inquirerType || "-";
  const subject = `[견적문의] ${inquiry.name} — ${inquiry.productName || "(제품명 없음)"}`;
  const text = [
    `구분: ${typeLabel}`,
    `소속: ${inquiry.affiliation || inquiry.company || "-"}`,
    `이름: ${inquiry.name}`,
    `이메일: ${inquiry.email}`,
    `연락처: ${inquiry.phone || "-"}`,
    "",
    "문의 제품",
    `브랜드: ${inquiry.brand || "-"}`,
    `카탈로그 넘버: ${inquiry.catalogNumber || "-"}`,
    `제품명: ${inquiry.productName || "-"}`,
    `수량: ${inquiry.quantity || "-"}`,
    `제품 ID(선택): ${inquiry.productId || "-"}`,
    "",
    "기타",
    `유입 경로: ${inquiry.howHeard || "-"}${inquiry.howHeardOther ? ` (${inquiry.howHeardOther})` : ""}`,
    `첨부: ${inquiry.attachmentUrl || "-"}`,
    "",
    "문의내용:",
    inquiry.message || "(없음)",
  ].join("\n");

  if (!transport) {
    console.warn("[email] SMTP not configured; inquiry saved but mail not sent");
    console.log(subject, "\n", text);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}
