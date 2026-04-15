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

export async function sendInquiryNotification(inquiry) {
  const to = process.env.MAIL_TO;
  if (!to) {
    console.warn("[email] MAIL_TO not set; skipping inquiry notification");
    return;
  }
  const transport = createTransport();
  const subject = `[견적문의] ${inquiry.name} — ${inquiry.productName || "(제품명 없음)"}`;
  const text = [
    `이름: ${inquiry.name}`,
    `회사: ${inquiry.company || "-"}`,
    `이메일: ${inquiry.email}`,
    `연락처: ${inquiry.phone || "-"}`,
    `제품명: ${inquiry.productName || "-"}`,
    `제품 ID: ${inquiry.productId || "-"}`,
    "",
    "문의 내용:",
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
