const LANG_STORAGE_KEY = "site-lang";

export const SITE_LANG = {
  KO: "ko",
  EN: "en",
};

const DICT = {
  ko: {
    searchPlaceholder: "찾으시는 제품을 입력해 주세요.",
    searchAria: "검색",
    quoteInquiry: "견적문의",
    menu: "메뉴",
    closeMenu: "메뉴 닫기",
    noSubmenu: "표시할 하위 메뉴가 없습니다.",
    allProducts: "전체 제품 보기",
    shortcut: "바로가기",
    footerProduct: "제품소개",
    footerNews: "소식/자료",
    footerSupport: "고객지원",
    langKo: "한국어",
    langEn: "English",
    downloadSection: "자료 다운로드",
    fileDownload: "파일 다운로드",
  },
  en: {
    searchPlaceholder: "Search products",
    searchAria: "Search",
    quoteInquiry: "Inquiry",
    menu: "Menu",
    closeMenu: "Close menu",
    noSubmenu: "No submenu items.",
    allProducts: "View all products",
    shortcut: "shortcut",
    footerProduct: "Products",
    footerNews: "News / Resources",
    footerSupport: "Customer Support",
    langKo: "한국어",
    langEn: "English",
    downloadSection: "Download",
    fileDownload: "Download file",
  },
};

export function normalizeSiteLang(raw) {
  return raw === SITE_LANG.EN ? SITE_LANG.EN : SITE_LANG.KO;
}

export function getStoredSiteLang() {
  try {
    return normalizeSiteLang(localStorage.getItem(LANG_STORAGE_KEY));
  } catch {
    return SITE_LANG.KO;
  }
}

export function setStoredSiteLang(lang) {
  const safe = normalizeSiteLang(lang);
  try {
    localStorage.setItem(LANG_STORAGE_KEY, safe);
  } catch {
    /* noop */
  }
}

export function tSite(lang, key, fallback = "") {
  const safe = normalizeSiteLang(lang);
  return DICT[safe]?.[key] || fallback || key;
}

export function pickKoEn(lang, ko, en = "") {
  return normalizeSiteLang(lang) === SITE_LANG.EN ? en || ko : ko;
}

