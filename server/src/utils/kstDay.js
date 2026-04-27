/** 한국 표준시(KST) 기준 달력 날짜 `YYYY-MM-DD` */
export function kstYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** KST 기준 `ymd`가 속한 달의 1일 `YYYY-MM-01` */
export function kstMonthStartYmd(ymd) {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-/);
  if (!m) return kstYmd().slice(0, 8) + "01";
  return `${m[1]}-${m[2]}-01`;
}

/** KST 기준 전날 `YYYY-MM-DD` (대략 24시간 전 시각을 KST로 변환) */
export function kstYesterdayYmd(from = new Date()) {
  return kstYmd(new Date(from.getTime() - 24 * 60 * 60 * 1000));
}
