"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useParams, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { api, setToken } from "@/lib/api";
import { getStoredSiteLang, pickKoEn, setStoredSiteLang, SITE_LANG, tSite } from "@/site/i18n";
import { SitePopups } from "@/site/SitePopups";
import { VisitBeacon } from "@/site/VisitBeacon";

const ClientCkEditor = dynamic(() => import("@/components/ClientCkEditor"), { ssr: false });
const SITE_SHELL_DEFAULT = {
  siteLang: SITE_LANG.KO,
  site: null,
  footerMenuGroups: [],
  shouldShowFooterAddress: false,
};
const SiteShellContext = createContext(SITE_SHELL_DEFAULT);

/** 서브페이지 본문 가로 밴드 — `Layout`의 `<main>`에만 적용. 풀블리드 유지: 홈, 회사소개 */
const SITE_SUBPAGE_MAIN_BAND =
  "mx-auto box-border w-full max-w-full px-4 md:max-w-[70%]";

function useSiteLang() {
  return useContext(SiteShellContext).siteLang;
}

function createUploadAdapter(loader) {
  return {
    async upload() {
      const file = await loader.file;
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/admin/upload", formData);
      const url = response?.data?.url;
      if (!url) throw new Error("이미지 업로드 URL을 받지 못했습니다.");
      return { default: url };
    },
    abort() {},
  };
}

function ckEditorUploadPlugin(editor) {
  editor.plugins.get("FileRepository").createUploadAdapter = (loader) => createUploadAdapter(loader);
}

const CKEDITOR_UPLOAD_CONFIG = {
  extraPlugins: [ckEditorUploadPlugin],
};

/** 제품 상세 — 상세정보(본문) 위에 노출되는 확장 HTML 블록(비어 있으면 숨김) */
const PRODUCT_EXTRA_HTML_FIELDS = [
  { field: "featuresHtml", heading: "특징" },
  { field: "applicationHtml", heading: "적용 분야" },
  { field: "componentsHtml", heading: "구성품" },
  { field: "shippingStorageHtml", heading: "배송 및 보관" },
  { field: "dataHtml", heading: "데이터" },
];

function htmlFieldHasContent(html) {
  const t = String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > 0;
}

/** 제품 상세 본문 — 참고 UI: 파란 소제목 + 본문, 여백으로 구역 구분 */
const PRODUCT_DETAIL_TITLE_CLASS = "font-bold text-[#004b8d]";
/** 주문정보·FEATURES 등 소제목 */
const PRODUCT_DETAIL_SECTION_HEAD_CLASS = "text-[19pt] font-bold text-[#0070c0] leading-snug";
/** 메인 제품명: 기존 2xl/4xl 대비 +5pt */
const PRODUCT_DETAIL_NAME_SIZE_CLASS = "text-[calc(1.5rem+5pt)] md:text-[calc(2.25rem+5pt)]";
/** 카드 상단 짧은 소개: text-sm 대비 +5pt */
const PRODUCT_DETAIL_INTRO_SIZE_CLASS = "text-[calc(0.875rem+5pt)]";
const PRODUCT_DETAIL_BODY_CLASS =
  "text-sm text-slate-800 leading-7 [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm [&_thead]:bg-slate-100 [&_th]:border [&_th]:border-slate-300 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:border-slate-300 [&_td]:px-3 [&_td]:py-2";

/** 제품 상세 본문 가로 폭 — 배경은 100%, 이 클래스로 내용만 ~85% 중앙 */
const PRODUCT_DETAIL_CONTENT_INNER = "mx-auto w-full max-w-full";

/** 특징·확장 HTML 등 — 상세본문·주문·추천 제외 구역용 접기/펼치기 */
function ProductDetailToggleSection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-300 last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={`min-w-0 flex-1 ${PRODUCT_DETAIL_SECTION_HEAD_CLASS}`}>{title}</span>
        <IconChevronRight className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${open ? "-rotate-90" : "rotate-90"}`} aria-hidden />
      </button>
      {open ? <div className="pb-5 pr-2">{children}</div> : null}
    </div>
  );
}

function ProductDetailSpecAccordions({ item }) {
  const rows = PRODUCT_EXTRA_HTML_FIELDS.filter(({ field }) => htmlFieldHasContent(item?.[field]));
  const downloadFiles = [
    ...(Array.isArray(item?.downloadFiles) ? item.downloadFiles : []),
    ...(String(item?.downloadFileUrl || "").trim() ? [{ fileName: "", url: String(item.downloadFileUrl).trim() }] : []),
  ]
    .map((f) => ({
      fileName: String(f?.fileName || "").trim(),
      url: String(f?.url || "").trim(),
    }))
    .filter((f) => f.url);
  const hasDownloadFile = downloadFiles.length > 0;
  const hasLegacyDownloadHtml = htmlFieldHasContent(item?.downloadHtml);
  if (!rows.length && !hasDownloadFile && !hasLegacyDownloadHtml) return null;

  return (
    <section className="w-full bg-[#fafafa]" aria-label="제품 확장 정보">
      <div className={`${PRODUCT_DETAIL_CONTENT_INNER} pb-8 pt-6 md:pt-8`}>
        {rows.map(({ field, heading }) => (
          <ProductDetailToggleSection key={field} title={heading}>
            <div className={PRODUCT_DETAIL_BODY_CLASS} dangerouslySetInnerHTML={{ __html: item[field] }} />
          </ProductDetailToggleSection>
        ))}
        {hasDownloadFile || hasLegacyDownloadHtml ? (
          <ProductDetailToggleSection title="자료 다운로드">
            {hasDownloadFile ? (
              <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-[#004B8D]">
                {downloadFiles.map((f, idx) => {
                  const fallbackName = (() => {
                    const raw = f.url.split("/").pop() || "";
                    try {
                      return decodeURIComponent(raw);
                    } catch {
                      return raw;
                    }
                  })();
                  const name = f.fileName || fallbackName || `파일 ${idx + 1}`;
                  return (
                    <li key={`${f.url}-${idx}`}>
                      <a href={f.url} target="_blank" rel="noreferrer" download={name} className="underline hover:opacity-80 break-all">
                        {name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={PRODUCT_DETAIL_BODY_CLASS} dangerouslySetInnerHTML={{ __html: item.downloadHtml }} />
            )}
          </ProductDetailToggleSection>
        ) : null}
      </div>
    </section>
  );
}

function IconInquiry({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" strokeLinejoin="round" />
      <path d="M9 9h6M9 12h6M9 15h4" strokeLinecap="round" />
      <path d="m14.5 18.5 1.25-1.25 1.75 1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBookSimple({ className = "w-8 h-8" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M6 4h5a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H6V4z" strokeLinejoin="round" />
      <path d="M18 4h-5a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h5V4z" strokeLinejoin="round" />
      <path d="M9 9h2M9 12h4M15 9h2M15 12h2" strokeLinecap="round" />
    </svg>
  );
}

/** GNB 전체 메뉴 트리거 — 3×3 도트(가장자리 진색·중앙 브랜드 레드) */
function IconBentoMenu({ className = "h-[26px] w-[26px]", variant = "onLight" }) {
  const outer = variant === "onDark" ? "#ffffff" : "#111111";
  const center = "#C52525";
  const dots = [
    [6, 6],
    [12, 6],
    [18, 6],
    [6, 12],
    [12, 12],
    [18, 12],
    [6, 18],
    [12, 18],
    [18, 18],
  ];
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.35} fill={i === 4 ? center : outer} />
      ))}
    </svg>
  );
}

/** 전체 메뉴 닫기 — 십자(+) 배치의 흰 점 4개 */
function IconCloseFourDots({ className = "h-6 w-6 text-white" }) {
  const pts = [
    [12, 4.5],
    [19.5, 12],
    [12, 19.5],
    [4.5, 12],
  ];
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      {pts.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.6} fill="currentColor" />
      ))}
    </svg>
  );
}

function IconSearch({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" strokeLinecap="round" />
    </svg>
  );
}

const CUSTOMER_SUPPORT_SUB = [
  { to: "/notices", label: "공지사항", en: "Notices" },
  { to: "/customer/about", label: "회사소개", en: "About" },
  // { to: "/customer/directions", label: "오시는길" }, // 현재 미사용(주소 노출 시에만 동적 추가)
  { to: "/customer/directions", label: "오시는길", en: "Directions" },
  { to: "/inquiry", label: "견적문의", en: "Inquiry" },
];

const TOP_MENUS = [
  { key: "partners", to: "/partners", label: "공식제조사", en: "MANUFACTURERS" },
  { key: "products", to: "/products", label: "제품소개", en: "PRODUCTS" },
  { key: "synthesis", to: "/synthesis", label: "합성서비스", en: "SYNTHESIS" },
  { key: "events", to: "/events", label: "이벤트", en: "EVENTS" },
  { key: "references", to: "/references", label: "참고문헌", en: "REFERENCES" },
  { key: "support", to: "/notices", label: "고객지원", en: "CUSTOMER SUPPORT" },
];

/** GNB 드롭다운 패널 최소 높이(px). 메뉴 타입별로 동적 적용 */
const MEGA_MENU_PANEL_MIN_HEIGHT_PX = 88;
const MEGA_MENU_PANEL_PRODUCTS_MIN_HEIGHT_PX = 220;

/** 공식제조사·제품·합성서비스 등에서 제조사(파트너) 이름 표기 */
const PARTNER_NAME_EMPHASIS = "font-bold text-[#0f2744]";
const PRODUCT_CATEGORY_SCOPE = {
  PRODUCTS: "PRODUCTS",
  SYNTHESIS: "SYNTHESIS",
  BOTH: "BOTH",
};
const PRODUCT_CATEGORY_SCOPE_LABELS = {
  [PRODUCT_CATEGORY_SCOPE.PRODUCTS]: "제품소개",
  [PRODUCT_CATEGORY_SCOPE.SYNTHESIS]: "합성서비스",
  [PRODUCT_CATEGORY_SCOPE.BOTH]: "공용(둘 다)",
};

function buildFooterMenuGroups(customerSupportSub, lang = SITE_LANG.KO) {
  return [
    {
      title: tSite(lang, "footerProduct", "제품소개"),
      items: [
        { to: "/partners", label: pickKoEn(lang, "공식제조사", "Manufacturers") },
        { to: "/products", label: pickKoEn(lang, "제품소개", "Products") },
        { to: "/synthesis", label: pickKoEn(lang, "합성서비스", "Synthesis") },
      ],
    },
    {
      title: tSite(lang, "footerNews", "소식/자료"),
      items: [
        { to: "/events", label: pickKoEn(lang, "이벤트", "Events") },
        { to: "/references", label: pickKoEn(lang, "참고논문", "References") },
        { to: "/notices", label: pickKoEn(lang, "공지사항", "Notices") },
      ],
    },
    {
      title: tSite(lang, "footerSupport", "고객지원"),
      items: [
        { to: "/inquiry", label: tSite(lang, "quoteInquiry", "견적문의") },
        ...customerSupportSub.filter((x) => x.to !== "/inquiry" && x.to !== "/notices"),
      ],
    },
  ];
}

function getDropdownItemsByMenu(menuKey, categoryTree, customerSupportSub = CUSTOMER_SUPPORT_SUB, lang = SITE_LANG.KO) {
  if (menuKey === "products") {
    if (!categoryTree?.length) return [{ to: "/products", label: tSite(lang, "allProducts", "전체 제품 보기") }];
    const topLevelLinks = (categoryTree || []).map((node) => ({
      to: `/products?categoryId=${node._id}`,
      label: node.name,
    }));
    const out = [{ to: "/products", label: tSite(lang, "allProducts", "전체 제품 보기") }, ...topLevelLinks];
    return out;
  }
  if (menuKey === "support") return customerSupportSub;
  const menu = TOP_MENUS.find((m) => m.key === menuKey);
  return menu ? [{ to: menu.to, label: `${pickKoEn(lang, menu.label, menu.en)} ${tSite(lang, "shortcut", "바로가기")}` }] : [];
}

/** 제품소개 GNB 드롭다운: 분류 수·라벨 길이에 따라 본문 링크 글자 크기 */
function productMegaMenuLinkTextClass(items) {
  const list = Array.isArray(items) ? items : [];
  const n = list.length;
  const maxLen = list.reduce((m, x) => Math.max(m, String(x?.label || "").length), 0);
  if (n > 26 || maxLen > 52) return "text-[12px] md:text-[13px] leading-normal";
  if (n > 18 || maxLen > 40) return "text-[13px] md:text-[14px] leading-normal";
  if (n > 12 || maxLen > 32) return "text-[14px] md:text-[16px] leading-normal";
  if (n > 8 || maxLen > 26) return "text-[15px] md:text-[17px] leading-normal";
  return "text-[15px] md:text-[18px] leading-normal";
}

function MobileCategoryLinks({ nodes, closeMenus, depth = 0 }) {
  return (nodes || []).map((node) => (
    <div key={node._id}>
      <Link href={`/products?categoryId=${node._id}`} className={`block py-0.5 ${depth === 0 ? "font-medium" : "text-xs opacity-90 pl-2"}`} onClick={closeMenus}>
        {`${depth > 0 ? `${" -".repeat(depth)} ` : ""}${node.name}`}
      </Link>
      {node.children?.length ? <MobileCategoryLinks nodes={node.children} closeMenus={closeMenus} depth={depth + 1} /> : null}
    </div>
  ));
}

function SiteFooter({ site, footerMenuGroups, shouldShowFooterAddress, rootClassName }) {
  return (
    <footer className={rootClassName}>
      <div className="bg-[#1f2227]">
        <div className="container mx-auto max-w-full md:max-w-[85%] px-4 py-8 space-y-6">
          <div className="pb-6 border-b border-slate-700">
            <div className="mt-6">
              {site?.footerLogoUrl ? (
                <img src={site.footerLogoUrl} alt="" className="max-w-[200px] h-auto object-contain" />
              ) : (
                <div className="h-14 w-40 bg-[#1f2227] border border-slate-700" />
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] items-start pb-6 border-b border-slate-700">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {footerMenuGroups.map((group) => (
                <div key={group.title}>
                  <p className="text-sm font-semibold text-slate-100 mb-2">{group.title}</p>
                  <ul className="space-y-1">
                    {group.items.map((item) => (
                      <li key={`${group.title}-${item.to}`}>
                        <Link href={item.to} className="text-sm !text-[#dbe4f2] hover:!text-white">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="text-sm text-slate-400 space-y-2 leading-relaxed">
              {shouldShowFooterAddress ? <p>{site.address}</p> : null}
              <p>
                {site?.tel ? <span>TEL {site.tel}</span> : null}
                {site?.tel && site?.fax ? <span className="mx-1">|</span> : null}
                {site?.fax ? <span>FAX {site.fax}</span> : null}
                {(site?.tel || site?.fax) && site?.email ? <span className="mx-1">|</span> : null}
                {site?.email ? (
                  <span>
                    이메일{" "}
                    <a href={`mailto:${site.email}`} className="text-slate-200 underline">
                      {site.email}
                    </a>
                  </span>
                ) : null}
              </p>
              {site?.businessRegistrationNumber ? <p>사업자등록번호 {site.businessRegistrationNumber}</p> : null}
            </div>
          </div>

          <div className="text-center space-y-2 pb-2 md:pb-3">
            <div className="flex flex-wrap justify-center gap-2">
              {site?.termsUrl ? (
                <a
                  href={site.termsUrl}
                  className="inline-block px-3 py-1.5 text-xs font-bold border border-slate-500 bg-[#242831] !text-white transition-colors hover:bg-[#3a465a] hover:border-[#dbe4f2] hover:!text-white"
                >
                  {site.termsTitle || "이용약관"}
                </a>
              ) : null}
              {site?.privacyUrl ? (
                <a
                  href={site.privacyUrl}
                  className="inline-block px-3 py-1.5 text-xs font-bold border border-slate-500 bg-[#242831] !text-white transition-colors hover:bg-[#3a465a] hover:border-[#dbe4f2] hover:!text-white"
                >
                  {site.privacyTitle || "개인정보취급방침"}
                </a>
              ) : null}
            </div>
            {site?.copyrightText ? (
              <p className="text-xs text-slate-500">{site.copyrightText}</p>
            ) : (
              <p className="text-xs text-slate-600">저작권 문구를 관리자에서 설정해 주세요.</p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FloatingQuickMenu({ siteLang }) {
  const links = [
    { href: "/inquiry", label: tSite(siteLang, "quoteInquiry", "견적문의"), icon: "📝" },
    { href: "/events", label: pickKoEn(siteLang, "이벤트", "Events"), icon: "🎉" },
    { href: "/notices", label: pickKoEn(siteLang, "공지사항", "Notices"), icon: "📢" },
  ];
  return (
    <aside
      className="fixed right-4 top-1/2 z-[95] hidden -translate-y-1/2 md:block"
      aria-label={pickKoEn(siteLang, "빠른 메뉴", "Quick menu")}
    >
      <div className="w-[74px] rounded-[999px] border border-white/70 bg-white/78 px-1.5 py-3 backdrop-blur-[2px] shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
        <nav className="flex flex-col">
          {links.map((item, idx) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex min-h-[74px] flex-col items-center justify-center gap-1 text-center text-slate-800 transition-colors hover:text-[#C52525] ${
                idx > 0 ? "border-t border-slate-300/65" : ""
              }`}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[15px] transition-colors group-hover:bg-[#ffe9ec]">
                {item.icon}
              </span>
              <span className="text-xs font-semibold leading-tight tracking-[-0.01em]">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const removeMainFooterGap =
    pathname === "/customer/about" ||
    pathname === "/" ||
    pathname.startsWith("/products/") ||
    pathname.startsWith("/synthesis/");
  const isHome = pathname === "/";
  const mainUsesContentBand = !isHome && pathname !== "/customer/about";
  const [fullMenuOpen, setFullMenuOpen] = useState(false);
  const [fullMenuMounted, setFullMenuMounted] = useState(false);
  const [fullMenuClosing, setFullMenuClosing] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState("");
  const [panelMenuKey, setPanelMenuKey] = useState("");
  const [panelVisible, setPanelVisible] = useState(false);
  const [dropdownAnchorLeft, setDropdownAnchorLeft] = useState(0);
  const [headerSearch, setHeaderSearch] = useState("");
  const [site, setSite] = useState(null);
  const [siteLang, setSiteLang] = useState(SITE_LANG.KO);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [categoryTree, setCategoryTree] = useState([]);
  const [panelHeight, setPanelHeight] = useState(0);
  const [panelScrollable, setPanelScrollable] = useState(false);
  const dropdownPanelRef = useRef(null);
  const dropdownInnerRef = useRef(null);
  const topNavRef = useRef(null);
  const langMenuRef = useRef(null);

  const submitHeaderSearch = (e) => {
    e.preventDefault();
    const q = headerSearch.trim();
    router.push(q ? `/products?search=${encodeURIComponent(q)}&scope=catalog` : "/products");
    setActiveDropdown("");
  };

  const openFullMenu = () => {
    setFullMenuClosing(false);
    setFullMenuMounted(true);
    setFullMenuOpen(true);
  };

  const closeFullMenu = (immediate = false) => {
    if (immediate) {
      setFullMenuClosing(false);
      setFullMenuOpen(false);
      setFullMenuMounted(false);
      return;
    }
    setFullMenuClosing(true);
    setFullMenuOpen(false);
    window.setTimeout(() => {
      setFullMenuClosing(false);
      setFullMenuMounted(false);
    }, 340);
  };

  const closeMenus = () => {
    setActiveDropdown("");
    closeFullMenu();
  };

  useEffect(() => {
    setSiteLang(getStoredSiteLang());
  }, []);

  useEffect(() => {
    api
      .get("/site-settings")
      .then((r) => setSite(r.data))
      .catch(() => setSite(null));
  }, []);

  useEffect(() => {
    api
      .get("/product-categories", { params: { scope: PRODUCT_CATEGORY_SCOPE.PRODUCTS } })
      .then((r) => setCategoryTree(r.data?.tree || []))
      .catch(() => setCategoryTree([]));
  }, []);

  useEffect(() => {
    setActiveDropdown("");
    closeFullMenu(true);
    setLangMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!fullMenuMounted) return undefined;
    const onEsc = (e) => {
      if (e.key === "Escape") closeFullMenu();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [fullMenuMounted]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (fullMenuMounted) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [fullMenuMounted]);

  useEffect(() => {
    if (!langMenuOpen) return undefined;
    const onPointerDown = (e) => {
      if (!langMenuRef.current?.contains(e.target)) setLangMenuOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setLangMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [langMenuOpen]);

  useEffect(() => {
    if (activeDropdown) {
      setPanelMenuKey(activeDropdown);
      setPanelVisible(true);
      return undefined;
    }
    setPanelVisible(false);
    const t = setTimeout(() => setPanelMenuKey(""), 180);
    return () => clearTimeout(t);
  }, [activeDropdown]);

  const homeHeroHeaderMode = isHome && !panelVisible && !fullMenuOpen && !langMenuOpen;
  const allowHeaderDropdown = !isHome;
  const showFloatingQuickMenu = !isHome && !pathname.startsWith("/admin");
  const openHeaderDropdown = useCallback(
    (menuKey, event) => {
      if (!allowHeaderDropdown) return;
      setActiveDropdown(menuKey);
      const navRect = topNavRef.current?.getBoundingClientRect?.();
      const itemRect = event?.currentTarget?.getBoundingClientRect?.();
      if (navRect && itemRect) {
        const nextLeft = Math.max(0, itemRect.left - navRect.left - 96);
        setDropdownAnchorLeft(nextLeft);
      }
    },
    [allowHeaderDropdown]
  );
  const navLinkClass = ({ isActive }) =>
    `whitespace-nowrap text-[19px] md:text-[24px] font-extrabold tracking-[-0.01em] transition-colors ${
      homeHeroHeaderMode
        ? isActive
          ? "text-white"
          : "text-white/88 hover:text-white"
        : isActive
        ? "text-[#C52525]"
        : "text-slate-800 hover:text-[#C52525]"
    }`;

  const localizedTopMenus = useMemo(
    () => TOP_MENUS.map((m) => ({ ...m, label: pickKoEn(siteLang, m.label, m.en) })),
    [siteLang]
  );
  const localizedSupportMenus = useMemo(
    () => CUSTOMER_SUPPORT_SUB.map((m) => ({ ...m, label: pickKoEn(siteLang, m.label, m.en) })),
    [siteLang]
  );
  const activeMenu = localizedTopMenus.find((m) => m.key === panelMenuKey) || null;
  const shouldShowFooterAddress = Boolean(site?.showFooterAddress === true && String(site?.address || "").trim());
  const visibleCustomerSupportSub = useMemo(
    () =>
      shouldShowFooterAddress
        ? localizedSupportMenus
        : localizedSupportMenus.filter((x) => x.to !== "/customer/directions"),
    [shouldShowFooterAddress, localizedSupportMenus]
  );
  const footerMenuGroups = useMemo(
    () => buildFooterMenuGroups(visibleCustomerSupportSub, siteLang),
    [visibleCustomerSupportSub, siteLang]
  );
  const siteShellValue = useMemo(
    () => ({
      siteLang,
      site,
      footerMenuGroups,
      shouldShowFooterAddress,
    }),
    [siteLang, site, footerMenuGroups, shouldShowFooterAddress]
  );
  const activeItems = getDropdownItemsByMenu(panelMenuKey, categoryTree, visibleCustomerSupportSub, siteLang);
  const megaMenuLinkTextClass =
    panelMenuKey === "products"
      ? productMegaMenuLinkTextClass(activeItems)
      : "text-[17px] md:text-[24px] leading-snug";
  const isProductsDropdown = panelMenuKey === "products";
  const panelMinHeightPx = panelMenuKey === "products" ? MEGA_MENU_PANEL_PRODUCTS_MIN_HEIGHT_PX : MEGA_MENU_PANEL_MIN_HEIGHT_PX;

  const measureDropdownPanel = useCallback(() => {
    const outer = dropdownPanelRef.current;
    const el = dropdownInnerRef.current;
    if (!el) return;
    /** 이전에 연 '긴' 메뉴 높이가 남아 있으면 flex 자식 scrollHeight가 그만큼 커지는 문제 → 측정 전 패널을 최소 높이로 잠깐 고정 */
    if (outer) {
      outer.style.height = `${panelMinHeightPx}px`;
      void outer.offsetHeight;
    }
    const contentHeight = el.scrollHeight || 0;
    if (outer) {
      outer.style.height = "";
    }
    if (typeof window === "undefined") {
      setPanelHeight(Math.max(panelMinHeightPx, contentHeight));
      setPanelScrollable(false);
      return;
    }
    const viewportAvailable = Math.max(panelMinHeightPx, window.innerHeight - 140);
    const nextHeight = Math.max(panelMinHeightPx, Math.min(contentHeight, viewportAvailable));
    setPanelHeight(nextHeight);
    setPanelScrollable(contentHeight > viewportAvailable);
  }, [panelMinHeightPx]);

  useLayoutEffect(() => {
    measureDropdownPanel();
  }, [measureDropdownPanel, panelMenuKey, panelVisible, activeItems]);

  useEffect(() => {
    if (!panelVisible) {
      setPanelScrollable(false);
      return undefined;
    }
    const onResize = () => measureDropdownPanel();
    window.addEventListener("resize", onResize);
    let ro;
    if (typeof ResizeObserver !== "undefined" && dropdownInnerRef.current) {
      ro = new ResizeObserver(() => measureDropdownPanel());
      ro.observe(dropdownInnerRef.current);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [panelVisible, panelMenuKey, measureDropdownPanel]);

  return (
    <SiteShellContext.Provider value={siteShellValue}>
      <div className="site-shell flex flex-col overflow-x-clip bg-white">
      <header
        className={`top-0 z-[100] shrink-0 transition-colors ${isHome ? "border-b-0" : "border-b border-slate-200/90"} ${
          homeHeroHeaderMode
            ? "absolute left-0 right-0 bg-transparent text-white"
            : "sticky bg-white text-slate-900"
        }`}
      >
        <div className="mx-auto flex w-full max-w-full flex-col px-4 md:max-w-[70%]">
          <div className="flex h-[92px] w-full shrink-0 items-center">
          <div className="grid w-full shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 md:gap-6">
            <Link href="/" className="shrink-0 flex items-center" title="홈" onClick={closeMenus}>
              <img
                src={site?.headerLogoUrl || "/logo.svg"}
                alt=""
                className={`h-11 md:h-12 w-auto object-contain ${homeHeroHeaderMode ? "drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]" : ""}`}
              />
            </Link>

            <nav ref={topNavRef} className="hidden md:flex w-full items-center justify-evenly px-3 lg:px-4">
              {localizedTopMenus.map((m) => (
                <NavLink
                  key={`top-inline-${m.key}`}
                  href={m.to}
                  end={m.key === "products"}
                  className={navLinkClass}
                  onMouseEnter={(e) => openHeaderDropdown(m.key, e)}
                  onFocus={(e) => openHeaderDropdown(m.key, e)}
                  onClick={closeMenus}
                >
                  {m.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center justify-end gap-4 md:gap-5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setHeaderSearch("");
                  router.push("/products");
                }}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${homeHeroHeaderMode ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-200"}`}
                aria-label={tSite(siteLang, "searchAria", "검색")}
                title={tSite(siteLang, "searchAria", "검색")}
              >
                <IconSearch className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setLangMenuOpen(false);
                  openFullMenu();
                }}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                  homeHeroHeaderMode ? "hover:bg-white/10" : "hover:bg-slate-200"
                }`}
                aria-label={tSite(siteLang, "fullMenuOpen", "전체 메뉴 열기")}
                title={tSite(siteLang, "fullMenuOpen", "전체 메뉴")}
              >
                <IconBentoMenu variant={homeHeroHeaderMode ? "onDark" : "onLight"} />
              </button>
            </div>
          </div>
          </div>

          <div className="relative w-full" onMouseLeave={() => allowHeaderDropdown && setActiveDropdown("")}>
            <nav className="hidden w-full flex-wrap items-center justify-between gap-y-1 text-base lg:text-[17px] font-semibold">
              {localizedTopMenus.map((m) => (
                <NavLink
                  key={m.key}
                  href={m.to}
                  end={m.key === "products"}
                  className={navLinkClass}
                  onMouseEnter={() => setActiveDropdown(m.key)}
                  onFocus={() => setActiveDropdown(m.key)}
                  onClick={closeMenus}
                >
                  {m.label}
                </NavLink>
              ))}
            </nav>

            {allowHeaderDropdown && activeMenu ? (
              <div
                ref={dropdownPanelRef}
                className={`absolute left-1/2 top-0 z-[120] flex min-h-0 w-screen max-w-none -translate-x-1/2 flex-col border-t border-slate-200/90 ${
                  panelScrollable ? "overflow-x-hidden overflow-y-auto" : "overflow-hidden"
                } bg-[#F5F5F5] text-left text-slate-800 shadow-lg transition-[height,opacity,transform] duration-300 ease-out ${
                  panelVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
                }`}
                style={{
                  height: panelVisible ? Math.max(panelMinHeightPx, panelHeight) : 0,
                  minHeight: panelVisible ? panelMinHeightPx : undefined,
                }}
                role="navigation"
                aria-label={`${activeMenu.label} submenu`}
                onMouseEnter={() => {
                  if (panelMenuKey) setActiveDropdown(panelMenuKey);
                }}
              >
                <div
                  ref={dropdownInnerRef}
                  className={`relative z-10 mx-auto box-border flex min-h-0 w-full max-w-full flex-1 flex-col px-4 md:max-w-[85%] ${
                    isProductsDropdown ? "py-4 md:py-5" : "py-0"
                  }`}
                >
                  <div className={`grid min-h-0 w-full flex-1 grid-cols-1 ${isProductsDropdown ? "items-start" : "items-center"}`}>
                    {activeItems.length > 0 ? (
                      <div
                        className={`flex min-h-0 min-w-0 flex-col self-stretch py-0.5 md:py-1 ${
                          isProductsDropdown ? "justify-center" : "justify-center md:items-start"
                        }`}
                      >
                        <ul
                          className={
                            isProductsDropdown
                              ? "grid w-full grid-cols-1 gap-x-8 gap-y-1.5 text-left sm:grid-cols-2 lg:grid-cols-3"
                              : "inline-flex w-auto max-w-none flex-nowrap items-baseline gap-x-8 text-left whitespace-nowrap"
                          }
                          style={isProductsDropdown ? undefined : { paddingLeft: `${dropdownAnchorLeft}px` }}
                        >
                          {activeItems.map((item) => (
                            <li key={`${activeMenu.key}-${item.to}-${item.label}`} className={isProductsDropdown ? "w-full min-w-0" : "w-auto shrink-0"}>
                              <Link
                                href={item.to}
                                className={`-mx-1 block px-3 py-1.5 text-slate-700 ${megaMenuLinkTextClass} transition-colors duration-150 hover:font-semibold hover:text-[#C52525] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#C52525]/40 ${
                                  isProductsDropdown ? "truncate md:py-2" : "whitespace-nowrap"
                                }`}
                                onClick={closeMenus}
                              >
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="flex min-h-0 min-w-0 flex-col justify-start self-stretch py-2">
                        <div className="w-full max-w-md text-left text-sm text-slate-500">
                          {tSite(siteLang, "noSubmenu", "표시할 하위 메뉴가 없습니다.")}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

        </div>
      </header>
      {allowHeaderDropdown && panelVisible ? (
        <button
          type="button"
          aria-label={tSite(siteLang, "closeMenu", "메뉴 닫기")}
          onClick={closeMenus}
          className="hidden md:block fixed inset-x-0 bottom-0 top-[72px] z-[90] bg-black/35"
        />
      ) : null}
      {fullMenuMounted ? (
        <div
          className={`fixed inset-0 z-[220] text-white ${
            fullMenuClosing ? "fullmenu-overlay-exit" : "fullmenu-overlay-enter"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label={tSite(siteLang, "fullMenuDialog", "전체 메뉴")}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br from-[#181210] via-[#241a18] to-[#120d0c] ${
              fullMenuClosing ? "fullmenu-backdrop-exit" : "fullmenu-backdrop-enter"
            }`}
            aria-hidden
          />
          <svg
            className={`pointer-events-none absolute bottom-0 right-[-4%] h-[min(40vh,360px)] w-[min(96vw,520px)] text-[#C52525] ${
              fullMenuClosing ? "fullmenu-decor-exit" : "fullmenu-decor-enter"
            }`}
            style={{ opacity: 0.2 }}
            viewBox="0 0 440 320"
            preserveAspectRatio="xMaxYMax meet"
            aria-hidden
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
              <path d="M48 220 L120 140 L200 200 L280 100 L360 160 L400 88" />
              <path d="M120 140 L200 88 L280 100" />
              <path d="M200 200 L280 100 L360 160" />
              <path d="M88 260 L200 200" />
            </g>
            <circle cx="120" cy="140" r="9" fill="currentColor" opacity="0.45" />
            <circle cx="280" cy="100" r="11" fill="currentColor" opacity="0.55" />
            <circle cx="200" cy="200" r="8" fill="currentColor" opacity="0.35" />
            <circle cx="360" cy="160" r="7" fill="currentColor" opacity="0.4" />
            <circle cx="400" cy="88" r="6" fill="currentColor" opacity="0.5" />
          </svg>

          <div
            className={`relative z-[2] flex max-h-[100dvh] min-h-0 flex-col overflow-y-auto overscroll-contain pt-[max(18px,env(safe-area-inset-top))] ${
              fullMenuClosing ? "fullmenu-sheet-exit" : "fullmenu-sheet-enter"
            }`}
          >
            <div className="container mx-auto w-full max-w-full px-4 pb-20 pt-10 md:max-w-[90%] md:px-6 md:pt-12">
              <div className={`mb-8 flex items-center justify-between md:mb-10 ${fullMenuClosing ? "fullmenu-header-exit" : "fullmenu-header-enter"}`}>
                <Link href="/" className="shrink-0" onClick={() => closeFullMenu()} title={tSite(siteLang, "home", "홈")}>
                  <img
                    src={site?.headerLogoUrl || "/logo.svg"}
                    alt=""
                    className="h-9 w-auto max-h-10 object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] md:h-10"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => closeFullMenu()}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/25 bg-white/[0.06] hover:bg-white/10"
                  aria-label={tSite(siteLang, "closeMenu", "닫기")}
                  title={tSite(siteLang, "closeMenu", "닫기")}
                >
                  <IconCloseFourDots className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="border-t border-white/10">
                <div className="fullmenu-row-enter grid grid-cols-1 items-start gap-6 border-b border-white/10 py-7 md:grid-cols-[minmax(160px,240px)_1fr] md:gap-12 md:py-9" style={{ "--fm-delay": "110ms" }}>
                  <div className="text-[26px] font-bold leading-[1.15] tracking-tight text-white md:text-[clamp(2rem,4vw,2.75rem)]">
                    {pickKoEn(siteLang, "공식제조사", "Manufacturers")}
                  </div>
                  <div className="flex flex-wrap gap-x-10 gap-y-3 text-[15px] md:text-lg">
                    <Link href="/partners" onClick={() => closeFullMenu()} className="text-white/90 transition-colors hover:text-white">
                      {pickKoEn(siteLang, "공식제조사", "Manufacturers")}
                    </Link>
                  </div>
                </div>

                <div className="fullmenu-row-enter grid grid-cols-1 items-start gap-6 border-b border-white/10 py-7 md:grid-cols-[minmax(160px,240px)_1fr] md:gap-12 md:py-9" style={{ "--fm-delay": "170ms" }}>
                  <div className="text-[26px] font-bold leading-[1.15] tracking-tight text-white md:text-[clamp(2rem,4vw,2.75rem)]">
                    {pickKoEn(siteLang, "제품소개", "Products")}
                  </div>
                  <div className="flex flex-wrap gap-x-10 gap-y-3 text-[15px] md:text-lg">
                    <Link href="/products" onClick={() => closeFullMenu()} className="text-white/90 hover:text-white">
                      {pickKoEn(siteLang, "전체제품", "All products")}
                    </Link>
                    <Link href="/synthesis" onClick={() => closeFullMenu()} className="text-white/90 hover:text-white">
                      {pickKoEn(siteLang, "합성서비스", "Synthesis")}
                    </Link>
                  </div>
                </div>

                <div className="fullmenu-row-enter grid grid-cols-1 items-start gap-6 border-b border-white/10 py-7 md:grid-cols-[minmax(160px,240px)_1fr] md:gap-12 md:py-9" style={{ "--fm-delay": "230ms" }}>
                  <div className="text-[26px] font-bold leading-[1.15] tracking-tight text-white md:text-[clamp(2rem,4vw,2.75rem)]">
                    {pickKoEn(siteLang, "뉴스룸", "Newsroom")}
                  </div>
                  <div className="flex flex-wrap gap-x-10 gap-y-3 text-[15px] md:text-lg">
                    <Link href="/notices" onClick={() => closeFullMenu()} className="text-white/90 hover:text-white">
                      {pickKoEn(siteLang, "공지사항", "Notices")}
                    </Link>
                    <Link href="/events" onClick={() => closeFullMenu()} className="text-white/90 hover:text-white">
                      {pickKoEn(siteLang, "이벤트", "Events")}
                    </Link>
                    <Link href="/references" onClick={() => closeFullMenu()} className="text-white/90 hover:text-white">
                      {pickKoEn(siteLang, "참고논문", "References")}
                    </Link>
                  </div>
                </div>

                <div className="fullmenu-row-enter grid grid-cols-1 items-start gap-6 py-7 md:grid-cols-[minmax(160px,240px)_1fr] md:gap-12 md:py-9" style={{ "--fm-delay": "290ms" }}>
                  <div className="text-[26px] font-bold leading-[1.15] tracking-tight text-white md:text-[clamp(2rem,4vw,2.75rem)]">
                    {pickKoEn(siteLang, "고객지원", "Support")}
                  </div>
                  <div className="flex flex-wrap gap-x-10 gap-y-3 text-[15px] md:text-lg">
                    <Link href="/inquiry" onClick={() => closeFullMenu()} className="text-white/90 hover:text-white">
                      {tSite(siteLang, "quoteInquiry", "견적문의")}
                    </Link>
                    <Link href="/customer/about" onClick={() => closeFullMenu()} className="text-white/90 hover:text-white">
                      {pickKoEn(siteLang, "회사소개", "About")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <main
        className={`w-full ${mainUsesContentBand ? SITE_SUBPAGE_MAIN_BAND : ""} ${removeMainFooterGap ? "pb-0" : "pb-10 md:pb-12"}`}
      >
        {children}
      </main>
      {showFloatingQuickMenu ? <FloatingQuickMenu siteLang={siteLang} /> : null}
      <SiteFooter
        site={site}
        footerMenuGroups={footerMenuGroups}
        shouldShowFooterAddress={shouldShowFooterAddress}
        rootClassName={`${removeMainFooterGap ? "mt-0" : "mt-10 md:mt-14"} shrink-0 border-t border-slate-800 bg-[#1f2227]`}
      />
      <SitePopups />
      <VisitBeacon />
      </div>
    </SiteShellContext.Provider>
  );
}

function SectionTitle({ title, desc }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-slate-500 text-sm">{desc}</p>
    </div>
  );
}

/** 상단 서브페이지: 홈 아이콘 + | 구분 세그먼트 (마지막은 현재 위치, to 생략 시 비링크) */
function IconHomeCrumb({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" strokeLinejoin="round" />
    </svg>
  );
}

function PageBreadcrumb({ segments, subMenus = [], subMenuAnchorIndex = -1, subMenuIsActive, className = "" }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const isCurrentSubMenu = (to) => pathname === to || pathname.startsWith(`${to}/`);
  const anchorIndex = subMenus.length ? (subMenuAnchorIndex >= 0 ? subMenuAnchorIndex : (segments || []).length - 1) : -1;

  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative z-[220] mt-2 md:mt-3 ${className}`}>
      <nav className="flex flex-wrap items-center gap-x-1.5 text-xs sm:text-sm text-slate-500" aria-label="현재 위치">
        <Link href="/" className="inline-flex items-center shrink-0 text-slate-500 hover:text-[#002D5E]" title="Home" aria-label="Home">
          Home
        </Link>
        {(segments || []).map((seg, i) => (
          <span key={i} className="relative inline-flex items-center gap-x-1.5 min-w-0">
            <span className="shrink-0 text-[10px] text-[#C52525]" aria-hidden>
              ●
            </span>
            {subMenus.length && i === anchorIndex ? (
              <>
                {seg.to ? (
                  <Link href={seg.to} className="hover:text-[#002D5E] truncate min-w-0">
                    {seg.label}
                  </Link>
                ) : (
                  <span className="truncate min-w-0 text-slate-800 font-medium">{seg.label}</span>
                )}
                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center justify-center text-slate-500 hover:text-[#002D5E]"
                  aria-label="하위 메뉴 열기"
                  aria-expanded={open}
                  onClick={() => setOpen((v) => !v)}
                >
                  <svg className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {open ? (
                  <div className="absolute left-0 top-full z-[240] min-w-[180px] overflow-hidden rounded border border-slate-300 bg-slate-100 shadow-lg">
                    {subMenus.map((menu) => {
                      const active = subMenuIsActive ? subMenuIsActive(menu) : isCurrentSubMenu(menu.to);
                      return (
                        <Link
                          key={`${menu.to}-${menu.label}`}
                          href={menu.to}
                          className={`block px-3 py-2 whitespace-nowrap ${
                            active ? "bg-slate-200 text-[#002D5E] font-medium" : "text-slate-700 hover:bg-slate-200 hover:text-[#002D5E]"
                          }`}
                        >
                          {menu.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </>
            ) : seg.to ? (
              <Link href={seg.to} className="hover:text-[#002D5E] truncate min-w-0">
                {seg.label}
              </Link>
            ) : (
              <span className={`truncate min-w-0 ${i === (segments || []).length - 1 ? "text-slate-800 font-medium" : ""}`}>{seg.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}

function PageHeroTitle({ title, subtitle }) {
  return (
    <header className="text-center px-2 py-6 sm:py-7 md:py-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-3 text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">{subtitle}</p> : null}
    </header>
  );
}

function PageContentRule() {
  return <div className="border-t-4 border-slate-900 w-full" role="presentation" />;
}

const BOARD_LIST_SLUG_SUBTITLE = {
  notices: "공지 및 안내 사항을 확인하실 수 있습니다.",
  events: "진행 중인 이벤트와 프로모션을 안내합니다.",
  references: "참고 논문 및 기술 자료를 모았습니다.",
};

function boardSlugToEyebrow(slug) {
  const s = String(slug || "").toLowerCase();
  if (s === "notices") return "ANNOUNCEMENTS";
  if (s === "events") return "EVENTS";
  if (s === "references") return "REFERENCES";
  return "BOARD";
}

function SitePageHeroBanner({ breadcrumb, eyebrow, title, innerClassName = "", sectionClassName = "" }) {
  const titleText = typeof title === "string" || typeof title === "number" ? String(title) : "";
  const titleChars = titleText ? Array.from(titleText) : null;

  return (
    <section
      className={`relative z-10 mt-[100px] overflow-visible bg-white pt-3 md:mt-[100px] md:pt-4 ${sectionClassName}`.trim()}
    >
      <div className={`w-full py-5 md:py-6 ${innerClassName}`.trim()}>
        <header className="w-full">
          <div className="flex w-full flex-col items-start justify-between gap-2 md:flex-row md:items-end md:gap-3">
            <div className="min-w-0">
            {eyebrow ? (
                <p className="mb-2 flex items-center justify-start gap-3 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
                <span className="h-px w-10 shrink-0 bg-slate-300/70" aria-hidden />
                <span>{eyebrow}</span>
              </p>
            ) : null}
              <h1
                className="site-hero-title-wave text-[2.25rem] font-extrabold tracking-tight text-[#1a2a4e] sm:text-[2.8rem] md:text-[3.4rem] md:leading-[1.08]"
                aria-label={titleChars ? titleText : undefined}
              >
                {titleChars
                  ? titleChars.map((ch, i) => (
                      <span
                        key={`${ch}-${i}`}
                        className="site-hero-title-char"
                        style={{ "--hero-char-delay": `${i * 34}ms` }}
                        aria-hidden="true"
                      >
                        {ch === " " ? "\u00A0" : ch}
                      </span>
                    ))
                  : title}
              </h1>
            </div>
            <div className="shrink-0 text-slate-500 [&>div]:!mt-0">{breadcrumb}</div>
          </div>
        </header>
      </div>
    </section>
  );
}

const BOARD_DETAIL_SLUG_TITLE = {
  notices: "공지사항",
  events: "이벤트",
  references: "참고논문",
};

function HeroCarousel({ slides }) {
  const list = slides?.length ? slides : [];
  const [idx, setIdx] = useState(0);
  const n = list.length;

  useEffect(() => {
    if (list.length <= 1) return undefined;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % list.length);
    }, 4000);
    return () => clearInterval(t);
  }, [list.length]);

  if (!list.length) return null;

  const go = (delta) => setIdx((i) => (i + delta + list.length) % list.length);

  return (
    <section className="relative w-screen left-1/2 -translate-x-1/2 bg-[#0a2744]" aria-roledescription="carousel" aria-label="메인 배너">
      <div className="relative h-[min(62vw,560px)] md:h-screen overflow-hidden">
        {list.map((s, i) => {
          const hasImage = Boolean(s.imageUrl || s.mobileImageUrl);
          const link = String(s.linkUrl || "").trim();
          const isExternal = /^https?:\/\//i.test(link);
          const linkLabel = s.title ? `${s.title} 바로가기` : "배너 바로가기";
          const description = String(s.description || s.subtitle || "").trim();
          const title = String(s.title || "").trim() || "프로모션 배너";
          return (
            <div
              key={s._id || `slide-${i}`}
              className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              aria-hidden={i !== idx}
            >
              {hasImage ? (
                <picture className="absolute inset-0 block">
                  <source media="(max-width: 767px)" srcSet={s.mobileImageUrl || s.imageUrl} />
                  <img src={s.imageUrl || s.mobileImageUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
                </picture>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#003a6b] via-[#002D5E] to-slate-900" />
              )}
              <div className="absolute inset-0 bg-black/45" />
              <div className="relative z-[1] flex h-full items-center">
                <div className="container mx-auto max-w-full px-8 md:max-w-[85%]">
                  <div
                    className={`max-w-[min(90vw,760px)] transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      i === idx ? "opacity-100 translate-y-0 translate-x-0" : "opacity-0 translate-y-2 translate-x-12"
                    }`}
                  >
                    {description ? <p className="mb-3 text-lg font-medium text-white/90 md:text-2xl">{description}</p> : null}
                    <h2 className="max-w-[18ch] text-[34px] font-extrabold leading-[1.12] tracking-tight text-white drop-shadow md:text-[58px]">
                      {title}
                    </h2>
                  </div>
                </div>
              </div>
              {link ? (
                isExternal ? (
                  <a href={link} target="_blank" rel="noreferrer" className="absolute inset-0 z-[2] block cursor-pointer" aria-label={linkLabel} />
                ) : (
                  <Link href={link} className="absolute inset-0 z-[2] block cursor-pointer" aria-label={linkLabel} />
                )
              ) : null}
            </div>
          );
        })}
        {list.length > 1 ? (
          <div className="absolute left-[max(1.5rem,8vw)] top-[66%] z-20 flex -translate-y-1/2 items-center gap-2 md:left-[max(2rem,9vw)] md:top-[68%]">
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/55 bg-black/20 text-white hover:bg-black/35"
              aria-label="이전 배너"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/55 bg-black/20 text-white hover:bg-black/35"
              aria-label="다음 배너"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HomeSectionTitle({ eyebrow, title, description, align = "left" }) {
  return (
    <div className={`${align === "center" ? "text-center" : ""} space-y-2`}>
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#B5122B]">{eyebrow}</p> : null}
      <h2 className="text-[34px] font-bold tracking-tight text-[#111111] md:text-[44px]">{title}</h2>
      {description ? <p className="text-base text-[#666666] md:text-[17px]">{description}</p> : null}
    </div>
  );
}

function HomeBoardCards({ title, eyebrow, items, hrefBase, fallbackHref, badgeLabel }) {
  return (
    <section className="w-full bg-white">
      <div className="container mx-auto max-w-full px-4 md:max-w-[85%]">
        <div className="flex items-end justify-between gap-4">
          <HomeSectionTitle eyebrow={eyebrow} title={title} />
          <Link href={fallbackHref} className="text-sm font-semibold !text-[#B5122B] hover:opacity-80">
            VIEW ALL
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {(items || []).slice(0, 3).map((x) => (
            <Link
              key={x._id}
              href={`${hrefBase}/${x._id}`}
              className="group rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 inline-flex rounded-full border border-[#F7D9E5] bg-[#fff5f8] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#B5122B]">
                {badgeLabel}
              </div>
              <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-[#111111] transition-colors group-hover:text-[#B5122B]">{x.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-[#666666]">{x.summary || "No summary available."}</p>
              <p className="mt-3 text-xs text-[#777]">{formatPostDate(x.createdAt)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function isOngoingEventItem(item) {
  if (!item) return false;
  if (item.forceEnded === true) return false;
  const now = Date.now();
  const startAt = item.startAt ? new Date(item.startAt).getTime() : null;
  const endAt = item.endAt ? new Date(item.endAt).getTime() : null;
  if (startAt && Number.isFinite(startAt) && startAt > now) return false;
  if (endAt && Number.isFinite(endAt) && endAt < now) return false;
  return true;
}

function HomeEventsCarousel({ items }) {
  const site = useContext(SiteShellContext).site;
  const companyName = String(site?.companyName || "").trim() || "하이미바이오메드";
  const companyNameEn =
    String(site?.companyNameEn || site?.companyEnglishName || site?.companyEn || "").trim() || "HiMEbiomed";
  const sectionRef = useRef(null);
  const wasInViewRef = useRef(false);
  const [watermarkAnimSeed, setWatermarkAnimSeed] = useState(0);
  const viewportRef = useRef(null);
  const scrollByPage = (direction) => {
    const el = viewportRef.current;
    if (!el) return;
    const amount = Math.max(280, Math.floor(el.clientWidth * 0.9));
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  useEffect(() => {
    const target = sectionRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isInView = Boolean(entry?.isIntersecting);
        if (isInView && !wasInViewRef.current) {
          setWatermarkAnimSeed((v) => v + 1);
        }
        wasInViewRef.current = isInView;
      },
      { threshold: 0.45 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative flex min-h-screen w-full items-center overflow-hidden bg-[#F8F8F8]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <p
          key={`event-watermark-top-${watermarkAnimSeed}`}
          className="event-watermark event-watermark-top absolute left-[50vw] w-screen whitespace-nowrap text-center text-[clamp(120px,14vw,260px)] font-extrabold leading-none tracking-tight text-slate-900/[0.05]"
        >
          {companyNameEn}
        </p>
        <p
          key={`event-watermark-bottom-${watermarkAnimSeed}`}
          className="event-watermark event-watermark-bottom absolute left-[50vw] w-screen whitespace-nowrap text-center text-[clamp(120px,14vw,260px)] font-extrabold leading-none tracking-tight text-slate-900/[0.05]"
        >
          {companyNameEn}
        </p>
      </div>
      <div className="relative z-[1] container mx-auto max-w-full px-4 md:max-w-[85%]">
        <div className="flex items-start justify-between gap-4">
          <div className="group/event-copy">
            <p className="text-base font-extrabold tracking-[0.08em] text-[#B5122B]">Event</p>
            <p className="mt-2 text-[40px] font-bold leading-tight text-[#111111] transition-transform duration-500 ease-out md:text-[50px] md:group-hover/event-copy:-translate-y-1">
              <span className="whitespace-nowrap">{companyName}가</span>
            </p>
            <p className="mt-2 text-[40px] font-bold leading-tight text-[#111111] md:text-[50px]">
              준비한 이벤트를 확인해 보세요<span className="text-[#C52525]">.</span>
            </p>
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d6d6d6] text-slate-500 hover:border-[#B5122B] hover:text-[#B5122B]"
              aria-label="이전 이벤트"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d6d6d6] text-slate-500 hover:border-[#B5122B] hover:text-[#B5122B]"
              aria-label="다음 이벤트"
            >
              →
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="mt-8 py-10 text-center text-sm text-[#666666]">현재 진행중인 이벤트가 없습니다.</p>
        ) : (
          <div ref={viewportRef} className="mt-6 overflow-x-auto hide-scrollbar">
            <div className="flex min-w-max gap-4 pb-2">
              {items.map((x) => (
                <Link
                  key={x._id}
                  href={`/events/${x._id}`}
                  className="group block w-[330px] overflow-hidden border border-[#d7d7d7] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative h-[206px] overflow-hidden bg-slate-100">
                    {x.thumbnailUrl ? (
                      <img src={x.thumbnailUrl} alt={x.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">NO IMAGE</div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-[23px] font-semibold leading-snug text-[#111111]">{x.title}</h3>
                    <p className="mt-2 line-clamp-2 text-base text-[#666666]">{x.summary || "이벤트 내용을 확인해 주세요."}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function HomeNewProductCarousel({ items }) {
  const site = useContext(SiteShellContext).site;
  const companyName = String(site?.companyName || "").trim() || "하이미바이오메드";
  const list = (items || []).slice(0, 8);
  const viewportRef = useRef(null);
  const loopStepRef = useRef(0);
  const isResettingRef = useRef(false);
  const [progressRate, setProgressRate] = useState(0);
  const [progressResetting, setProgressResetting] = useState(false);
  const [cardWidth, setCardWidth] = useState(280);
  const CARD_GAP_PX = 20;
  const VISIBLE_CARD_COUNT = 3;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const maxStartIndex = Math.max(0, list.length - VISIBLE_CARD_COUNT);
    if (maxStartIndex <= 0) {
      setProgressRate(0);
      el.scrollTo({ left: 0, behavior: "auto" });
      return undefined;
    }

    const syncCardWidth = () => {
      const next = (el.clientWidth - CARD_GAP_PX * 2) / 3;
      setCardWidth(Math.max(240, next));
    };

    const stepAndLoop = () => {
      if (isResettingRef.current) return;
      const first = el.querySelector("[data-new-product-card]");
      if (!first) return;
      const step = first.getBoundingClientRect().width + CARD_GAP_PX;
      if (loopStepRef.current < maxStartIndex) {
        loopStepRef.current += 1;
        const next = loopStepRef.current * step;
        el.scrollTo({ left: next, behavior: "smooth" });
        setProgressRate(loopStepRef.current / maxStartIndex);
        return;
      }

      // 마지막까지 채운 뒤 1번 카드로 돌아가며 진행바를 다시 줄인다.
      isResettingRef.current = true;
      setProgressRate(1);
      fillTimeout = window.setTimeout(() => {
        setProgressResetting(true);
        setProgressRate(0);
        loopStepRef.current = 0;
        el.scrollTo({ left: 0, behavior: "auto" });
        resetTimeout = window.setTimeout(() => {
          setProgressResetting(false);
          isResettingRef.current = false;
        }, 420);
      }, 520);
    };

    let fillTimeout;
    let resetTimeout;
    syncCardWidth();
    loopStepRef.current = 0;
    setProgressRate(0);
    setProgressResetting(false);
    isResettingRef.current = false;
    el.scrollTo({ left: 0, behavior: "auto" });
    window.addEventListener("resize", syncCardWidth);
    const timer = window.setInterval(stepAndLoop, 3300);
    return () => {
      if (fillTimeout) window.clearTimeout(fillTimeout);
      if (resetTimeout) window.clearTimeout(resetTimeout);
      window.removeEventListener("resize", syncCardWidth);
      window.clearInterval(timer);
    };
  }, [list.length]);

  const progress = `${Math.max(0, Math.round(progressRate * 100))}%`;

  const teaser = (x) => {
    const raw = String(x?.summary || x?.shortDescription || x?.description || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return raw || "신제품 정보를 확인해 주세요.";
  };

  return (
    <section className="flex items-center bg-[#F8F8F8] py-12 md:min-h-screen">
      <div className="container mx-auto max-w-full px-4 md:max-w-[85%]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold tracking-[0.08em] text-[#B5122B]">New Product</p>
            <h3 className="mt-2 text-[32px] font-bold leading-tight text-[#111111] md:text-[40px]">{companyName}의</h3>
            <p className="mt-2 text-[32px] font-bold leading-tight text-[#111111] md:text-[40px]">
              신제품을 만나보세요<span className="text-[#C52525]">.</span>
            </p>
          </div>
          <Link
            href="/products?isNew=true"
            className="mt-1 inline-flex h-11 items-center rounded-full bg-[#C52525] px-6 text-base font-semibold text-white shadow-sm transition-all hover:brightness-105"
          >
            + View More
          </Link>
        </div>

        <div ref={viewportRef} className="overflow-x-auto hide-scrollbar">
          <div className="flex min-w-max gap-5 pb-2">
            {list.map((x) => (
              <Link
                key={x._id}
                href={`/products/${x._id}`}
                data-new-product-card
                className="group block shrink-0 border border-[#d8d8d8] bg-white/90 p-0 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ width: `${cardWidth}px` }}
              >
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                {x.thumbnailUrl ? (
                  <img src={x.thumbnailUrl} alt={x.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">NO IMAGE</div>
                )}
              </div>
              <div className="p-5">
                <h4 className="line-clamp-2 text-[24px] font-semibold leading-snug text-[#111111]">{x.name}</h4>
                <p className="mt-2 line-clamp-3 text-base leading-relaxed text-[#555555]">{teaser(x)}</p>
              </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-7 h-[5px] w-[240px] rounded-full bg-[#e3e3e3]">
          <div
            className={`h-full rounded-full bg-[#B5122B] transition-[width] ${progressResetting ? "duration-400" : "duration-700"}`}
            style={{ width: progress }}
          />
        </div>
      </div>
    </section>
  );
}

function Home() {
  const site = useContext(SiteShellContext).site;
  const companyName = String(site?.companyName || "").trim() || "하이미바이오메드";
  const HOME_SECTION_LABELS = ["HOME", "PRODUCT", "NEW PRODUCT", "EVENT", "NEWS"];
  const homeSectionsRef = useRef(null);
  const isWheelTransitionRef = useRef(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [activeProductSplit, setActiveProductSplit] = useState("");
  const [banners, setBanners] = useState([]);
  const [newItems, setNewItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [homeNotices, setHomeNotices] = useState([]);
  const [productCats, setProductCats] = useState([]);
  const [synthesisCats, setSynthesisCats] = useState([]);
  const isLightSection = activeSectionIndex >= 2;

  useEffect(() => {
    const getSections = () =>
      Array.from(homeSectionsRef.current?.querySelectorAll("[data-home-section]") ?? []);

    const scrollWindowToSectionTop = (el) => {
      const y = el.getBoundingClientRect().top + window.scrollY;
      isWheelTransitionRef.current = true;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      window.setTimeout(() => {
        isWheelTransitionRef.current = false;
      }, 720);
    };

    const getCurrentSectionIndex = (sections) => {
      if (!sections.length) return 0;
      const anchor = window.scrollY + 24;
      let idx = 0;
      for (let i = sections.length - 1; i >= 0; i--) {
        const top = sections[i].getBoundingClientRect().top + window.scrollY;
        if (anchor >= top - 8) {
          idx = i;
          break;
        }
      }
      return idx;
    };

    const onWheel = (e) => {
      if (typeof window === "undefined") return;
      if (window.innerWidth < 1024) return;

      const sections = getSections();
      if (!sections.length) return;

      const innerScrollable =
        e.target instanceof Element ? e.target.closest("[data-home-inner-scroll]") : null;
      if (innerScrollable) {
        const el = innerScrollable;
        const delta = e.deltaY || 0;
        const atTop = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
        const canScrollInside = (delta > 0 && !atBottom) || (delta < 0 && !atTop);
        if (canScrollInside) return;
        if (Math.abs(delta) < 72) return;
      }

      if (isWheelTransitionRef.current) {
        e.preventDefault();
        return;
      }
      if (Math.abs(e.deltaY) < 14) return;

      const currentIndex = getCurrentSectionIndex(sections);
      const dir = e.deltaY > 0 ? 1 : -1;

      if (dir > 0 && currentIndex >= sections.length - 1) {
        return;
      }
      if (dir < 0 && currentIndex <= 0) {
        return;
      }

      const nextIndex = currentIndex + dir;
      if (nextIndex < 0 || nextIndex >= sections.length) return;

      e.preventDefault();
      scrollWindowToSectionTop(sections[nextIndex]);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const getSections = () =>
      Array.from(homeSectionsRef.current?.querySelectorAll("[data-home-section]") ?? []);
    const syncActiveSection = () => {
      const sections = getSections();
      if (!sections.length) return;
      const anchor = window.scrollY + 24;
      let idx = 0;
      for (let i = sections.length - 1; i >= 0; i--) {
        const top = sections[i].getBoundingClientRect().top + window.scrollY;
        if (anchor >= top - 8) {
          idx = i;
          break;
        }
      }
      setActiveSectionIndex(idx);
    };
    syncActiveSection();
    window.addEventListener("scroll", syncActiveSection, { passive: true });
    window.addEventListener("resize", syncActiveSection);
    return () => {
      window.removeEventListener("scroll", syncActiveSection);
      window.removeEventListener("resize", syncActiveSection);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [b, n, noticesRes, eventsRes, productCatRes, synthesisCatRes] = await Promise.all([
          api.get("/banners"),
          api.get("/products", { params: { isNew: true, limit: 8 } }),
          api.get("/notices", { params: { page: 1, limit: 20 } }),
          api.get("/events", { params: { page: 1, limit: 20 } }),
          api.get("/product-categories", { params: { scope: PRODUCT_CATEGORY_SCOPE.PRODUCTS } }),
          api.get("/product-categories", { params: { scope: PRODUCT_CATEGORY_SCOPE.SYNTHESIS } }),
        ]);
        setBanners(b.data);
        setNewItems((n.data.items || []).slice(0, 8));
        setHomeNotices(noticesRes.data?.items || []);
        setEvents((eventsRes.data?.items || []).filter((x) => isOngoingEventItem(x)));
        setProductCats((productCatRes.data?.tree || []).map((x) => x?.name).filter(Boolean).slice(0, 8));
        setSynthesisCats((synthesisCatRes.data?.tree || []).map((x) => x?.name).filter(Boolean).slice(0, 8));
      } catch {
        setBanners([]);
        setNewItems([]);
        setHomeNotices([]);
        setEvents([]);
        setProductCats([]);
        setSynthesisCats([]);
      }
    })();
  }, []);

  return (
    <div ref={homeSectionsRef} className="w-full">
      <div className="fixed right-4 top-1/2 z-[60] hidden -translate-y-1/2 md:flex md:flex-col md:items-start md:gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={`home-section-dot-${i}`}
            type="button"
            onClick={() => {
              const sections = Array.from(homeSectionsRef.current?.querySelectorAll("[data-home-section]") ?? []);
              const target = sections[i];
              if (!target) return;
              const y = target.getBoundingClientRect().top + window.scrollY;
              window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
            }}
            className="group inline-flex items-center gap-2"
            aria-label={`홈 섹션 ${i + 1}`}
            aria-current={i === activeSectionIndex ? "true" : undefined}
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full border transition-all duration-300 ${
                i === activeSectionIndex
                  ? isLightSection
                    ? "border-[#C52525] bg-[#C52525] shadow-[0_0_0_1px_rgba(197,37,37,0.2),0_0_12px_rgba(197,37,37,0.35)]"
                    : "border-white bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.25),0_0_12px_rgba(255,255,255,0.45)]"
                  : isLightSection
                  ? "border-slate-300 bg-slate-300 group-hover:border-slate-400 group-hover:bg-slate-400"
                  : "border-white/45 bg-white/35 group-hover:border-white/80 group-hover:bg-white/80"
              }`}
              aria-hidden
            />
            <span
              className={`text-[11px] font-semibold tracking-[0.12em] [text-shadow:0_1px_4px_rgba(0,0,0,0.45)] transition-colors ${
                i === activeSectionIndex
                  ? isLightSection
                    ? "text-[#C52525]"
                    : "text-white"
                  : isLightSection
                  ? "text-slate-400 group-hover:text-slate-600"
                  : "text-white/75 group-hover:text-white/95"
              }`}
            >
              {HOME_SECTION_LABELS[i]}
            </span>
          </button>
        ))}
      </div>
      <section data-home-section className="md:min-h-screen">
        <HeroCarousel slides={banners} />
      </section>

      <section data-home-section className="relative overflow-hidden md:min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(198,171,216,0.35),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(255,151,188,0.35),transparent_42%),linear-gradient(140deg,#736f8c_0%,#8e6f87_46%,#974b63_100%)]" aria-hidden />
        <div className="relative grid min-h-[520px] grid-cols-1 md:min-h-screen md:grid-cols-2">
          <Link
            href="/products"
            onMouseEnter={() => setActiveProductSplit("products")}
            onMouseLeave={() => setActiveProductSplit("")}
            className="group relative flex min-h-[260px] items-center justify-center px-6 py-10 md:min-h-screen"
          >
            <div
              className={`absolute inset-0 transition-colors duration-300 ${
                activeProductSplit === "products" ? "bg-black/12" : activeProductSplit === "synthesis" ? "bg-black/40" : "bg-black/34"
              }`}
            />
            <div className="relative z-[1] flex w-full max-w-[460px] flex-col items-center justify-center">
              <h3
                className={`text-center text-[42px] font-extrabold tracking-tight text-white drop-shadow transition-transform duration-300 md:text-[56px] ${
                  activeProductSplit === "products" ? "-translate-y-2 md:-translate-y-3" : "translate-y-0"
                }`}
              >
                Product
              </h3>
              <div
                className={`pointer-events-none absolute left-1/2 top-[63%] w-full -translate-x-1/2 p-3 transition-all duration-300 ${
                  activeProductSplit === "products" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                }`}
              >
                <ul className="grid grid-cols-1 gap-3 text-[15px] font-semibold text-white md:grid-cols-2">
                  {(productCats.length ? productCats : ["Recombinant Protein", "Assay Kit", "Antibody", "Research Biosimilar", "Enzyme", "Trending Product", "Super-Affinity Antibody"])
                    .slice(0, 8)
                    .map((name) => (
                      <li key={`product-cat-${name}`} className="rounded-lg border border-white/45 bg-white/5 px-3 py-2">
                        {name}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </Link>
          <Link
            href="/synthesis"
            onMouseEnter={() => setActiveProductSplit("synthesis")}
            onMouseLeave={() => setActiveProductSplit("")}
            className="group relative flex min-h-[260px] items-center justify-center px-6 py-10 md:min-h-screen"
          >
            <div
              className={`absolute inset-0 transition-colors duration-300 ${
                activeProductSplit === "synthesis" ? "bg-black/12" : activeProductSplit === "products" ? "bg-black/40" : "bg-black/14"
              }`}
            />
            <div className="relative z-[1] w-full max-w-[460px]">
              <h3
                className={`text-center text-[42px] font-extrabold tracking-tight text-white drop-shadow transition-transform duration-300 md:text-[56px] ${
                  activeProductSplit === "synthesis" ? "-translate-y-2 md:-translate-y-3" : "translate-y-0"
                }`}
              >
                Synthesis
              </h3>
            </div>
          </Link>
        </div>
      </section>

      <section data-home-section className="md:min-h-screen">
        <HomeNewProductCarousel items={newItems} />
      </section>

      <section data-home-section className="flex items-center bg-[#F8F8F8] md:min-h-screen">
        <HomeEventsCarousel items={events} />
      </section>

      <section data-home-section className="flex items-center bg-white md:min-h-screen">
        <div className="container mx-auto max-w-full px-4 md:max-w-[85%]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <HomeSectionTitle
              eyebrow="News"
              title={`${companyName}의`}
              description="최신 소식을 전해드립니다."
            />
            <Link href="/notices" className="text-sm font-semibold !text-[#B5122B] hover:opacity-80">
              VIEW ALL
            </Link>
          </div>
          <div data-home-inner-scroll className="news-scroll-red max-h-[396px] overflow-y-auto rounded-2xl pr-1">
            {(homeNotices || []).map((x, idx) => (
              <Link
                key={x._id}
                href={`/notices/${x._id}`}
                className="group relative mb-3 grid grid-cols-[86px_minmax(0,1fr)] items-center gap-4 rounded-xl border border-[#E5E5E5] bg-white px-5 py-5 shadow-sm transition-colors hover:bg-[#fff7fa] last:mb-0"
              >
                <span className="group/num relative text-[34px] font-bold tabular-nums text-[#B5122B]">
                  {String(idx + 1).padStart(2, "0")}
                  {x.thumbnailUrl ? (
                    <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 hidden w-[180px] -translate-y-1/2 overflow-hidden rounded-lg border border-white/70 bg-white shadow-xl md:group-hover/num:block">
                      <img src={x.thumbnailUrl} alt="" className="h-[112px] w-full object-cover" />
                    </span>
                  ) : null}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-lg font-semibold text-[#111111]">{x.title}</p>
                  <p className="mt-1 text-sm text-[#666666]">{formatPostDate(x.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/** 신상·추천(핫) 배지. 둘 다이면 NEW만 표시 */
function getProductListBadge(item) {
  if (item?.isNew) return "NEW";
  if (item?.isRecommended) return "BEST";
  return null;
}

function ProductThumbBadge({ kind }) {
  if (!kind) return null;
  const cls =
    kind === "NEW"
      ? "bg-lime-500 shadow-sm"
      : "bg-[#C52525] shadow-sm";
  return (
    <span
      className={`absolute left-2 top-2 z-10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${cls}`}
      aria-hidden
    >
      {kind}
    </span>
  );
}

function ProductGrid({ items, columns = 4, variant = "default" }) {
  const grid =
    columns === 3 ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4";
  const isCatalogCard = variant === "catalog";
  const isCatalogCenterCard = variant === "catalog-center";
  const isCatalogLike = isCatalogCard || isCatalogCenterCard;
  return (
    <div className={grid}>
      {items.map((x) => (
        <Link
          key={x._id}
          href={`/products/${x._id}`}
          className={`overflow-hidden transition-shadow ${isCatalogLike ? "group block" : "card hover:shadow-md"}`}
        >
          <div
            className={`relative bg-slate-100 flex items-center justify-center ${
              isCatalogLike ? "aspect-square h-auto overflow-hidden border border-slate-200 transition-colors hover:border-[#C52525] group-hover:border-[#C52525]" : columns === 3 ? "h-40 md:h-44" : "h-40 md:h-44"
            }`}
          >
            <ProductThumbBadge kind={getProductListBadge(x)} />
            {x.thumbnailUrl ? (
              <img src={x.thumbnailUrl} alt={x.name} className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]" />
            ) : (
              <span className="text-slate-400 text-sm">No Image</span>
            )}
          </div>
          {columns >= 3 && !isCatalogLike ? (
            <div className="bg-slate-200/90 px-3 py-2 text-sm font-semibold text-slate-800 border-t border-slate-300/60">
              {x.name}
            </div>
          ) : null}
          <div
            className={`${
              isCatalogCard
                ? `px-0 py-3 min-h-[82px] flex flex-col items-start ${x.productNumber ? "justify-end" : "justify-start"} text-left`
                : isCatalogCenterCard
                ? `px-0 py-3 min-h-[82px] flex flex-col items-center ${x.productNumber ? "justify-end" : "justify-start"} text-center`
                : `p-3 ${columns >= 3 ? "pt-2" : ""}`
            }`}
          >
            {isCatalogLike ? (
              <>
                <div className="font-semibold text-[18px] leading-snug text-slate-800 line-clamp-2">{x.name}</div>
                {typeof x.partnerId === "object" && x.partnerId?.name ? (
                  <div
                    className={`mt-0.5 line-clamp-1 text-sm ${PARTNER_NAME_EMPHASIS} ${
                      isCatalogCard ? "w-full text-left" : isCatalogCenterCard ? "w-full text-center" : ""
                    }`}
                  >
                    {x.partnerId.name}
                  </div>
                ) : null}
                {x.productNumber ? <div className="text-base text-slate-600 mt-1">{x.productNumber}</div> : null}
              </>
            ) : (
              <>
                {columns < 3 ? <div className="font-medium text-sm">{x.name}</div> : null}
                {typeof x.partnerId === "object" && x.partnerId?.name ? (
                  <div className={`text-xs mt-0.5 line-clamp-1 ${PARTNER_NAME_EMPHASIS}`}>{x.partnerId.name}</div>
                ) : null}
                <div className="text-xs text-slate-600 mt-1 line-clamp-2">{x.shortDescription}</div>
              </>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function PartnerLogoMarquee({ partners }) {
  const scrollerRef = useRef(null);
  const trackRef = useRef(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const [autoScroll, setAutoScroll] = useState(false);

  const baseItems = useMemo(() => (partners || []).filter((p) => String(p.logoUrl || "").trim()), [partners]);
  const logoItems = baseItems;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const checkOverflow = () => {
      // 4개 이하면 고정, 5개 이상이면서 실제로 넘칠 때만 자동 흐름
      setAutoScroll(baseItems.length > 4 && el.scrollWidth > el.clientWidth + 1);
      if (!(baseItems.length > 4 && el.scrollWidth > el.clientWidth + 1)) el.scrollLeft = 0;
    };
    checkOverflow();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(checkOverflow) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", checkOverflow);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, [baseItems.length]);

  useEffect(() => {
    if (!logoItems.length || !autoScroll) return undefined;

    let rafId = 0;
    let prevTs = 0;
    let running = true;

    const tick = (ts) => {
      if (!running) return;
      const el = scrollerRef.current;
      if (!el) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (!prevTs) prevTs = ts;
      const dtSec = Math.min(0.1, (ts - prevTs) / 1000);
      prevTs = ts;

      if (!isDownRef.current) {
        const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
        if (maxScroll > 1) {
          const speedPxPerSec = Math.max(22, el.scrollWidth / 90);
          el.scrollLeft += speedPxPerSec * dtSec;
          if (el.scrollLeft >= maxScroll) el.scrollLeft = 0;
          if (el.scrollLeft < 0) el.scrollLeft = maxScroll;
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    prevTs = 0;
    rafId = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [logoItems.length, autoScroll]);

  if (!baseItems.length) {
    return <div className="text-sm text-slate-500 py-6 text-center">등록된 파트너 로고가 없습니다.</div>;
  }

  const onMouseDown = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    isDownRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    startScrollLeftRef.current = el.scrollLeft;
  };

  const onMouseLeave = () => {
    isDownRef.current = false;
  };

  const onMouseMove = (e) => {
    const el = scrollerRef.current;
    if (!el || !isDownRef.current) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    el.scrollLeft = startScrollLeftRef.current - walk;
  };

  return (
    <div className="partner-marquee py-2" aria-label="공식제조사 로고 캐러셀">
      <div
        ref={scrollerRef}
        className="hide-scrollbar overflow-x-auto cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown}
        onMouseUp={() => {
          isDownRef.current = false;
        }}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
        onTouchStart={(e) => {
          const el = scrollerRef.current;
          if (!el) return;
          isDownRef.current = true;
          startXRef.current = e.touches[0].pageX - el.offsetLeft;
          startScrollLeftRef.current = el.scrollLeft;
        }}
        onTouchEnd={() => {
          isDownRef.current = false;
        }}
        onTouchMove={(e) => {
          const el = scrollerRef.current;
          if (!el || !isDownRef.current) return;
          const x = e.touches[0].pageX - el.offsetLeft;
          const walk = (x - startXRef.current) * 1.1;
          el.scrollLeft = startScrollLeftRef.current - walk;
        }}
      >
        <div ref={trackRef} className="partner-marquee-track">
          {logoItems.map((p, idx) => (
            <Link
              key={`${p._id || p.name}-${idx}`}
              href={p._id ? `/partner/${p._id}` : "/partners"}
              className="partner-marquee-item"
              draggable={false}
            >
              <img
                src={p.logoUrl}
                alt={p.name}
                className="max-h-full max-w-full object-contain"
                draggable={false}
                loading="eager"
                decoding="async"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function findCategoryLabelPath(tree, id, prefix = "") {
  if (!id || !tree?.length) return "";
  for (const n of tree) {
    const step = prefix ? `${prefix} › ${n.name}` : n.name;
    if (String(n._id) === String(id)) return step;
    if (n.children?.length) {
      const inner = findCategoryLabelPath(n.children, id, step);
      if (inner) return inner;
    }
  }
  return "";
}

/** 루트→해당 노드 경로 (1차= [0], 2차= [1] …) */
function findCategoryPathFromTree(tree, id) {
  if (!id || !tree?.length) return null;
  function walk(nodes) {
    for (const n of nodes) {
      if (String(n._id) === String(id)) return [n];
      if (n.children?.length) {
        const sub = walk(n.children);
        if (sub) return [n, ...sub];
      }
    }
    return null;
  }
  return walk(tree);
}

function detectHotNewCategoryFlags(pathNodes) {
  const leafName = String(pathNodes?.[pathNodes.length - 1]?.name || "").trim();
  if (!leafName) return { hot: false, fresh: false };
  const upper = leafName.toUpperCase();
  const hot = /\b(HOT|BEST)\b/.test(upper) || leafName.includes("추천");
  const fresh = /\bNEW\b/.test(upper) || leafName.includes("신상") || leafName.includes("신상품");
  return { hot, fresh };
}

function ProductCatalogPage({ businessType = "MANUFACTURER" }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const setSp = useCallback(
    (next, opts) => {
      const qs = typeof next === "string" ? next.replace(/^\?/, "") : next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (opts?.replace) router.replace(url);
      else router.push(url);
    },
    [pathname, router]
  );
  const categoryId = sp.get("categoryId") || "";
  const urlSearch = sp.get("search") || "";
  const searchScope = sp.get("scope") || "";
  const isSynthesis = businessType === "SYNTHESIS";
  const isRecommendedFilter = sp.get("isRecommended") === "true";
  const isNewFilter = sp.get("isNew") === "true";
  const [search, setSearch] = useState(urlSearch);
  const [items, setItems] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    api
      .get("/product-categories", {
        params: { scope: isSynthesis ? PRODUCT_CATEGORY_SCOPE.SYNTHESIS : PRODUCT_CATEGORY_SCOPE.PRODUCTS },
      })
      .then((r) => setTree(r.data?.tree || []))
      .catch(() => setTree([]));
  }, [isSynthesis]);

  const path = categoryId ? findCategoryPathFromTree(tree, categoryId) : null;
  const hotNewByCategory = detectHotNewCategoryFlags(path);
  const effectiveIsRecommendedFilter = isRecommendedFilter || (!isSynthesis && hotNewByCategory.hot);
  const effectiveIsNewFilter = isNewFilter || (!isSynthesis && hotNewByCategory.fresh);
  const bypassCategoryIdFilter = !isSynthesis && Boolean(categoryId) && (hotNewByCategory.hot || hotNewByCategory.fresh);

  useEffect(() => {
    setLoading(true);
    const isCatalogWideSearch = searchScope === "catalog" && Boolean(urlSearch.trim());
    api
      .get("/products", {
        params: {
          ...(isCatalogWideSearch ? {} : { category: businessType }),
          ...(isCatalogWideSearch || bypassCategoryIdFilter ? {} : { categoryId: categoryId || undefined }),
          search: search.trim() || undefined,
          limit: 48,
          ...(effectiveIsRecommendedFilter ? { isRecommended: true } : {}),
          ...(effectiveIsNewFilter ? { isNew: true } : {}),
        },
      })
      .then((r) => setItems(r.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [businessType, bypassCategoryIdFilter, categoryId, effectiveIsNewFilter, effectiveIsRecommendedFilter, search, searchScope, urlSearch]);

  const l1Node = path?.[0] || null;
  const secondLevel = l1Node?.children?.length ? l1Node.children : [];
  const catLabel = categoryId ? findCategoryLabelPath(tree, categoryId) : "";

  const pageTitle = isSynthesis ? "합성서비스" : "제품소개";
  const pageSubtitle = "";
  const pagePath = isSynthesis ? "/synthesis" : "/products";
  const isCatalogWideSearch = searchScope === "catalog" && Boolean(urlSearch.trim());
  const hasCatalogSearchResults = isCatalogWideSearch && items.length > 0;
  const listTitleFromHomeFilter =
    !isSynthesis && effectiveIsRecommendedFilter && !effectiveIsNewFilter
      ? "추천제품"
      : !isSynthesis && effectiveIsNewFilter && !effectiveIsRecommendedFilter
      ? "신상품"
      : !isSynthesis && effectiveIsRecommendedFilter && effectiveIsNewFilter
      ? "추천 · 신상품"
      : null;
  const listSubtitleFromHomeFilter =
    listTitleFromHomeFilter === "추천제품"
      ? "추천으로 지정된 제품을 모두 확인하실 수 있습니다."
      : listTitleFromHomeFilter === "신상품"
      ? "신상으로 지정된 제품을 모두 확인하실 수 있습니다."
      : listTitleFromHomeFilter === "추천 · 신상품"
      ? "추천·신상으로 지정된 제품을 모두 확인하실 수 있습니다."
      : null;

  const setCategoryParams = (nextCatId) => {
    const next = new URLSearchParams(sp.toString());
    next.delete("scope");
    if (nextCatId) next.set("categoryId", nextCatId);
    else next.delete("categoryId");
    if (search.trim()) next.set("search", search.trim());
    else next.delete("search");
    setSp(next, { replace: true });
  };

  const applySearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(sp.toString());
    if (search.trim()) next.set("search", search.trim());
    else next.delete("search");
    if (categoryId) next.set("categoryId", categoryId);
    else next.delete("categoryId");
    setSp(next, { replace: true });
  };

  const isL1ScopeOnly = Boolean(path && path.length === 1);
  const showSecondaryAside = Boolean(l1Node && secondLevel.length > 0);

  const linkWithSearch = (catId) => {
    const p = new URLSearchParams();
    if (catId) p.set("categoryId", String(catId));
    if (search.trim()) p.set("search", search.trim());
    const qs = p.toString();
    return qs ? `${pagePath}?${qs}` : pagePath;
  };

  const productL1SubMenus = [
    { to: linkWithSearch(""), label: "전체" },
    ...(tree || []).map((n) => ({
      to: linkWithSearch(n._id),
      label: n.name,
    })),
  ];

  const subMenuIsActive = (menu) => {
    try {
      const u = new URL(menu.to, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      const m = u.searchParams.get("categoryId") || "";
      return m === (categoryId || "");
    } catch {
      return false;
    }
  };

  const heroEyebrow = isSynthesis ? "SYNTHESIS SERVICES" : "PRODUCTS";
  const heroTitle = hasCatalogSearchResults ? "제품 검색" : catLabel || listTitleFromHomeFilter || pageTitle;
  const heroSubtitle = hasCatalogSearchResults
    ? `제품/합성서비스 검색 결과 (${items.length}건)`
    : catLabel
    ? pageSubtitle
    : listSubtitleFromHomeFilter || pageSubtitle;

  return (
    <>
      <SitePageHeroBanner
        eyebrow={heroEyebrow}
        breadcrumb={
          <PageBreadcrumb
            className="!mt-0"
            segments={[
              { label: "제품 안내" },
              { to: "/products", label: hasCatalogSearchResults ? "제품 검색" : pageTitle },
              ...(catLabel ? [{ label: catLabel }] : []),
            ]}
            subMenus={hasCatalogSearchResults ? [] : productL1SubMenus}
            subMenuAnchorIndex={1}
            subMenuIsActive={subMenuIsActive}
          />
        }
        title={heroTitle}
        subtitle={heroSubtitle}
      />
      <div className="w-full py-6 md:py-8">
      <div className="relative mt-6 md:mt-8 w-full">
        <div className="space-y-4">
          <form onSubmit={applySearch} className="flex w-full items-center justify-between gap-3">
            <p className="text-slate-600 text-sm shrink-0">전체 : {items.length}</p>
            <div className="w-full max-w-[420px]">
              <label htmlFor={`product-search-${businessType}`} className="sr-only">
                제품 검색
              </label>
              <div className="relative">
                <input
                  id={`product-search-${businessType}`}
                  className="h-10 w-full rounded-full border border-[#C52525] pl-4 pr-11 text-sm"
                  placeholder="제품명 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 px-3 inline-flex items-center text-slate-500 hover:text-slate-700 cursor-pointer"
                  aria-label="검색"
                  title="검색"
                >
                  <IconSearch className="w-5 h-5" />
                </button>
              </div>
            </div>
          </form>
          {loading ? <p className="text-slate-500 py-8">불러오는 중…</p> : <ProductGrid items={items} variant="catalog" />}
          {!loading && items.length === 0 ? <p className="text-center text-slate-500 py-8">표시할 제품이 없습니다.</p> : null}
        </div>
        {showSecondaryAside ? (
          <div
            className="mt-6 w-full border-t border-slate-200 pt-4 lg:absolute lg:left-0 lg:top-0 lg:z-10 lg:mt-0 lg:w-44 lg:-translate-x-[calc(100%+1rem)] lg:border-0 lg:pt-0"
            aria-label="2차 분류"
          >
            <div className="lg:sticky lg:top-28">
              <nav className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryParams(String(l1Node._id))}
                  className={`text-left text-sm py-0.5 bg-transparent border-0 cursor-pointer ${
                    isL1ScopeOnly ? "font-semibold text-black" : "text-black font-normal hover:underline"
                  }`}
                >
                  {l1Node.name} 전체
                </button>
                {secondLevel.map((c) => {
                  const isActive =
                    String(categoryId) === String(c._id) ||
                    (path && path.length >= 2 && String(path[1]._id) === String(c._id));
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => setCategoryParams(String(c._id))}
                      className={`text-left text-sm py-0.5 bg-transparent border-0 cursor-pointer ${
                        isActive ? "font-semibold text-black" : "text-black font-normal hover:underline"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        ) : null}
      </div>
    </div>
    </>
  );
}

function CustomerSupportStaticPage({ title, subtitle, body }) {
  return (
    <>
      <SitePageHeroBanner
        eyebrow="CUSTOMER SUPPORT"
        breadcrumb={<PageBreadcrumb className="!mt-0" segments={[{ label: "고객지원" }, { label: title }]} subMenus={CUSTOMER_SUPPORT_SUB} />}
        title={title}
        subtitle={subtitle}
      />
      <div className="w-full py-6 md:py-8">
        <article className="mt-8 card p-6 md:p-8 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{body}</article>
      </div>
    </>
  );
}

function CompanyAboutPage() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const targets = Array.from(root.querySelectorAll("[data-about-reveal]"));
    if (!targets.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="company-about-page bg-[#f8fafc] pt-1 pb-8 md:pt-2 md:pb-10 lg:pt-2 lg:pb-12">
      <div className="company-about-page__bg" aria-hidden />
      <div className="company-about-page__veil" aria-hidden />
      <div ref={rootRef} className="relative z-0 container mx-auto max-w-full md:max-w-[85%] px-4">
        <div className="max-w-4xl text-left">
          <div className="mb-3 md:mb-4">
            <PageBreadcrumb segments={[{ label: "고객지원" }, { label: "회사소개" }]} subMenus={CUSTOMER_SUPPORT_SUB} className="!mt-0" />
          </div>
          <section className="min-h-[46vh] md:min-h-[52vh] flex flex-col justify-center">
            <p data-about-reveal className="about-fade-up text-center mb-8 md:mb-10 text-[13px] md:text-sm font-medium tracking-wide text-[#002D5E]">
              Customer Satisfaction <span className="mx-1.5 font-light text-slate-300">|</span> Value Creation{" "}
              <span className="mx-1.5 font-light text-slate-300">|</span> Trust
            </p>

            <header data-about-reveal className="about-fade-up text-center">
              <h1 className="text-4xl md:text-5xl lg:text-[3.7rem] font-bold leading-[1.15] tracking-tight text-slate-900">
                고객중심, 가치창출, 신뢰
              </h1>
              <p className="mt-6 text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
                최고의 고객만족과 글로벌 네트워크를 바탕으로
                <br className="hidden sm:block" /> 연구 현장에 필요한 더 큰 새로운 가치를 전합니다.
              </p>
            </header>
          </section>

          <div className="mt-6 md:mt-8 space-y-10 text-[18px] md:text-[19px] leading-[1.85] text-slate-600">
            <div data-about-reveal className="about-fade-up space-y-5">
              <p>
                하이미바이오메드는 생명과학 분야의 시약·화학물질 조달, 커스텀 시약 합성, 그리고 글로벌 무역을 하나의 흐름으로 연결하는 전문 기업입니다.
                브랜드 &quot;<b>Hi, ME</b>&quot;(하이미)에는 나와 당신, 연구자와 산업이 서로 가깝게 만난다는 뜻을 담았습니다.
              </p>
              <p>
                국내외 공식 제조사 및 파트너와 협력하여 연구기관·제약·바이오 기업이 필요로 하는 시약과 소재를 신속하고 안전하게 공급합니다.
                견적문의를 통해 품목·수량·납기를 안내하며, 품질과 거래의 투명성을 최우선으로 합니다.
              </p>
              <p>
                취급·소개 품목으로는 연구용 시약, 항체·단백질 관련 제품, 세포 실험 관련 자료, 분자생물학 시약, 각종 Assay·검출 키트 등 생명과학 연구에 널리 쓰이는 품목을 다루며,
                고객의 연구 목적에 맞는 조달과 기술 지원을 이어가겠습니다.
              </p>
              <p className="text-slate-800 font-medium pt-1">하이미바이오메드</p>
            </div>

            <div data-about-reveal className="about-fade-up space-y-5 border-t border-slate-200 pt-10 pb-40">
              <p>
                Haime Biomed Co., Ltd. specializes in connecting life science reagents and chemical procurement, custom synthesis, and global trade in one streamlined
                service. Our &quot;<b>Hi, ME</b>&quot; brand reflects our belief in bringing researchers and industry closer together.
              </p>
              <p>
              We work with official manufacturers and trusted global partners to supply research institutions and biopharma companies with reliable materials in a timely manner.
              With a focus on quality, transparency, and clear communication, we support customers from product inquiry to delivery planning.              </p>
              <p>
                Our portfolio spans research reagents, antibody- and protein-related products, cell culture materials, molecular biology reagents, and widely used assay
                and detection kits—supporting procurement and technical coordination aligned with each customer&apos;s research goals.
              </p>
              <p className="text-slate-800 font-medium">HiME Biomed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderGuidePage() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/partners")
      .then((r) => setPartners(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, []);

  const hasOrderGuideContent = (html) => {
    const s = String(html || "").trim();
    if (!s) return false;
    const text = s.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim();
    if (text.length > 0) return true;
    return /<img\s/i.test(s);
  };
  const withGuide = partners.filter((p) => hasOrderGuideContent(p.orderGuideHtml));

  const intro = `1. 제품소개 또는 공식제조사 메뉴에서 품목을 확인합니다.
2. 제품 상세 페이지에서 견적문의를 요청하거나, 견적문의 메뉴에서 일괄 문의를 남깁니다.
3. 담당자 확인 후 이메일 또는 유선으로 연락드립니다.

※ 납기·가격은 품목·수량에 따라 달라질 수 있습니다.`;

  return (
    <>
      <SitePageHeroBanner
        eyebrow="ORDER GUIDE"
        breadcrumb={<PageBreadcrumb className="!mt-0" segments={[{ label: "고객지원" }, { label: "주문가이드" }]} subMenus={CUSTOMER_SUPPORT_SUB} />}
        title="주문가이드"
        subtitle="주문 절차 및 유의사항입니다. 제조사별 주의·요구사항·납기 등은 관리자에서 등록한 내용이 아래에 표시됩니다."
      />
      <div className="w-full py-6 md:py-8">
      <article className="mt-8 card p-6 md:p-8 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{intro}</article>
      {loading ? <p className="mt-6 text-slate-500 text-sm">불러오는 중…</p> : null}
      {!loading && withGuide.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          등록된 제조사별 주문 안내가 없습니다. 관리자 &gt; 제조사 관리에서 &quot;주문가이드 안내&quot;를 입력할 수 있습니다.
        </p>
      ) : null}
      <div className="mt-8 space-y-8">
        {withGuide.map((p) => (
          <section key={p._id} className="card p-6 md:p-8">
            <h2 className={`text-lg border-b border-slate-200 pb-2 mb-4 ${PARTNER_NAME_EMPHASIS}`}>{p.name}</h2>
            <div
              className="text-slate-700 text-sm leading-7 [&_img]:max-w-full [&_img]:h-auto prose prose-slate max-w-none"
              dangerouslySetInnerHTML={{ __html: p.orderGuideHtml }}
            />
          </section>
        ))}
      </div>
    </div>
    </>
  );
}

/** 본사 위치 (위도, 경도). 미설정 시 기본값 — `NEXT_PUBLIC_KAKAO_MAP_LAT` / `NEXT_PUBLIC_KAKAO_MAP_LNG` */
const DEFAULT_KAKAO_MAP_LAT = 37.57486436940351;
const DEFAULT_KAKAO_MAP_LNG = 127.0660243607457;

function getDirectionsMapCenter() {
  const latParsed = Number.parseFloat(String(process.env.NEXT_PUBLIC_KAKAO_MAP_LAT ?? "").trim());
  const lngParsed = Number.parseFloat(String(process.env.NEXT_PUBLIC_KAKAO_MAP_LNG ?? "").trim());
  return {
    lat: Number.isFinite(latParsed) ? latParsed : DEFAULT_KAKAO_MAP_LAT,
    lng: Number.isFinite(lngParsed) ? lngParsed : DEFAULT_KAKAO_MAP_LNG,
  };
}

function escapeHtmlForMap(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function KakaoMapEmbed({ placeName = "" }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const mapContainer = containerRef.current;
    if (!mapContainer) return undefined;

    const appKey = (process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY || "").trim();
    if (!appKey) {
      mapContainer.innerHTML = "";
      const hint = document.createElement("div");
      hint.className =
        "flex h-full min-h-[200px] items-center justify-center p-4 text-center text-sm text-slate-600";
      hint.textContent =
        "카카오맵을 쓰려면 client/.env.local 등에 NEXT_PUBLIC_KAKAO_MAP_APP_KEY(자바스크립트 키)를 넣고 개발 서버를 다시 실행하세요.";
      mapContainer.appendChild(hint);
      return undefined;
    }

    let cancelled = false;
    let timerId;

    const initMapInsideLoad = () => {
      if (cancelled || !mapContainer) return;
      const { kakao } = window;
      mapContainer.innerHTML = "";

      const { lat, lng } = getDirectionsMapCenter();
      const mapOption = {
        center: new kakao.maps.LatLng(lat, lng),
        level: 3,
      };
      const map = new kakao.maps.Map(mapContainer, mapOption);

      const markerPosition = new kakao.maps.LatLng(lat, lng);
      const marker = new kakao.maps.Marker({ position: markerPosition });
      marker.setMap(map);

      const label = (placeName && placeName.trim()) || "오시는길";
      const mapUrl = `https://map.kakao.com/link/map/${encodeURIComponent(label)},${lat},${lng}`;
      const routeUrl = `https://map.kakao.com/link/to/${encodeURIComponent(label)},${lat},${lng}`;
      const titleHtml = escapeHtmlForMap(label);
      const iwContent = `<div style="padding:5px;font-size:12px;line-height:1.45;min-width:140px;">${titleHtml}<br><a href="${mapUrl}" style="color:#2563eb" target="_blank" rel="noreferrer">큰지도보기</a> <a href="${routeUrl}" style="color:#2563eb" target="_blank" rel="noreferrer">길찾기</a></div>`;

      const infowindow = new kakao.maps.InfoWindow({
        position: markerPosition,
        content: iwContent,
      });
      infowindow.open(map, marker);
    };

    let attempts = 0;
    const waitScriptThenLoad = () => {
      if (cancelled) return;
      const loadFn = window.kakao?.maps?.load;
      if (typeof loadFn === "function") {
        loadFn(() => {
          if (cancelled || !mapContainer) return;
          initMapInsideLoad();
        });
        return;
      }
      attempts += 1;
      if (attempts > 400) {
        mapContainer.innerHTML = "";
        const err = document.createElement("div");
        err.className =
          "flex h-full min-h-[200px] items-center justify-center p-4 text-center text-sm text-slate-600";
        err.textContent =
          "카카오맵 SDK를 불러오지 못했습니다. 앱 키·웹 도메인(플랫폼) 설정을 카카오 개발자 콘솔에서 확인하세요.";
        mapContainer.appendChild(err);
        return;
      }
      timerId = window.setTimeout(waitScriptThenLoad, 50);
    };
    waitScriptThenLoad();

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
      mapContainer.innerHTML = "";
    };
  }, [placeName]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[min(70vw,420px)] min-h-[280px] rounded-lg border border-slate-200 bg-slate-100 overflow-hidden"
      role="presentation"
      aria-label="약도"
    />
  );
}

function DirectionsIconPhone({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 6.5c.5 7.5 5.5 12.5 13 13l2-3.5-3-2-2.5 1.5a9.2 9.2 0 0 1-5.5-5.5L10.5 8 8.5 5l-4 1.5z"
      />
    </svg>
  );
}

function DirectionsIconFax({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path strokeLinecap="round" d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

function DirectionsIconMail({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
    </svg>
  );
}

/** 푸터와 동일 출처: GET /site-settings (companyName, address, tel, fax, email) */
function DirectionsSiteContact({ site }) {
  const addrRaw = site?.address?.trim() || "";
  const addrParts = addrRaw ? addrRaw.split(/\n+/).map((l) => l.trim()).filter(Boolean) : [];
  const addrMain = addrParts[0] || "";
  const addrExtra = addrParts.slice(1);
  const emailLines = site?.email?.trim() ? site.email.trim().split(/\n+/).map((l) => l.trim()).filter(Boolean) : [];

  const firstEmail = (line) => {
    const m = line.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
    return m ? m[0] : null;
  };

  const hasContact =
    site &&
    (site.companyName ||
      addrRaw ||
      site.tel ||
      site.fax ||
      site.email);

  if (!site) {
    return (
      <div className="mt-8 rounded-lg border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
        연락처 정보를 불러오는 중입니다…
      </div>
    );
  }

  if (!hasContact) {
    return (
      <div className="mt-8 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
        관리자 &gt; 기본 설정 &gt; 푸터/회사 정보에 주소·전화 등을 입력하면 이곳에도 동일하게 표시됩니다.
      </div>
    );
  }

  return (
    <section
      className="mt-8 rounded-lg border border-slate-200 bg-white px-5 py-6 md:px-8 md:py-8 text-left"
      aria-labelledby="directions-contact-heading"
    >
      <h2 id="directions-contact-heading" className="sr-only">
        연락처
      </h2>
      {site.companyName ? (
        <p className="text-lg font-bold text-[#002D5E] tracking-tight mb-4">{site.companyName}</p>
      ) : null}

      {addrMain ? (
        <div className="space-y-1 pb-4 border-b border-slate-200">
          <p className="text-sm text-slate-800 leading-relaxed">{addrMain}</p>
          {addrExtra.map((line, i) => (
            <p key={i} className="text-xs text-slate-500 leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div className="divide-y divide-slate-200">
        {site.tel ? (
          <div className="flex items-start gap-3 py-3.5">
            <DirectionsIconPhone className="w-5 h-5 shrink-0 text-[#C52525] mt-0.5" />
            <span className="w-14 shrink-0 text-sm font-semibold text-slate-700 pt-0.5">TEL</span>
            <a href={`tel:${site.tel.replace(/\s/g, "")}`} className="text-sm text-slate-800 hover:text-[#002D5E] pt-0.5">
              {site.tel}
            </a>
          </div>
        ) : null}
        {site.fax ? (
          <div className="flex items-start gap-3 py-3.5">
            <DirectionsIconFax className="w-5 h-5 shrink-0 text-[#C52525] mt-0.5" />
            <span className="w-14 shrink-0 text-sm font-semibold text-slate-700 pt-0.5">FAX</span>
            <span className="text-sm text-slate-800 pt-0.5">{site.fax}</span>
          </div>
        ) : null}
        {emailLines.length > 0 ? (
          <div className="flex items-start gap-3 py-3.5">
            <DirectionsIconMail className="w-5 h-5 shrink-0 text-[#C52525] mt-0.5" />
            <span className="w-14 shrink-0 text-sm font-semibold text-slate-700 pt-0.5">E-mail</span>
            <ul className="text-sm text-slate-800 space-y-1.5 pt-0.5 min-w-0 flex-1">
              {emailLines.map((line, i) => {
                const em = firstEmail(line);
                return (
                  <li key={`${i}-${line}`}>
                    {em ? (
                      <a href={`mailto:${em}`} className="text-[#002D5E] underline hover:text-[#001a3d] break-all">
                        {line}
                      </a>
                    ) : (
                      <span className="break-all">{line}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DirectionsPage() {
  const [site, setSite] = useState(null);

  useEffect(() => {
    api
      .get("/site-settings")
      .then((r) => setSite(r.data))
      .catch(() => setSite(null));
  }, []);

  return (
    <>
      <SitePageHeroBanner
        eyebrow="LOCATION"
        breadcrumb={<PageBreadcrumb className="!mt-0" segments={[{ label: "고객지원" }, { label: "오시는길" }]} subMenus={CUSTOMER_SUPPORT_SUB} />}
        title="오시는길"
        subtitle={null}
      />
      <div className="w-full py-6 md:py-8">
      <div className="mt-8 space-y-0">
        <section aria-labelledby="directions-map-heading">
          <h2 id="directions-map-heading" className="text-base font-semibold text-slate-900 mb-3">
            위치 안내
          </h2>
          <KakaoMapEmbed placeName={site?.companyName || ""} />
        </section>
        <DirectionsSiteContact site={site} />
      </div>
    </div>
    </>
  );
}

function PartnersPage({ type }) {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(urlSearch);
  const [items, setItems] = useState([]);
  const showSearch = type === "SYNTHESIS";

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    api
      .get("/partners", { params: { type, search } })
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, [type, search]);

  const partnersEyebrow = type === "SYNTHESIS" ? "SYNTHESIS SERVICES" : "OFFICIAL PARTNERS";

  return (
    <>
      <SitePageHeroBanner
        eyebrow={partnersEyebrow}
        breadcrumb={
          <PageBreadcrumb
            className="!mt-0"
            segments={[
              { label: "제품 안내" },
              { label: type === "SYNTHESIS" ? "합성서비스" : "공식 제조사" },
            ]}
          />
        }
        title={type === "SYNTHESIS" ? "합성서비스" : "공식 제조사"}
        subtitle={
          type === "SYNTHESIS"
            ? "맞춤 합성 및 관련 서비스 파트너를 검색한 뒤, 제품·서비스를 탐색해 보세요."
            : "검증된 공식 제조사를 검색한 뒤, 제조사별 제품 카탈로그로 이동할 수 있습니다."
        }
      />
      <div className="w-full py-6 md:py-8">
      <div className="mt-6 md:mt-8">
      {showSearch ? (
        <div className="mb-4 flex justify-center">
          <input
            className={PAGE_SEARCH_INPUT_CLASS}
            placeholder="제조사 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      ) : null}
      <div className={type === "SYNTHESIS" ? "grid md:grid-cols-3 gap-3" : "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4"}>
        {items.map((p) => (
          <Link
            key={p._id}
            href={`/partner/${p._id}`}
            className={`group overflow-hidden transition-shadow ${
              type === "SYNTHESIS"
                ? "card p-4"
                : "block border border-slate-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors group-hover:border-[#C52525] hover:shadow-[0_3px_10px_rgba(0,0,0,0.06)]"
            }`}
          >
            {type !== "SYNTHESIS" ? (
              <div className="aspect-square flex items-center justify-center overflow-hidden bg-white border-b border-slate-100">
                {p.logoUrl ? (
                  <img
                    src={p.logoUrl}
                    alt={p.name}
                    className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.05]"
                  />
                ) : (
                  <span className="text-xs text-slate-400">이미지 없음</span>
                )}
              </div>
            ) : null}
            <div className={type !== "SYNTHESIS" ? "px-4 py-3" : ""}>
              <div
                className={`${PARTNER_NAME_EMPHASIS} line-clamp-2 ${
                  type !== "SYNTHESIS" ? "text-sm md:text-[15px]" : "text-base md:text-[17px]"
                }`}
              >
                {p.name}
              </div>
              <div className={`text-slate-500 ${type === "SYNTHESIS" ? "text-sm" : "text-xs md:text-sm line-clamp-2 mt-0.5"}`}>{p.description}</div>
            </div>
          </Link>
        ))}
      </div>
      </div>
    </div>
    </>
  );
}

function PartnerProducts() {
  const { partnerId } = useParams();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState("");
  const [partnerListPath, setPartnerListPath] = useState("/partners");
  const [partnerListLabel, setPartnerListLabel] = useState("공식 제조사");

  useEffect(() => {
    setLoading(true);
    api
      .get("/products", { params: { partnerId, search, limit: 40 } })
      .then((r) => setItems(r.data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [partnerId, search]);

  useEffect(() => {
    api
      .get("/products", { params: { partnerId, limit: 1 } })
      .then((r) => {
        const p = r.data.items?.[0]?.partnerId;
        setPartnerName(typeof p === "object" && p?.name ? p.name : "");
        if (typeof p === "object" && p?.type === "SYNTHESIS") {
          setPartnerListPath("/synthesis");
          setPartnerListLabel("합성서비스");
        } else {
          setPartnerListPath("/partners");
          setPartnerListLabel("공식 제조사");
        }
      })
      .catch(() => {
        setPartnerName("");
        setPartnerListPath("/partners");
        setPartnerListLabel("공식 제조사");
      });
  }, [partnerId]);

  const partnerProductsTitle =
    partnerName != null && String(partnerName).trim() ? (
      <>
        <span className={PARTNER_NAME_EMPHASIS}>{partnerName}</span>
        <span className="text-slate-900"> 제품</span>
      </>
    ) : (
      "제조사별 제품"
    );

  return (
    <>
      <SitePageHeroBanner
        eyebrow="PRODUCT CATALOG"
        breadcrumb={
          <PageBreadcrumb
            className="!mt-0"
            segments={[
              { to: partnerListPath, label: partnerListLabel },
              { label: partnerProductsTitle },
            ]}
          />
        }
        title={partnerProductsTitle}
        subtitle="제품명으로 검색한 뒤 상세 페이지에서 견적문의를 진행할 수 있습니다."
      />
      <div className="w-full py-6 md:py-8">
        <div className="mt-6 md:mt-8 w-full">
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              className="flex w-full items-center justify-between gap-3"
            >
              <p className="text-sm text-slate-600 shrink-0">전체 : {items.length}</p>
              <div className="w-full max-w-[420px]">
                <label htmlFor="partner-product-search" className="sr-only">
                  제품 검색
                </label>
                <div className="relative">
                  <input
                    id="partner-product-search"
                    className="h-10 w-full rounded-full border border-[#C52525] pl-4 pr-11 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="제품명 검색"
                  />
                  <button
                    type="submit"
                    className="absolute inset-y-0 right-0 inline-flex cursor-pointer items-center px-3 text-slate-500 hover:text-slate-700"
                    aria-label="검색"
                    title="검색"
                  >
                    <IconSearch className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>
            {loading ? <p className="py-8 text-slate-500">불러오는 중…</p> : <ProductGrid items={items} variant="catalog" />}
            {!loading && items.length === 0 ? <p className="py-8 text-center text-slate-500">표시할 제품이 없습니다.</p> : null}
          </div>
        </div>
      </div>
    </>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [qty, setQty] = useState(1);
  const [recommendedItems, setRecommendedItems] = useState([]);

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => setItem(r.data));
  }, [id]);

  useEffect(() => {
    if (!item?._id) return;
    api
      .get("/products", {
        params: {
          isRecommended: true,
          category: item.category,
          limit: 24,
        },
      })
      .then((r) => {
        const rows = Array.isArray(r.data?.items) ? r.data.items : [];
        setRecommendedItems(rows.filter((x) => String(x._id) !== String(item._id)));
      })
      .catch(() => setRecommendedItems([]));
  }, [item?._id, item?.category]);

  if (!item) return (
    <div className="w-full py-8">
      <div className={PRODUCT_DETAIL_CONTENT_INNER}>Loading...</div>
    </div>
  );

  const crumbTitle = item.name && item.name.length > 36 ? `${item.name.slice(0, 36)}…` : item.name;
  const inquiryLink = `/inquiry?productId=${item._id}&productName=${encodeURIComponent(item.name)}&catalogNumber=${encodeURIComponent(
    item.productNumber || ""
  )}&quantity=${encodeURIComponent(String(qty))}`;

  const isSynthesisProduct = item.category === "SYNTHESIS";
  const pageTitle = isSynthesisProduct ? "합성서비스" : "제품소개";
  const pagePath = isSynthesisProduct ? "/synthesis" : "/products";
  const pageSubtitle ="";
  const heroEyebrow = isSynthesisProduct ? "SYNTHESIS SERVICES" : "PRODUCTS";

  return (
    <>
      <SitePageHeroBanner
        eyebrow={heroEyebrow}
        breadcrumb={
          <PageBreadcrumb
            className="!mt-0"
            segments={[{ label: "제품 안내" }, { to: pagePath, label: pageTitle }, { label: crumbTitle }]}
          />
        }
        title={pageTitle}
        subtitle={pageSubtitle}
      />
      <div className="w-full bg-white">
      <div className="mt-6 md:mt-8">
        <article className="space-y-0">
          <section className="w-full bg-white">
            <div className={`${PRODUCT_DETAIL_CONTENT_INNER} pb-8`}>
              <div className="grid gap-8 md:gap-12 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
                <div className="relative mx-auto w-full max-w-[420px] rounded border border-slate-100 bg-slate-50 p-2 md:p-3">
                  <ProductThumbBadge kind={getProductListBadge(item)} />
                  {item.imageUrl || item.thumbnailUrl ? (
                    <img
                      src={item.imageUrl || item.thumbnailUrl}
                      alt={item.name}
                      className="mx-auto block h-auto w-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex min-h-[200px] w-full items-center justify-center text-sm text-slate-400">이미지 없음</div>
                  )}
                </div>
                <div className="flex flex-col gap-3 justify-center">
                  <h2 className={`text-left leading-tight ${PRODUCT_DETAIL_NAME_SIZE_CLASS} ${PRODUCT_DETAIL_TITLE_CLASS}`}>{item.name}</h2>
                  <p className="text-sm text-slate-600">제품 코드: {item.productNumber || "-"}</p>
                  {typeof item.partnerId === "object" && item.partnerId?.name ? (
                    <p className="text-sm text-slate-600">
                      제조사: <span className={PARTNER_NAME_EMPHASIS}>{item.partnerId.name}</span>
                    </p>
                  ) : null}
                  <p className={`${PRODUCT_DETAIL_INTRO_SIZE_CLASS} text-slate-600 leading-7`}>
                    {item.shortDescription || item.description || "제품 설명이 없습니다."}
                  </p>
                  <div className="site-no-print flex flex-wrap items-center gap-2 pt-1">
                    <button type="button" className="inline-flex items-center border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm hover:bg-slate-50" onClick={() => window.print()}>
                      프린트
                    </button>
                    <Link href={inquiryLink} className="inline-flex items-center border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm hover:bg-slate-50">
                      제품 문의
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="w-full bg-white">
            {htmlFieldHasContent(item.contentHtml) ? (
              <div className="w-full bg-white py-6 md:py-8">
                <div className={`${PRODUCT_DETAIL_CONTENT_INNER} space-y-4`}>
                  <h3 className={PRODUCT_DETAIL_SECTION_HEAD_CLASS}>상세보기</h3>
                  <div className={`${PRODUCT_DETAIL_BODY_CLASS} text-slate-700`} dangerouslySetInnerHTML={{ __html: item.contentHtml }} />
                  {item.specification ? (
                    <pre className="mt-4 whitespace-pre-wrap border-l-2 border-slate-300/80 py-1 pl-4 text-sm leading-7 text-slate-800">{item.specification}</pre>
                  ) : null}
                  {item.category2Path?.length ? (
                    <p className="mt-3 text-sm text-slate-500">분류2: {item.category2Path.join(" › ")}</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className={`${PRODUCT_DETAIL_CONTENT_INNER} space-y-4 bg-white pt-8`}>
                <h3 className={PRODUCT_DETAIL_SECTION_HEAD_CLASS}>상세보기</h3>
                <p className="text-sm leading-7 text-slate-600">{item.description || "상세 정보가 없습니다."}</p>
                {item.specification ? (
                  <pre className="whitespace-pre-wrap border-l-2 border-slate-200 py-1 pl-4 text-sm leading-7 text-slate-800">{item.specification}</pre>
                ) : null}
                {item.category2Path?.length ? <p className="text-sm text-slate-500">분류2: {item.category2Path.join(" › ")}</p> : null}
              </div>
            )}
          </section>

          <ProductDetailSpecAccordions item={item} />

          <section className="w-full bg-white">
            <div className={`${PRODUCT_DETAIL_CONTENT_INNER} space-y-5 pt-8`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className={PRODUCT_DETAIL_SECTION_HEAD_CLASS}>주문정보</h3>
                <Link href={inquiryLink} className="site-no-print inline-flex items-center rounded bg-[#002D5E] !text-white px-4 py-2 text-sm font-medium hover:opacity-95">
                  견적문의
                </Link>
              </div>
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="w-full text-sm border-collapse">
                  <thead className="border-b border-slate-200 bg-slate-100">
                    <tr className="text-left text-slate-700">
                      <th className="p-3 font-semibold min-w-[220px]">Product</th>
                      <th className="p-3 font-semibold w-40">Cat.No.</th>
                      <th className="p-3 font-semibold w-32 text-center">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 last:border-b-0 bg-white">
                      <td className="p-3 align-middle text-slate-800">{item.name}</td>
                      <td className="p-3 align-middle text-slate-700">{item.productNumber || "-"}</td>
                      <td className="p-3 align-middle">
                        <div className="mx-auto inline-flex w-max items-center overflow-hidden rounded border border-slate-300 bg-white">
                          <button
                            type="button"
                            className="h-8 w-8 bg-slate-50 hover:bg-slate-100 text-slate-800"
                            onClick={() => setQty((v) => Math.max(1, v - 1))}
                            aria-label="수량 감소"
                          >
                            -
                          </button>
                          <span className="flex h-8 min-w-[40px] items-center justify-center border-x border-slate-300 bg-white px-2 font-medium">{qty}</span>
                          <button type="button" className="h-8 w-8 bg-slate-50 hover:bg-slate-100 text-slate-800" onClick={() => setQty((v) => v + 1)} aria-label="수량 증가">
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="w-full bg-white">
            <div className={`${PRODUCT_DETAIL_CONTENT_INNER} pt-8 pb-8`}>
              <RecommendedProductsCarousel items={recommendedItems} />
            </div>
          </section>
        </article>
      </div>
    </div>
    </>
  );
}

function RecommendedProductsCarousel({ items }) {
  const viewportRef = useRef(null);
  const dragPointerIdRef = useRef(null);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const movedRef = useRef(false);

  const scrollByPage = (direction) => {
    const el = viewportRef.current;
    if (!el) return;
    const amount = Math.max(260, Math.floor(el.clientWidth * 0.85));
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  const onPointerDown = (e) => {
    const el = viewportRef.current;
    if (!el) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragPointerIdRef.current = e.pointerId;
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = el.scrollLeft;
    movedRef.current = false;
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const el = viewportRef.current;
    if (!el) return;
    if (dragPointerIdRef.current == null || dragPointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - dragStartXRef.current;
    if (Math.abs(dx) > 4) movedRef.current = true;
    el.scrollLeft = dragStartScrollRef.current - dx;
  };

  const onPointerUp = (e) => {
    const el = viewportRef.current;
    if (!el) return;
    if (dragPointerIdRef.current == null || dragPointerIdRef.current !== e.pointerId) return;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    dragPointerIdRef.current = null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className={PRODUCT_DETAIL_SECTION_HEAD_CLASS}>추천상품</h3>
        {items.length > 0 ? (
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={() => scrollByPage(-1)}
              aria-label="추천상품 이전"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={() => scrollByPage(1)}
              aria-label="추천상품 다음"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">등록된 추천상품이 없습니다.</p>
      ) : (
        <div
          ref={viewportRef}
          className="overflow-x-auto hide-scrollbar cursor-grab active:cursor-grabbing select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="flex gap-4 pb-1 min-w-max">
            {items.map((x) => (
              <Link
                key={x._id}
                href={`/products/${x._id}`}
                className="group block w-[210px] sm:w-[220px] lg:w-[240px] shrink-0"
                onClick={(e) => {
                  if (movedRef.current) {
                    e.preventDefault();
                    movedRef.current = false;
                  }
                }}
              >
                <div className="relative aspect-square bg-slate-100 border border-slate-200 overflow-hidden">
                  <ProductThumbBadge kind={getProductListBadge(x)} />
                  {x.thumbnailUrl || x.imageUrl ? (
                    <img src={x.thumbnailUrl || x.imageUrl} alt={x.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">이미지 없음</div>
                  )}
                </div>
                <div className="pt-3">
                  <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{x.name}</p>
                  {x.productNumber ? <p className="text-xs text-slate-500 mt-1">{x.productNumber}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const BOARD_DISPLAY_LABELS = {
  GALLERY: "사진 갤러리형",
  TABLE: "목록(표)형",
  THUMBNAIL_LIST: "썸네일+본문 줄형",
};

function formatPostDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch {
    return "—";
  }
}

function formatBoardEventYMD(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function boardEventDateRangeLabel(startAt, endAt) {
  const a = formatBoardEventYMD(startAt);
  const b = formatBoardEventYMD(endAt);
  if (a && b) return `${a} ~ ${b}`;
  if (a) return `${a} ~`;
  if (b) return `~ ${b}`;
  return "";
}

/** 목록 배지용: 종료일 지나면 ended, 시작일 전이면 upcoming */
function boardEventListStatus(post) {
  const now = Date.now();
  if (post?.forceEnded === true) return "ended";
  const end = post.endAt ? new Date(post.endAt).getTime() : NaN;
  const start = post.startAt ? new Date(post.startAt).getTime() : NaN;
  if (Number.isFinite(end) && now > end) return "ended";
  if (Number.isFinite(start) && now < start) return "upcoming";
  return "ongoing";
}

function EventEndedThumbOverlay() {
  return (
    <div
      className="absolute inset-0 z-[1] flex flex-col items-center justify-center bg-black/58 text-white pointer-events-none px-3"
      aria-hidden
    >
      <svg className="w-14 h-14 mb-2.5 shrink-0 opacity-95" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="9" y="13" width="26" height="24" rx="2" />
        <path strokeLinecap="round" d="M9 19h26M15 9v5M33 9v5" />
        <circle cx="35" cy="31" r="10" fill="rgba(0,0,0,0.25)" stroke="currentColor" strokeWidth="1.4" />
        <path strokeLinecap="round" d="M35 27v4.5l2.5 1.5" />
      </svg>
      <p className="text-[13px] sm:text-sm font-bold text-center leading-snug">종료된 이벤트 입니다.</p>
    </div>
  );
}

/** watch / youtu.be / shorts → embed URL (그 외 null) */
function toYouTubeEmbedUrl(raw) {
  const u = String(raw || "").trim();
  if (!u) return null;
  try {
    const url = new URL(u, "https://www.youtube.com");
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.slice("/embed/".length).split("/")[0];
        return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0` : null;
      }
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${encodeURIComponent(v)}?rel=0`;
      const shorts = url.pathname.match(/^\/shorts\/([^/?#]+)/);
      if (shorts?.[1]) return `https://www.youtube.com/embed/${encodeURIComponent(shorts[1])}?rel=0`;
    }
  } catch {
    return null;
  }
  return null;
}

function BoardPostVideoModal({ embedSrc, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-3 pt-14 sm:p-6 sm:pt-16" role="dialog" aria-modal="true" aria-labelledby="board-video-modal-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/65"
        aria-label="배경 클릭 시 닫기"
        onClick={onClose}
      />
      <button
        type="button"
        className="fixed right-3 top-3 z-[230] flex h-11 w-11 items-center justify-center text-3xl font-light leading-none text-white drop-shadow-md hover:text-white/85 sm:right-5 sm:top-5"
        onClick={onClose}
        aria-label="닫기"
      >
        ×
      </button>
      <div className="relative z-[1] w-full max-w-5xl">
        <p id="board-video-modal-title" className="sr-only">
          {title ? `${title} 동영상` : "동영상"}
        </p>
        <div className="aspect-video w-full overflow-hidden bg-black shadow-2xl ring-1 ring-white/15">
          <iframe
            title={title || "YouTube"}
            src={embedSrc}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}

function paginationPageNumbers(page, totalPages, maxSlots = 5) {
  const n = Math.max(1, totalPages);
  if (n <= maxSlots) return Array.from({ length: n }, (_, i) => i + 1);
  const half = Math.floor(maxSlots / 2);
  let start = page - half;
  let end = page + half - (maxSlots % 2 === 0 ? 1 : 0);
  if (start < 1) {
    start = 1;
    end = maxSlots;
  }
  if (end > n) {
    end = n;
    start = n - maxSlots + 1;
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function IconChevronLeft({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function IconChevronRight({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function IconShare2({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.3 10.8 15.6 6.3M8.3 13.2l7.3 4.5" />
    </svg>
  );
}

function IconPrint2({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 9V4h10v5" />
      <rect x="4" y="9" width="16" height="8" rx="2" />
      <path d="M7 14h10v6H7z" />
      <path d="M17 11h.01" />
    </svg>
  );
}

function IconPaperclip({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

/** 미니멀 원형 활성 표시(빨간 배경) + 좌우 화살표 */
function CirclePagination({ page, totalPages, onPageChange, className = "" }) {
  const n = Math.max(1, totalPages);
  const nums = paginationPageNumbers(page, n, 5);
  const navBtn =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-900 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-35";
  const pageBase =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-full px-2 text-[15px] font-medium text-slate-900 transition-colors hover:bg-slate-100";
  const pageActive = "bg-[#C52525] text-white shadow-none hover:bg-[#C52525] hover:text-white";

  return (
    <nav className={`flex flex-col items-center gap-2 ${className}`} aria-label="페이지 이동">
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <button type="button" className={navBtn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="이전 페이지">
          <IconChevronLeft />
        </button>
        <div className="flex items-center gap-0.5 sm:gap-1 px-1">
          {nums.map((p) => (
            <button
              key={p}
              type="button"
              className={`${pageBase} ${p === page ? pageActive : ""}`}
              onClick={() => onPageChange(p)}
              aria-label={`${p}페이지`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          ))}
        </div>
        <button type="button" className={navBtn} disabled={page >= n} onClick={() => onPageChange(page + 1)} aria-label="다음 페이지">
          <IconChevronRight />
        </button>
      </div>
    </nav>
  );
}

function BoardListPage({ slug, fallbackTitle }) {
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [videoModal, setVideoModal] = useState(null);
  const infiniteSentinelRef = useRef(null);

  useEffect(() => {
    setErr("");
    if (page > 1) setLoadingMore(true);
    api
      .get(`/${slug}`, { params: { search: q, page, limit: 20 } })
      .then((r) => {
        const incoming = r.data;
        setData((prev) => {
          if (
            incoming?.board?.displayType === "THUMBNAIL_LIST" &&
            page > 1 &&
            prev?.board?.displayType === "THUMBNAIL_LIST"
          ) {
            return {
              ...incoming,
              items: [...(prev.items || []), ...(incoming.items || [])],
            };
          }
          return incoming;
        });
      })
      .catch(() => setErr("목록을 불러오지 못했습니다."))
      .finally(() => setLoadingMore(false));
  }, [slug, q, page]);

  useEffect(() => {
    setQ("");
    setSearchInput("");
    setPage(1);
    setVideoModal(null);
  }, [slug]);

  useEffect(() => {
    if (!data?.board || data.board.displayType !== "THUMBNAIL_LIST") return undefined;
    if (!data.hasMore || loadingMore) return undefined;
    const target = infiniteSentinelRef.current;
    if (!target) return undefined;
    const ob = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        setLoadingMore(true);
        setPage((p) => p + 1);
      },
      { rootMargin: "240px 0px" }
    );
    ob.observe(target);
    return () => ob.disconnect();
  }, [data?.board?.displayType, data?.hasMore, loadingMore]);

  if (err) {
    return (
      <div className="w-full py-8">
        <div className="card p-5 text-red-600">{err}</div>
      </div>
    );
  }
  if (!data?.board) return <div className="w-full py-8">Loading…</div>;

  const { board, items, total, hasMore, limit: listLimit = 20 } = data;
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / listLimit));
  const title = board.title || fallbackTitle;
  const displayType = board.displayType || "TABLE";
  const isNoticeTable = slug === "notices" && displayType === "TABLE";

  const listSubtitle =
    (board.subtitle && String(board.subtitle).trim()) ||
    BOARD_LIST_SLUG_SUBTITLE[slug] ||
    (displayType === "GALLERY" ? "갤러리 형태로 게시글을 확인할 수 있습니다." : displayType === "THUMBNAIL_LIST" ? "이벤트·프로모션 소식을 안내합니다." : "게시글 목록입니다.");

  const listPageHeader = (
    <SitePageHeroBanner
      eyebrow={boardSlugToEyebrow(slug)}
      breadcrumb={
        <PageBreadcrumb
          className="!mt-0"
          segments={[{ label: "고객지원" }, { label: title }]}
          subMenus={slug === "notices" ? CUSTOMER_SUPPORT_SUB : []}
        />
      }
      title={title}
      subtitle={listSubtitle}
    />
  );

  const shouldShowSearch = board.showSearch !== false;

  const applySearch = (e) => {
    e?.preventDefault?.();
    setPage(1);
    setQ(searchInput.trim());
  };

  const searchBar = (
    <form onSubmit={applySearch} className="mb-5 flex w-full items-center justify-between gap-3">
      <p className="text-slate-600 text-sm shrink-0">전체 : {total ?? 0}</p>
      {shouldShowSearch ? (
        <div className="w-full max-w-[420px]">
          <label htmlFor={`board-search-${slug}`} className="sr-only">
            게시글 검색
          </label>
          <div className="relative">
          <input
            id={`board-search-${slug}`}
            className="h-10 w-full rounded-full border border-[#C52525] pl-4 pr-11 text-sm"
            placeholder="검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              applySearch();
            }}
          />
          <button
            type="submit"
            className="absolute inset-y-0 right-0 px-3 inline-flex items-center text-slate-500 hover:text-slate-700 cursor-pointer"
            aria-label="검색"
            title="검색"
          >
            <IconSearch className="w-5 h-5" />
          </button>
          </div>
        </div>
      ) : (
        <div />
      )}
    </form>
  );

  if (displayType === "GALLERY") {
    return (
      <>
        {listPageHeader}
        <div className="w-full py-6 md:py-8">
        <div className="mt-6 md:mt-8">
        {searchBar}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-5 md:gap-x-6">
          {items.map((x) => (
            <Link
              key={x._id}
              href={`/${slug}/${x._id}`}
              className="group block overflow-hidden border border-slate-200 bg-white transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.03)] group-hover:border-[#C52525] hover:shadow-[0_3px_10px_rgba(0,0,0,0.06)]"
            >
              <div className="aspect-square overflow-hidden bg-slate-100 border-b border-slate-100">
                {x.thumbnailUrl ? (
                  <img
                    src={x.thumbnailUrl}
                    alt=""
                    className="h-full w-full origin-center object-cover transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:group-hover:scale-100 group-hover:scale-[1.06]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">이미지 없음</div>
                )}
              </div>
              <div className="px-4 py-3">
                <h3 className="font-bold text-sm text-slate-900 leading-snug transition-colors group-hover:text-[#C52525]">
                  {x.title}
                </h3>
                <ul className="text-xs text-slate-600 mt-2 space-y-0.5 list-disc list-inside">
                  {(x.summary || "")
                    .split(/\n+/)
                    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
                    .filter(Boolean)
                    .slice(0, 6)
                    .map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                </ul>
              </div>
            </Link>
          ))}
        </div>
        {items.length === 0 ? <p className="text-center text-slate-500 py-8">등록된 글이 없습니다.</p> : null}
        <div className="mt-6 space-y-2">
          <CirclePagination page={page} totalPages={totalPages} onPageChange={setPage} />
          {total != null ? <p className="text-center text-sm text-slate-500">총 {total}건</p> : null}
        </div>
        </div>
      </div>
      </>
    );
  }

  if (displayType === "THUMBNAIL_LIST") {
    const isEventBoard = slug === "events";
    return (
      <>
      {listPageHeader}
      <div
        className="w-full py-6 md:py-8"
      >
        <div className="mt-6 md:mt-8">
        {searchBar}
        <div className="bg-transparent border-t-2 border-[#C52525]/70">
          {items.map((x) => {
            const evStatus = isEventBoard ? boardEventListStatus(x) : null;
            const dateRange = isEventBoard ? boardEventDateRangeLabel(x.startAt, x.endAt) : "";
            const showEndedOverlay = isEventBoard && evStatus === "ended";
            const youtubeEmbed = x.youtubeUrl ? toYouTubeEmbedUrl(x.youtubeUrl) : null;

            const articleClass = isEventBoard
              ? "grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)_158px] gap-5 lg:gap-8 py-6 md:py-8 border-b border-slate-200/90"
              : "grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_170px] gap-5 lg:gap-6 py-6 border-b border-slate-200/90";

            const thumbClass = isEventBoard
              ? "group relative block h-[220px] w-full max-w-[400px] shrink-0 overflow-hidden bg-slate-100"
              : "group relative block w-full h-[136px] sm:h-[144px] lg:h-[132px] overflow-hidden bg-slate-100";

            return (
              <article key={x._id} className={articleClass}>
                <Link href={`/${slug}/${x._id}`} className={thumbClass}>
                  {x.thumbnailUrl ? (
                    <img
                      src={x.thumbnailUrl}
                      alt=""
                      className={`h-full w-full origin-center object-cover transition-transform duration-300 ease-out motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
                        isEventBoard ? "group-hover:scale-[1.06]" : "group-hover:scale-[1.04]"
                      }`}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm">이미지 없음</div>
                  )}
                  {showEndedOverlay ? <EventEndedThumbOverlay /> : null}
                </Link>

                <div className="min-w-0 flex flex-col justify-center">
                  {isEventBoard ? (
                    <div className="mb-3 flex flex-wrap items-center gap-2.5 gap-y-2">
                      {evStatus === "ongoing" ? (
                        <span className="inline-flex items-center rounded-full bg-[#153c82] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                          진행중
                        </span>
                      ) : evStatus === "upcoming" ? (
                        <span className="inline-flex items-center rounded-full bg-slate-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                          진행예정
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                          종료
                        </span>
                      )}
                      {dateRange ? (
                        <span className="text-sm text-slate-500 tabular-nums tracking-tight">{dateRange}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <Link href={`/${slug}/${x._id}`} className="group block">
                    <h3
                      className={`font-bold leading-[1.25] tracking-[-0.01em] text-[#0f2340] transition-colors group-hover:text-[#C52525] ${
                        isEventBoard ? "text-[28px] sm:text-[32px] md:text-[34px]" : "text-[30px] md:text-[32px]"
                      }`}
                    >
                      {x.title}
                    </h3>
                    {x.summary ? (
                      <p
                        className={`leading-[1.75] text-slate-600 line-clamp-2 ${
                          isEventBoard ? "mt-3 text-[17px] md:text-[18px]" : "mt-4 text-[18px]"
                        }`}
                      >
                        {x.summary}
                      </p>
                    ) : null}
                  </Link>
                </div>

                <div className="flex lg:justify-end items-center">
                  <div
                    className={`flex w-full gap-2 lg:w-auto ${isEventBoard ? "flex-col" : "flex-row lg:flex-col"}`}
                  >
                    {x.youtubeUrl ? (
                      youtubeEmbed ? (
                        <button
                          type="button"
                          onClick={() => setVideoModal({ src: youtubeEmbed, title: x.title })}
                          className="inline-flex h-10 min-w-[118px] cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-100 px-4 text-[17px] text-slate-700 transition-colors hover:bg-slate-200"
                        >
                          동영상 보기
                          <span aria-hidden>›</span>
                        </button>
                      ) : (
                        <a
                          href={x.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 min-w-[118px] items-center justify-center gap-2 rounded-md bg-slate-100 px-4 text-[17px] text-slate-700 transition-colors hover:bg-slate-200"
                        >
                          동영상 보기
                          <span aria-hidden>›</span>
                        </a>
                      )
                    ) : null}
                    <Link
                      href={`/${slug}/${x._id}`}
                      className="inline-flex h-10 min-w-[118px] items-center justify-center gap-2 rounded-md bg-slate-100 px-4 text-[17px] text-slate-700 transition-colors hover:bg-slate-200"
                    >
                      자세히 보기
                      <span aria-hidden>›</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {items.length === 0 ? <p className="text-center text-slate-500 py-8">등록된 글이 없습니다.</p> : null}
        {hasMore ? <div ref={infiniteSentinelRef} className="h-8" aria-hidden /> : null}
        {loadingMore ? <p className="text-center text-sm text-slate-500 py-2">더 불러오는 중…</p> : null}
        {!hasMore && items.length > 0 ? <p className="text-center text-sm text-slate-400 py-2">마지막 글입니다.</p> : null}
        </div>
      </div>
      {videoModal ? (
        <BoardPostVideoModal
          embedSrc={videoModal.src}
          title={videoModal.title}
          onClose={() => setVideoModal(null)}
        />
      ) : null}
    </>
    );
  }

  return (
    <>
      {listPageHeader}
      <div className="w-full py-6 md:py-8">
      <div className="mt-6 md:mt-8">
      {searchBar}
      <div className={`overflow-x-auto bg-white ${isNoticeTable ? "border-0" : "border-y border-slate-200"}`}>
        <table className={`w-full ${isNoticeTable ? "text-[15px] md:text-base" : "text-sm"}`}>
          <thead className={`bg-white border-b ${isNoticeTable ? "border-b-slate-300" : "border-slate-200"}`}>
            <tr className="text-slate-900">
              <th className={`text-center p-3 w-20 font-bold ${isNoticeTable ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>No</th>
              <th className={`text-center p-3 min-w-[40%] font-bold ${isNoticeTable ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>제목</th>
              <th className={`text-center p-3 w-28 whitespace-nowrap font-bold ${isNoticeTable ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>작성자</th>
              <th className={`text-center p-3 w-32 whitespace-nowrap font-bold ${isNoticeTable ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>등록일</th>
              <th className={`text-center p-3 w-20 whitespace-nowrap font-bold ${isNoticeTable ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>조회</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x, idx) => (
              <tr key={x._id} className={`border-b ${isNoticeTable ? "border-slate-200 hover:bg-white" : "border-slate-200 hover:bg-slate-50/80"}`}>
                <td className="p-3 text-center text-slate-600 align-middle">
                  {x.isImportant ? (
                    <span className={`inline-block whitespace-nowrap px-2 py-0.5 font-semibold bg-[#153c82] text-white ${isNoticeTable ? "text-sm" : "text-xs"}`}>공지</span>
                  ) : (
                    Math.max(1, (total ?? 0) - ((page - 1) * listLimit + idx))
                  )}
                </td>
                <td className="p-3 text-left align-middle">
                  <Link href={`/${slug}/${x._id}`} className="group flex w-full h-full items-start gap-2">
                    {isNoticeTable && Array.isArray(x.attachments) && x.attachments.length > 0 ? (
                      <span className="mt-0.5 inline-flex shrink-0 text-slate-500" title="첨부파일 있음">
                        <IconPaperclip className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                        <span className="sr-only">첨부파일 있음</span>
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className={`font-medium text-slate-900 transition-colors group-hover:text-[#C52525] ${isNoticeTable ? "text-[17px] md:text-[18px]" : ""}`}>
                        {x.title}
                      </span>
                      {!isNoticeTable && x.summary ? <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{x.summary}</p> : null}
                    </span>
                  </Link>
                </td>
                <td className="p-3 text-center text-slate-600 whitespace-nowrap align-middle">관리자</td>
                <td className="p-3 text-center text-slate-600 whitespace-nowrap align-middle">{formatPostDate(x.createdAt)}</td>
                <td className="p-3 text-center text-slate-700 whitespace-nowrap align-middle">{Number(x.viewCount || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 ? <p className="text-center text-slate-500 py-8">등록된 글이 없습니다.</p> : null}
      <div className="mt-6 space-y-2">
        <CirclePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        {total != null ? <p className="text-center text-sm text-slate-500">총 {total}건</p> : null}
      </div>
      </div>
    </div>
    </>
  );
}

function BoardListPageFromParam() {
  const { slug } = useParams();
  return <BoardListPage slug={slug} fallbackTitle={slug} />;
}

function BoardPostDetailFromParam() {
  const { slug } = useParams();
  return <BoardPostDetailPage slug={slug} />;
}

function BoardPostDetailPage({ slug }) {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");
  const [adjacent, setAdjacent] = useState({ prev: null, next: null });
  useEffect(() => {
    api
      .get(`/${slug}/${id}`)
      .then((r) => setItem(r.data))
      .catch(() => setErr("데이터를 불러오지 못했습니다."));
  }, [slug, id]);

  useEffect(() => {
    api
      .get(`/${slug}`, { params: { page: 1, limit: 200 } })
      .then((r) => {
        const rows = r.data?.items || [];
        const idx = rows.findIndex((x) => String(x._id) === String(id));
        if (idx < 0) {
          setAdjacent({ prev: null, next: null });
          return;
        }
        setAdjacent({
          prev: idx > 0 ? rows[idx - 1] : null,
          next: idx < rows.length - 1 ? rows[idx + 1] : null,
        });
      })
      .catch(() => setAdjacent({ prev: null, next: null }));
  }, [slug, id]);

  if (err) return <div className="w-full py-8"><div className="card p-5 text-red-600">{err}</div></div>;
  if (!item) return <div className="w-full py-8">Loading…</div>;

  const listPath = `/${slug}`;
  const boardListLabel = BOARD_DETAIL_SLUG_TITLE[slug] || slug;
  const crumbPost = item.title.length > 32 ? `${item.title.slice(0, 32)}…` : item.title;
  const shouldShowRelatedProduct = slug === "notices" || slug === "events" || slug === "references";
  const relatedProduct =
    item?.relatedProductId && typeof item.relatedProductId === "object" && item.relatedProductId?._id
      ? item.relatedProductId
      : null;

  const boardDetailHeroSubtitle =
    BOARD_LIST_SLUG_SUBTITLE[slug] || "게시글 내용을 확인하실 수 있습니다.";

  return (
    <>
      <SitePageHeroBanner
        eyebrow={boardSlugToEyebrow(slug)}
        breadcrumb={
          <PageBreadcrumb
            className="!mt-0"
            segments={[
              { label: "고객지원" },
              { to: listPath, label: boardListLabel },
              { label: crumbPost },
            ]}
            subMenus={slug === "notices" ? CUSTOMER_SUPPORT_SUB : []}
            subMenuAnchorIndex={1}
          />
        }
        title={boardListLabel}
        subtitle={boardDetailHeroSubtitle}
      />
      <div className="w-full py-6 md:py-8">
      <div className="mt-4 md:mt-6 space-y-4">
      <article className="text-slate-800">
        <header className="border-t border-b border-slate-200 bg-white">
          <div className="py-4 md:py-5">
            <h2 className="break-words text-left text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl md:text-[1.65rem]">
              {item.title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-200 py-2.5 text-sm leading-snug text-slate-600 md:py-2.5">
            <p className="m-0 flex min-h-0 min-w-0 items-center">
              <span className="font-medium text-slate-800">관리자</span>
              <span className="mx-2 text-slate-300" aria-hidden>
                |
              </span>
              <time dateTime={item.createdAt ? new Date(item.createdAt).toISOString() : undefined}>
                {formatBoardEventYMD(item.createdAt) || formatPostDate(item.createdAt)}
              </time>
            </p>
            <p className="m-0 flex shrink-0 items-center text-slate-700">
              조회수 <span className="ml-1 font-semibold tabular-nums">{Number(item.viewCount || 0).toLocaleString()}</span>
            </p>
          </div>
        </header>
        {item.content ? (
          <div
            className="prose prose-slate min-h-[50vh] max-w-none px-0.5 pb-8 pt-6 text-[15px] md:px-0 md:text-[16px] md:leading-7 [&_img]:max-w-full [&_img]:h-auto"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        ) : (
          <p className="flex min-h-[50vh] items-center justify-center px-0.5 text-center text-slate-500 md:px-0">
            본문 없음
          </p>
        )}
        {Array.isArray(item.attachments) && item.attachments.length > 0 ? (
          <div className="mt-2 border-t border-b border-slate-200 bg-slate-50 px-4 py-3 md:px-5">
            <p className="mb-2 text-sm font-semibold text-slate-800">첨부 파일</p>
            <ul className="space-y-2">
              {item.attachments.map((a, i) => (
                <li key={`${a.url}-${i}`}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    download={a.fileName || undefined}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#153c82] underline underline-offset-2 hover:text-[#C52525]"
                  >
                    <IconPaperclip className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="break-all">{a.fileName || a.url.split("/").pop() || `첨부 ${i + 1}`}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>
        {item.youtubeUrl ? (
          <div className="w-full overflow-hidden rounded bg-black">
            <iframe
              title="youtube"
              src={String(item.youtubeUrl).replace("watch?v=", "embed/")}
              className="h-[320px] w-full md:h-[420px] lg:h-[520px]"
              allowFullScreen
            />
          </div>
        ) : null}
        {shouldShowRelatedProduct && relatedProduct ? (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-[19pt] font-bold leading-snug text-[#C52525]">관련제품</h3>
            </div>
            <Link href={`/products/${relatedProduct._id}`} className="group block w-[210px] sm:w-[220px] lg:w-[240px]">
              <div className="relative aspect-square overflow-hidden border border-slate-200 bg-slate-100">
                <ProductThumbBadge kind={getProductListBadge(relatedProduct)} />
                {relatedProduct.thumbnailUrl || relatedProduct.imageUrl ? (
                  <img
                    src={relatedProduct.thumbnailUrl || relatedProduct.imageUrl}
                    alt={relatedProduct.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">이미지 없음</div>
                )}
              </div>
              <div className="pt-3">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{relatedProduct.name}</p>
                {relatedProduct.productNumber ? <p className="mt-1 text-xs text-slate-500">{relatedProduct.productNumber}</p> : null}
              </div>
            </Link>
          </div>
        ) : null}
        <div className="site-no-print flex justify-end items-center gap-3 text-sm text-slate-500">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 hover:text-slate-800"
            onClick={async () => {
              const url = window.location.href;
              try {
                if (navigator.share) await navigator.share({ title: item.title, url });
                else if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(url);
                  window.alert("링크가 복사되었습니다.");
                }
              } catch {
                // user cancelled share dialog or clipboard unavailable
              }
            }}
          >
            <IconShare2 className="w-4 h-4" />
            <span className="sr-only">공유</span>
          </button>
          <button type="button" className="inline-flex items-center gap-1.5 hover:text-slate-800" onClick={() => window.print()}>
            <IconPrint2 className="w-4 h-4" />
            <span className="sr-only">프린트</span>
          </button>
        </div>
        <div className="border-y border-slate-200 divide-y">
          <div className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="text-slate-400 shrink-0" aria-hidden>
              ˄
            </span>
            <span className="text-slate-500 shrink-0">이전글</span>
            {adjacent.prev ? (
              <Link href={`/${slug}/${adjacent.prev._id}`} className="text-slate-800 transition-colors hover:text-[#C52525] truncate">
                {adjacent.prev.title}
              </Link>
            ) : (
              <span className="text-slate-400">이전글이 없습니다.</span>
            )}
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="text-slate-400 shrink-0" aria-hidden>
              ˅
            </span>
            <span className="text-slate-500 shrink-0">다음글</span>
            {adjacent.next ? (
              <Link href={`/${slug}/${adjacent.next._id}`} className="text-slate-800 transition-colors hover:text-[#C52525] truncate">
                {adjacent.next.title}
              </Link>
            ) : (
              <span className="text-slate-400">다음글이 없습니다.</span>
            )}
          </div>
        </div>
        <div>
          <Link className="inline-flex px-4 py-2 rounded bg-[#002D5E] !text-white text-sm font-medium hover:opacity-95" href={listPath}>
            목록
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}

const INQUIRY_HOW_HEARD = [
  { value: "SEARCH", ko: "검색", en: "Search" },
  { value: "REFERRAL", ko: "지인 추천", en: "Referral" },
  { value: "AD", ko: "광고", en: "Advertisement" },
  { value: "SNS", ko: "SNS(블로그/인스타)", en: "SNS (Blog/Instagram)" },
  { value: "BROCHURE", ko: "브로슈어/전단지", en: "Brochure/Flyer" },
  { value: "MAIL", ko: "우편물", en: "Mail" },
  { value: "CONFERENCE", ko: "학회/박람회", en: "Conference/Expo" },
  { value: "OTHER", ko: "기타", en: "Other" },
];

const INQUIRY_PRIVACY_TEXT = `수집·이용 목적: 견적 및 구매 상담, 문의 응대

수집 항목: 이름, 소속, 연락처(전화번호), 이메일, 문의 제품 정보, 선택 항목(수량·문의내용·유입 경로·첨부파일 등)

보유·이용 기간: 상담 완료 후 6개월(또는 관계 법령에 따른 기간), 삭제 요청 시 지체 없이 파기

문의에 따른 응대를 위해 최소한의 개인정보를 수집합니다. 동의를 거부할 수 있으나, 동의하지 않을 경우 견적문의 접수가 제한될 수 있습니다.

개인정보 처리에 관한 문의: 사이트 하단 또는 고객지원 안내에 따른 담당자에게 연락해 주세요.`;

const INQUIRY_PRIVACY_TEXT_EN = `Purpose: Quotation/purchase consultation and inquiry response

Collected items: Name, affiliation, contact number, email, product details, optional fields (quantity/message/source/attachment, etc.)

Retention period: 6 months after consultation is complete (or longer if required by law), and deleted promptly upon request

We collect the minimum personal information needed to respond to your inquiry. You may refuse consent, but inquiry submission may be restricted.

For privacy-related questions, please contact the person in charge via the footer/customer support information.`;

function InquiryPage() {
  const siteLang = useSiteLang();
  const isEn = siteLang === SITE_LANG.EN;
  const L = useMemo(
    () => ({
      breadcrumbSupport: isEn ? "Customer Support" : "고객지원",
      pageTitle: isEn ? "Inquiry" : "견적문의",
      pageSubtitle: isEn ? "Submit the form below and our team will contact you." : "아래 폼으로 문의하시면 담당자가 연락드립니다.",
      requiredHint: isEn ? "* Required fields" : "는 필수 입력사항입니다.",
      sectionRequester: isEn ? "Requester Information" : "문의자 정보",
      type: isEn ? "Type" : "구분",
      typeUser: isEn ? "User" : "유저",
      typeDealer: isEn ? "Dealer" : "딜러",
      affiliation: isEn ? "Affiliation" : "소속",
      affiliationPh: isEn ? "Please enter affiliation." : "소속을 입력해주세요.",
      name: isEn ? "Name" : "이름",
      namePh: isEn ? "Please enter your name." : "이름을 입력해주세요.",
      phone: isEn ? "Phone" : "전화번호",
      phonePh: isEn ? "Please enter phone number." : "전화번호를 입력해주세요.",
      email: isEn ? "Email" : "이메일",
      emailPh: isEn ? "Please enter email address." : "이메일을 입력해주세요.",
      sectionProduct: isEn ? "Product Information" : "문의내용",
      brand: isEn ? "Manufacturer / Brand" : "제조사",
      brandPh: isEn ? "Please enter manufacturer/brand." : "제조사를 입력해주세요.",
      catalogNo: isEn ? "Catalog Number" : "카탈로그 넘버",
      catalogNoPh: isEn ? "Please enter catalog number." : "카탈로그 넘버를 입력해주세요.",
      productName: isEn ? "Product Name" : "제품명",
      productNamePh: isEn ? "Please enter product name." : "제품명을 입력해주세요.",
      qty: isEn ? "Quantity" : "수량",
      qtyPh: isEn ? "Please enter quantity." : "수량을 입력해주세요.",
      message: isEn ? "Message" : "상세 문의",
      sectionEtc: isEn ? "Additional Information" : "기타 정보 수집",
      source: isEn ? "How did you hear about us?" : "알게 된 경로",
      otherPh: isEn ? "Please enter details." : "내용을 입력해주세요.",
      attachment: isEn ? "Attachment" : "첨부파일",
      attachmentHint: isEn ? "(e.g. business registration, item list) Image or PDF, up to 10MB" : "(예: 사업자등록증, 품목리스트, 등) 이미지 또는 PDF, 최대 10MB",
      attachmentView: isEn ? "View attachment" : "첨부 확인",
      sectionPrivacy: isEn ? "Privacy Collection and Use Notice" : "개인정보 수집 및 이용에 대한 안내",
      agree: isEn ? "I agree to the collection and use of personal information." : "개인정보 수집 및 이용에 동의합니다.",
      fullText: isEn ? "View full text" : "전문보기",
      submit: isEn ? "Submit Inquiry" : "문의하기",
      modalTitle: isEn ? "Privacy Collection/Use Notice (Full Text)" : "개인정보 수집·이용 안내 (전문)",
      close: isEn ? "Close" : "닫기",
      doneTitle: isEn ? "Your inquiry has been received." : "문의가 접수되었습니다.",
      doneDesc: isEn ? "We will get back to you soon." : "빠른 시일 내에 연락드리겠습니다.",
      goHome: isEn ? "Back to Home" : "홈으로",
      errType: isEn ? "Please select requester type." : "구분(유저/업자)을 선택해 주세요.",
      errPrivacy: isEn ? "Please agree to the privacy collection/use policy." : "개인정보 수집 및 이용에 동의해 주세요.",
      errSubmit: isEn ? "Failed to submit inquiry." : "문의 등록에 실패했습니다.",
    }),
    [isEn]
  );
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    inquirerType: "",
    affiliation: "",
    name: "",
    email: "",
    phone: "",
    productId: searchParams.get("productId") || "",
    brand: "",
    catalogNumber: searchParams.get("catalogNumber") || "",
    productName: searchParams.get("productName") || "",
    quantity: searchParams.get("quantity") || "",
    message: "",
    howHeard: "",
    howHeardOther: "",
    attachmentUrl: "",
    privacyAgreed: false,
  });
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [privacyModal, setPrivacyModal] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadErr("");
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/inquiry-upload", fd);
      if (r.data?.url) setForm((f) => ({ ...f, attachmentUrl: r.data.url }));
      else setUploadErr("업로드 응답이 올바르지 않습니다.");
    } catch (er) {
      setUploadErr(er.response?.data?.error || (isEn ? "Attachment upload failed." : "첨부 업로드에 실패했습니다."));
    } finally {
      setUploadBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.inquirerType) {
      setError(L.errType);
      return;
    }
    if (!form.privacyAgreed) {
      setError(L.errPrivacy);
      return;
    }
    try {
      await api.post("/inquiries", {
        ...form,
        productId: form.productId || undefined,
        quantity: form.quantity.trim(),
        message: form.message.trim(),
        howHeard: form.howHeard || "",
        howHeardOther: form.howHeard === "OTHER" ? form.howHeardOther.trim() : "",
      });
      setDone(true);
    } catch (e2) {
      setError(e2.response?.data?.error || L.errSubmit);
    }
  };

  if (done) {
    return (
      <div className="w-full pt-14 md:pt-20 pb-10 md:pb-14">
        <div className="mt-8 md:mt-10 card p-8 text-center text-slate-800">
          <p className="text-lg font-semibold">{L.doneTitle}</p>
          <p className="mt-2 text-slate-600 text-sm">{L.doneDesc}</p>
          <Link href="/" className="inline-block mt-6 text-[#002D5E] font-medium text-sm">
            {L.goHome}
          </Link>
        </div>
      </div>
    );
  }

  const fieldClass =
    "w-full border border-slate-200 rounded-none px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400";

  return (
    <>
      <SitePageHeroBanner
        eyebrow="INQUIRY"
        breadcrumb={<PageBreadcrumb className="!mt-0" segments={[{ label: L.breadcrumbSupport }, { label: L.pageTitle }]} subMenus={CUSTOMER_SUPPORT_SUB} />}
        title={L.pageTitle}
      />
      <div className="w-full max-w-7xl mx-auto pt-4 md:pt-5 pb-16 md:pb-24">
      <form onSubmit={onSubmit} className="p-5 md:p-8 md:px-10 mt-3 md:mt-4 space-y-8 bg-white">
        <p className="text-right text-sm text-slate-500">
          <span className="text-red-600">*</span> {L.requiredHint}
        </p>

        <section className="pb-8">
          <h2 className="border-b border-slate-200 pb-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            {L.sectionRequester}
          </h2>
          <div className="mt-5 grid md:grid-cols-2 gap-x-10 gap-y-4 lg:gap-x-14">
            <div className="md:col-span-2 flex flex-nowrap items-center gap-4 text-base sm:gap-8">
              <span className="shrink-0 text-base font-semibold text-slate-800">
                {L.type} <span className="text-red-600">*</span>
              </span>
              <div className="flex min-w-0 flex-nowrap items-center gap-6 sm:gap-8">
                <label className="inline-flex shrink-0 items-center gap-2 cursor-pointer whitespace-nowrap">
                  <input
                    type="radio"
                    name="inquirerType"
                    checked={form.inquirerType === "USER"}
                    onChange={() => setForm({ ...form, inquirerType: "USER" })}
                    className="h-4 w-4 accent-red-600"
                  />
                  {L.typeUser}
                </label>
                <label className="inline-flex shrink-0 items-center gap-2 cursor-pointer whitespace-nowrap">
                  <input
                    type="radio"
                    name="inquirerType"
                    checked={form.inquirerType === "DEALER"}
                    onChange={() => setForm({ ...form, inquirerType: "DEALER" })}
                    className="h-4 w-4 accent-red-600"
                  />
                  {L.typeDealer}
                </label>
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1">
                {L.affiliation} <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder={L.affiliationPh}
                value={form.affiliation}
                onChange={(e) => setForm({ ...form, affiliation: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1">
                {L.name} <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder={L.namePh}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1">
                {L.phone} <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder={L.phonePh}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1">
                {L.email} <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                className={fieldClass}
                required
                placeholder={L.emailPh}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="pb-8">
          <h2 className="border-b border-slate-200 pb-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            {L.sectionProduct}
          </h2>
          <div className="mt-5 grid md:grid-cols-2 gap-x-10 gap-y-4 lg:gap-x-14">
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1">
                {L.brand} <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder={L.brandPh}
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1">
                {L.catalogNo} <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder={L.catalogNoPh}
                value={form.catalogNumber}
                onChange={(e) => setForm({ ...form, catalogNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1">
                {L.productName} <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder={L.productNamePh}
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1">{L.qty}</label>
              <input
                className={fieldClass}
                placeholder={L.qtyPh}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-base font-medium text-slate-700 mb-1">{L.message}</label>
              <textarea
                className={`${fieldClass} min-h-[140px] max-h-[280px] resize-none overflow-y-auto`}
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="pb-8">
          <h2 className="border-b border-slate-200 pb-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            {L.sectionEtc}
          </h2>
          <div className="mt-5">
            <label className="block text-base font-medium text-slate-700 mb-2">{L.source}</label>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-2.5 text-base">
              {INQUIRY_HOW_HEARD.map((opt) => (
                <label key={opt.value} className="inline-flex min-w-0 items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="howHeard"
                    checked={form.howHeard === opt.value}
                    onChange={() => setForm({ ...form, howHeard: opt.value, howHeardOther: opt.value === "OTHER" ? form.howHeardOther : "" })}
                    className="h-4 w-4 accent-red-600"
                  />
                  <span className={opt.value === "OTHER" ? "inline-flex max-w-full items-center gap-2 whitespace-nowrap" : "inline-flex items-center"}>
                    {pickKoEn(siteLang, opt.ko, opt.en)}
                    {opt.value === "OTHER" ? (
                      <input
                        className={`${fieldClass} inline-block w-[min(220px,100%)] md:w-[min(250px,100%)] align-middle`}
                        placeholder={L.otherPh}
                        disabled={form.howHeard !== "OTHER"}
                        value={form.howHeardOther}
                        onFocus={() => setForm((f) => ({ ...f, howHeard: "OTHER" }))}
                        onChange={(e) => setForm({ ...form, howHeardOther: e.target.value })}
                      />
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <label className="block text-base font-medium text-slate-700 mb-1">{L.attachment}</label>
            <input type="file" accept="image/*,.pdf,application/pdf" disabled={uploadBusy} onChange={onFile} className="block w-full text-base border border-slate-200 rounded-none p-2.5 bg-white" />
            <p className="text-sm text-slate-500 mt-1">{L.attachmentHint}</p>
            {form.attachmentUrl ? (
              <p className="text-sm text-[#002D5E] mt-2 break-all">
                <a href={form.attachmentUrl} target="_blank" rel="noreferrer" className="underline">
                  {L.attachmentView}
                </a>
              </p>
            ) : null}
            {uploadErr ? <p className="text-red-600 text-sm mt-1">{uploadErr}</p> : null}
          </div>
        </section>

        <section>
          <h2 className="border-b border-slate-200 pb-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
            {L.sectionPrivacy}
          </h2>
          <div className="mt-5 border border-slate-200 rounded-md bg-slate-50 p-4 max-h-56 overflow-y-auto text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{isEn ? INQUIRY_PRIVACY_TEXT_EN : INQUIRY_PRIVACY_TEXT}</div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-center">
            <label className="inline-flex items-center gap-2 text-base text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={form.privacyAgreed}
                onChange={(e) => setForm({ ...form, privacyAgreed: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-red-600"
              />
              {L.agree} <span className="text-red-600">*</span>
            </label>
            <button type="button" className="text-sm border border-slate-300 rounded px-3 py-1.5 text-slate-700 hover:bg-slate-50" onClick={() => setPrivacyModal(true)}>
              {L.fullText}
            </button>
          </div>
        </section>

        {error ? <p className="text-red-600 text-base">{error}</p> : null}

        <div className="pt-2 flex justify-center">
          <button type="submit" className="w-full sm:w-auto bg-[#002D5E] !text-white px-9 py-3.5 rounded-md text-base font-medium hover:opacity-95">
            {L.submit}
          </button>
        </div>
      </form>

      {privacyModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-900">{L.modalTitle}</span>
              <button type="button" className="text-slate-500 text-xl leading-none px-2" onClick={() => setPrivacyModal(false)} aria-label={L.close}>
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{isEn ? INQUIRY_PRIVACY_TEXT_EN : INQUIRY_PRIVACY_TEXT}</div>
            <div className="p-4 border-t border-slate-200">
              <button type="button" className="w-full py-2 rounded-md bg-slate-900 text-white text-sm" onClick={() => setPrivacyModal(false)}>
                {L.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </>
  );
}

function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin1234");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post("/admin/login", { email, password });
      setToken(r.data.token);
      router.push("/admin");
    } catch {
      setErr("로그인 실패");
    }
  };

  return (
    <div className="container mx-auto max-w-full md:max-w-[85%] px-4 py-10">
    <form onSubmit={submit} className="card p-5 max-w-md mx-auto space-y-3">
      <h1 className="font-bold text-lg">관리자 로그인</h1>
      <input className="w-full border rounded p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        type="password"
        className="w-full border rounded p-2"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {err ? <p className="text-red-600 text-sm">{err}</p> : null}
      <button className="bg-slate-900 text-white px-4 py-2 rounded">로그인</button>
    </form>
    </div>
  );
}

function flattenCategoryOptions(tree, prefix = "") {
  const out = [];
  for (const n of tree || []) {
    const label = prefix ? `${prefix} › ${n.name}` : n.name;
    out.push({ _id: n._id, label, level: n.level });
    if (n.children?.length) out.push(...flattenCategoryOptions(n.children, label));
  }
  return out;
}

const BOARD_IMAGE_FIELDS = new Set(["thumbnailUrl", "imageUrl", "mobileImageUrl", "logoUrl"]);
const BOARD_IMAGE_LABELS = {
  thumbnailUrl: "썸네일 이미지",
  imageUrl: "웹사이트 배너 이미지",
  mobileImageUrl: "모바일 배너 이미지",
  logoUrl: "로고 이미지",
};

const CRUD_FIELD_LABELS = {
  title: "제목",
  linkUrl: "배너 클릭 링크",
  sortOrder: "정렬순서",
  isActive: "숨김여부 (체크 시 숨김)",
  content: "본문 (이미지+글 모드에서는 HTML 가능)",
  imageUrl: "팝업 이미지",
  startAt: "노출 시작일시",
  endAt: "노출 종료일시",
  widthPx: "가로(px)",
  heightPx: "세로(px)",
  displayMode: "표시 방식",
  position: "화면 위치",
};

const PAGE_SEARCH_INPUT_CLASS = "h-10 w-full max-w-[620px] rounded border border-slate-300 px-3 text-sm";

function isBoardImageField(fieldName) {
  return BOARD_IMAGE_FIELDS.has(fieldName);
}

function AdminImageField({ label, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/admin/upload", fd);
      if (r.data?.url) onChange(r.data.url);
      else setErr("업로드 응답이 올바르지 않습니다.");
    } catch (er) {
      setErr(er.response?.data?.detail || er.response?.data?.error || "이미지 업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-800">{label}</label>
      <input type="file" accept="image/*" disabled={busy} onChange={onPick} className="block w-full text-sm border border-slate-200 rounded p-2 bg-white" />
      {busy ? <p className="text-xs text-slate-500">업로드 중…</p> : null}
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
      {value ? (
        <div className="flex flex-wrap items-start gap-3">
          <img src={value} alt="" className="max-h-36 max-w-full rounded border border-slate-200 object-contain bg-slate-50" />
          <button type="button" className="text-xs text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-50" onClick={() => onChange("")}>
            이미지 제거
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">파일을 선택하면 서버에 업로드되어 저장됩니다. (Cloudinary 설정 시 원격, 미설정 시 서버 로컬 폴더)</p>
      )}
    </div>
  );
}

function AdminDocumentField({ label, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileName = String(value || "").split("/").pop() || "";

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/admin/upload-document", fd);
      if (r.data?.url) onChange(r.data.url);
      else setErr("업로드 응답이 올바르지 않습니다.");
    } catch (er) {
      setErr(er.response?.data?.detail || er.response?.data?.error || "파일 업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-800">{label}</label>
      <input
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.hwp,.txt,image/*"
        disabled={busy}
        onChange={onPick}
        className="block w-full text-sm border border-slate-200 rounded p-2 bg-white"
      />
      {busy ? <p className="text-xs text-slate-500">업로드 중…</p> : null}
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
      {value ? (
        <div className="flex flex-wrap items-center gap-3">
          <a href={value} target="_blank" rel="noreferrer" className="text-sm text-blue-700 underline break-all">
            {fileName || "업로드 파일 열기"}
          </a>
          <button type="button" className="text-xs text-red-700 border border-red-200 px-2 py-1 rounded hover:bg-red-50" onClick={() => onChange("")}>
            파일 제거
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">파일을 선택하면 서버에 업로드되어 다운로드 URL이 저장됩니다.</p>
      )}
    </div>
  );
}

function AdminBoardPostAttachmentsField({ label = "첨부 파일", items, onChange }) {
  const list = Array.isArray(items) ? items : [];
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api.post("/admin/upload-document", fd);
      const url = r.data?.url;
      if (!url) {
        setErr("업로드 응답이 올바르지 않습니다.");
        return;
      }
      onChange([...list, { fileName: file.name, url }]);
    } catch (er) {
      setErr(er.response?.data?.detail || er.response?.data?.error || "파일 업로드에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-800">{label}</label>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.hwp,.txt,image/*"
        disabled={busy}
        onChange={onPick}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="text-sm border border-slate-300 rounded px-3 py-2 bg-white hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? "업로드 중…" : "파일 추가"}
      </button>
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
      {list.length ? (
        <ul className="space-y-2 border border-slate-200 rounded p-2 bg-slate-50">
          {list.map((a, idx) => (
            <li key={`${a.url}-${idx}`} className="flex flex-wrap items-center gap-2 text-sm">
              <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-700 underline break-all min-w-0 flex-1">
                {a.fileName || a.url.split("/").pop() || "파일"}
              </a>
              <button
                type="button"
                className="text-xs text-red-700 border border-red-200 px-2 py-1 rounded shrink-0 hover:bg-red-50"
                onClick={() => onChange(list.filter((_, i) => i !== idx))}
              >
                제거
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">여러 개 추가할 수 있습니다. (PDF, HWP, Office, ZIP 등)</p>
      )}
    </div>
  );
}

function CategoryTreeRows({ nodes, depth, onAddChild, onEdit, onDelete }) {
  if (!nodes?.length) return null;
  return (
    <>
      {nodes.map((n) => (
        <div key={n._id} className="border-b border-slate-100 last:border-0">
          <div className="flex flex-wrap items-center gap-2 py-2" style={{ paddingLeft: `${8 + depth * 20}px` }}>
            <span className="text-xs text-slate-400 w-6">L{n.level}</span>
            <span className="font-medium text-slate-800 flex-1 min-w-[120px]">{n.name}</span>
            <span className="text-xs text-slate-500">순서 {n.sortOrder}</span>
            {n.isActive === false ? <span className="text-xs text-amber-600">비활성</span> : null}
            {n.level < 4 ? (
              <button type="button" className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200" onClick={() => onAddChild(n)}>
                하위 추가
              </button>
            ) : null}
            <button type="button" className="text-xs px-2 py-1 border rounded hover:bg-slate-50" onClick={() => onEdit(n)}>
              수정
            </button>
            <button type="button" className="text-xs px-2 py-1 text-red-600 border border-red-100 rounded hover:bg-red-50" onClick={() => onDelete(n)}>
              삭제
            </button>
          </div>
          <CategoryTreeRows nodes={n.children} depth={depth + 1} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} />
        </div>
      ))}
    </>
  );
}

function AdminProductCategories() {
  const [scope, setScope] = useState(PRODUCT_CATEGORY_SCOPE.PRODUCTS);
  const [tree, setTree] = useState([]);
  const [flatItems, setFlatItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [rootName, setRootName] = useState("");
  const [childForm, setChildForm] = useState(null);
  const [childName, setChildName] = useState("");
  const [editForm, setEditForm] = useState(null);

  const load = () => {
    api
      .get("/admin/product-categories", { params: { scope } })
      .then((r) => {
        setTree(r.data.tree || []);
        setFlatItems(r.data.items || []);
      })
      .catch(() => setMsg("목록을 불러오지 못했습니다."));
  };

  useEffect(() => {
    load();
  }, [scope]);

  const addRoot = async (e) => {
    e.preventDefault();
    setMsg("");
    const name = rootName.trim();
    if (!name) return;
    try {
      await api.post("/admin/product-categories", { name, parentId: null, sortOrder: 0, scope });
      setRootName("");
      setMsg("등록되었습니다.");
      load();
    } catch (e2) {
      setMsg(e2.response?.data?.error || "등록 실패");
    }
  };

  const addChild = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!childForm?._id) return;
    const name = childName.trim();
    if (!name) return;
    try {
      await api.post("/admin/product-categories", { name, parentId: childForm._id, sortOrder: 0 });
      setChildName("");
      setChildForm(null);
      setMsg("하위 분류가 등록되었습니다.");
      load();
    } catch (e2) {
      setMsg(e2.response?.data?.error || "등록 실패");
    }
  };

  const onDelete = async (n) => {
    if (!window.confirm(`「${n.name}」분류를 삭제할까요?`)) return;
    setMsg("");
    try {
      await api.delete(`/admin/product-categories/${n._id}`);
      setMsg("삭제되었습니다.");
      load();
    } catch (e2) {
      setMsg(e2.response?.data?.error || "삭제 실패");
    }
  };

  const onEdit = (n) => {
    setMsg("");
    setEditForm({
      _id: n._id,
      name: n.name,
      sortOrder: n.sortOrder ?? 0,
      isActive: n.isActive !== false,
      parentId: n.parentId ? String(n.parentId) : "",
        scope: n.scope || PRODUCT_CATEGORY_SCOPE.BOTH,
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!editForm?._id) return;
    try {
      await api.put(`/admin/product-categories/${editForm._id}`, {
        name: editForm.name,
        sortOrder: Number(editForm.sortOrder) || 0,
        isActive: editForm.isActive,
        parentId: editForm.parentId || null,
        scope: editForm.scope || PRODUCT_CATEGORY_SCOPE.BOTH,
      });
      setEditForm(null);
      setMsg("수정되었습니다.");
      load();
    } catch (e2) {
      setMsg(e2.response?.data?.error || "수정 실패");
    }
  };

  const parentOptionsForEdit = () => {
    if (!editForm?._id) return [];
    const blocked = new Set();
    const walk = (id) => {
      blocked.add(String(id));
      flatItems.filter((x) => String(x.parentId) === String(id)).forEach((ch) => walk(ch._id));
    };
    walk(editForm._id);
    return flatItems.filter((x) => !blocked.has(String(x._id)));
  };

  return (
    <div className="card p-5 max-w-4xl space-y-4">
      <h2 className="font-bold text-lg">분류 관리</h2>
      <p className="text-sm text-slate-600">최대 4단계까지 조직도 형태로 추가할 수 있습니다. 하위 분류가 있거나 제품이 연결된 분류는 삭제할 수 없습니다.</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(PRODUCT_CATEGORY_SCOPE_LABELS).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setScope(k);
              setChildForm(null);
              setEditForm(null);
              setMsg("");
            }}
            className={`rounded px-3 py-1.5 text-sm ${
              scope === k ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={addRoot} className="flex flex-wrap gap-2 items-end border-b border-slate-200 pb-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-600 mb-1">최상위 분류 이름</label>
          <input className="w-full border rounded p-2 text-sm" value={rootName} onChange={(e) => setRootName(e.target.value)} placeholder="예: 분석시약" />
        </div>
        <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
          최상위 추가
        </button>
      </form>

      {childForm ? (
        <form onSubmit={addChild} className="bg-slate-50 p-4 rounded border border-slate-200 space-y-2">
          <div className="text-sm font-medium">「{childForm.name}」 아래 하위 분류</div>
          <input className="w-full border rounded p-2 text-sm" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="하위 분류 이름" />
          <div className="flex gap-2">
            <button type="submit" className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm">
              등록
            </button>
            <button type="button" className="text-sm text-slate-600 px-2" onClick={() => { setChildForm(null); setChildName(""); }}>
              취소
            </button>
          </div>
        </form>
      ) : null}

      {editForm ? (
        <form onSubmit={saveEdit} className="bg-amber-50/80 p-4 rounded border border-amber-200 space-y-3">
          <div className="font-medium text-sm">분류 수정</div>
          <label className="block text-xs text-slate-600">이름</label>
          <input className="w-full border rounded p-2 text-sm" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <label className="block text-xs text-slate-600">정렬 순서 (숫자)</label>
          <input className="w-full border rounded p-2 text-sm" type="number" value={editForm.sortOrder} onChange={(e) => setEditForm({ ...editForm, sortOrder: e.target.value })} />
          <label className="block text-xs text-slate-600">노출 범위</label>
          <select className="w-full border rounded p-2 text-sm" value={editForm.scope || PRODUCT_CATEGORY_SCOPE.BOTH} onChange={(e) => setEditForm({ ...editForm, scope: e.target.value })}>
            {Object.entries(PRODUCT_CATEGORY_SCOPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} />
            활성
          </label>
          <label className="block text-xs text-slate-600">상위 분류 (빈 값 = 최상위)</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={editForm.parentId}
            onChange={(e) => setEditForm({ ...editForm, parentId: e.target.value })}
          >
            <option value="">(최상위)</option>
            {parentOptionsForEdit().map((p) => (
              <option key={p._id} value={p._id}>
                {"—".repeat((p.level || 1) - 1)} {p.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="bg-slate-900 text-white px-3 py-1.5 rounded text-sm">
              저장
            </button>
            <button type="button" className="text-sm text-slate-600" onClick={() => setEditForm(null)}>
              닫기
            </button>
          </div>
        </form>
      ) : null}

      {msg ? <p className="text-sm text-slate-700">{msg}</p> : null}

      <div className="border rounded overflow-hidden">
        <div className="bg-slate-100 px-3 py-2 text-sm font-medium">분류 트리</div>
        <div className="p-2 max-h-[480px] overflow-y-auto">
          {tree.length === 0 ? <p className="text-sm text-slate-500 p-4">등록된 분류가 없습니다.</p> : null}
          <CategoryTreeRows
            nodes={tree}
            depth={0}
            onAddChild={(n) => {
              setChildForm(n);
              setChildName("");
              setEditForm(null);
            }}
            onEdit={(n) => {
              setEditForm({
                _id: n._id,
                name: n.name,
                sortOrder: n.sortOrder ?? 0,
                isActive: n.isActive !== false,
                parentId: n.parentId ? String(n.parentId) : "",
                scope: n.scope || PRODUCT_CATEGORY_SCOPE.BOTH,
              });
              setChildForm(null);
            }}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}

const PARTNER_TYPE_LABELS = { MANUFACTURER: "제조사/대리", SYNTHESIS: "합성 서비스" };
function categoryScopeForProductType(type) {
  return type === "SYNTHESIS" ? PRODUCT_CATEGORY_SCOPE.SYNTHESIS : PRODUCT_CATEGORY_SCOPE.PRODUCTS;
}

function AdminPartnersScreen() {
  const [mode, setMode] = useState("list");
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const blank = {
    name: "",
    type: "MANUFACTURER",
    logoUrl: "",
    description: "",
    websiteUrl: "",
    orderGuideHtml: "",
    sortOrder: 0,
    isActive: true,
  };
  const [form, setForm] = useState(blank);

  const load = () =>
    api
      .get("/admin/partners", { params: { q, page, limit: 20 } })
      .then((r) => setResult(r.data))
      .catch(() => setFeedback({ type: "error", message: "목록을 불러오지 못했습니다." }));

  useEffect(() => {
    if (mode === "list") load();
  }, [q, page, mode]);

  const save = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editing) await api.put(`/admin/partners/${editing}`, payload);
      else await api.post("/admin/partners", payload);
      setEditing(null);
      setForm(blank);
      setMode("list");
      setFeedback({ type: "success", message: "저장되었습니다." });
      load();
    } catch (e2) {
      setFeedback({ type: "error", message: e2.response?.data?.error || "저장에 실패했습니다." });
    }
  };

  const edit = (x) => {
    setEditing(x._id);
    setForm({
      name: x.name || "",
      type: x.type || "MANUFACTURER",
      logoUrl: x.logoUrl || "",
      description: x.description || "",
      websiteUrl: x.websiteUrl || "",
      orderGuideHtml: x.orderGuideHtml || "",
      sortOrder: x.sortOrder ?? 0,
      isActive: x.isActive !== false,
    });
    setMode("edit");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setMode("create");
  };

  const remove = async (id) => {
    if (!window.confirm("삭제할까요? 연결된 제품이 있으면 오류가 날 수 있습니다.")) return;
    setFeedback({ type: "", message: "" });
    try {
      await api.delete(`/admin/partners/${id}`);
      setFeedback({ type: "success", message: "삭제되었습니다." });
      load();
    } catch (e2) {
      setFeedback({ type: "error", message: e2.response?.data?.error || "삭제에 실패했습니다." });
    }
  };

  const onSearch = () => {
    setPage(1);
    setQ(searchInput.trim());
  };

  if (mode !== "list") {
    return (
      <form onSubmit={save} className="card p-4 space-y-3 max-w-3xl">
        <div className="flex justify-between items-center">
          <h2 className="font-bold">{mode === "create" ? "제조사 등록" : "제조사 수정"}</h2>
          <button type="button" onClick={() => setMode("list")} className="text-sm text-slate-600">
            목록으로
          </button>
        </div>
        <label className="block text-sm font-medium">이름</label>
        <input className="w-full border rounded p-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <label className="block text-sm font-medium">유형</label>
        <select className="w-full border rounded p-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {Object.entries(PARTNER_TYPE_LABELS).map(([k, lab]) => (
            <option key={k} value={k}>
              {lab}
            </option>
          ))}
        </select>
        <AdminImageField label="로고 이미지 URL" value={form.logoUrl} onChange={(url) => setForm({ ...form, logoUrl: url })} />
        <label className="block text-sm font-medium">소개 (짧은 설명)</label>
        <textarea className="w-full border rounded p-2 text-sm min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label className="block text-sm font-medium">웹사이트 URL</label>
        <input
          className="w-full border rounded p-2 text-sm"
          type="url"
          placeholder="https://"
          value={form.websiteUrl}
          onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
        />
        <div>
          <label className="block text-sm font-medium mb-1">주문가이드 안내 (주의·요구사항·납기 등)</label>
          <p className="text-xs text-slate-500 mb-2">에디터로 입력한 내용은 그대로 주문가이드 페이지에 표시됩니다.</p>
          <div className="border rounded overflow-hidden">
            <ClientCkEditor
              config={CKEDITOR_UPLOAD_CONFIG}
              data={form.orderGuideHtml || ""}
              onChange={(html) => setForm({ ...form, orderGuideHtml: html })}
            />
          </div>
        </div>
        <label className="block text-sm font-medium">정렬 순서 (작을수록 앞)</label>
        <input
          type="number"
          className="w-full border rounded p-2 text-sm max-w-[120px]"
          value={form.sortOrder}
          onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          공개(활성)
        </label>
        {feedback.message ? (
          <p className={`text-sm ${feedback.type === "error" ? "text-red-600" : "text-emerald-700"}`}>{feedback.message}</p>
        ) : null}
        <button type="submit" className="bg-slate-900 text-white px-3 py-2 rounded">
          저장
        </button>
      </form>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap gap-2 justify-between mb-3">
        <h2 className="font-bold">제조사 관리</h2>
        <button type="button" onClick={openCreate} className="bg-slate-900 text-white px-3 py-2 rounded text-sm">
          등록
        </button>
      </div>
      <div className="flex gap-2 mb-3">
        <input
          className={PAGE_SEARCH_INPUT_CLASS}
          placeholder="이름·소개·URL 검색"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
        />
        <button type="button" onClick={onSearch} className="px-3 py-2 rounded bg-slate-200">
          검색
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2 w-12">No</th>
              <th className="border p-2 text-left">이름</th>
              <th className="border p-2 text-left">유형</th>
              <th className="border p-2 w-16">정렬</th>
              <th className="border p-2 w-16">활성</th>
              <th className="border p-2 w-28">관리</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((x, idx) => (
              <tr key={x._id}>
                <td className="border p-2 text-center">{(page - 1) * (result.limit || 20) + idx + 1}</td>
                <td className="border p-2 font-medium">{x.name}</td>
                <td className="border p-2 text-slate-600">{PARTNER_TYPE_LABELS[x.type] || x.type}</td>
                <td className="border p-2 text-center">{x.sortOrder ?? 0}</td>
                <td className="border p-2 text-center">{x.isActive === false ? "N" : "Y"}</td>
                <td className="border p-2 text-center">
                  <button type="button" onClick={() => edit(x)} className="mr-2 text-blue-700">
                    수정
                  </button>
                  <button type="button" onClick={() => remove(x._id)} className="text-red-600">
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="border p-4 text-center text-slate-500">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-3 text-sm">
        <span>총 {result.total}건</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded disabled:opacity-40">
            이전
          </button>
          <span>
            {page} / {result.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= result.totalPages}
            onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>
      {feedback.message && mode === "list" ? (
        <p className={`text-sm mt-3 ${feedback.type === "error" ? "text-red-600" : "text-emerald-700"}`}>{feedback.message}</p>
      ) : null}
    </div>
  );
}

function AdminProductsScreen() {
  const [mode, setMode] = useState("list");
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [partners, setPartners] = useState([]);
  const [catOptions, setCatOptions] = useState([]);
  const buildEnabledExtraSections = (src = {}) =>
    Object.fromEntries(PRODUCT_EXTRA_HTML_FIELDS.map(({ field }) => [field, htmlFieldHasContent(src?.[field])]));

  const blank = {
    name: "",
    productNumber: "",
    category: "MANUFACTURER",
    categoryId: "",
    category2Id: "",
    partnerId: "",
    thumbnailUrl: "",
    imageUrl: "",
    shortDescription: "",
    featuresHtml: "",
    applicationHtml: "",
    componentsHtml: "",
    shippingStorageHtml: "",
    dataHtml: "",
    downloadHtml: "",
    downloadFileUrl: "",
    downloadFiles: [],
    contentHtml: "",
    specification: "",
    isRecommended: false,
    isNew: false,
    isActive: true,
  };
  const [form, setForm] = useState(blank);
  const [enabledExtraSections, setEnabledExtraSections] = useState(buildEnabledExtraSections(blank));
  const [enabledDownloadSection, setEnabledDownloadSection] = useState(Boolean(blank.downloadFileUrl) || (blank.downloadFiles || []).length > 0);

  const loadRefs = (categoryType = form.category) => {
    const scope = categoryScopeForProductType(categoryType);
    api.get("/admin/partners", { params: { page: 1, limit: 200 } }).then((r) => setPartners(r.data.items || []));
    api.get("/admin/product-categories", { params: { scope, includeBoth: true } }).then((r) => {
      setCatOptions(flattenCategoryOptions(r.data.tree || []));
    });
  };

  const load = () =>
    api
      .get("/admin/products", { params: { q, page, limit: 10 } })
      .then((r) => setResult(r.data))
      .catch(() => setFeedback({ type: "error", message: "목록을 불러오지 못했습니다." }));

  useEffect(() => {
    loadRefs(form.category);
  }, [form.category]);

  useEffect(() => {
    if (mode === "list") load();
  }, [q, page, mode]);

  const save = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });
    const payload = {
      ...form,
      categoryId: form.categoryId || null,
      category2Id: form.category2Id || null,
      partnerId: form.partnerId || undefined,
    };
    try {
      if (editing) await api.put(`/admin/products/${editing}`, payload);
      else await api.post("/admin/products", payload);
      setEditing(null);
      setForm(blank);
      setEnabledExtraSections(buildEnabledExtraSections(blank));
      setEnabledDownloadSection(Boolean(blank.downloadFileUrl) || (blank.downloadFiles || []).length > 0);
      setMode("list");
      setFeedback({ type: "success", message: "저장되었습니다." });
      load();
    } catch (e2) {
      setFeedback({ type: "error", message: e2.response?.data?.error || "저장에 실패했습니다." });
    }
  };

  const edit = (x) => {
    setEditing(x._id);
    const nextForm = {
      name: x.name || "",
      productNumber: x.productNumber || "",
      category: x.category || "MANUFACTURER",
      categoryId: x.categoryId?._id ? String(x.categoryId._id) : x.categoryId ? String(x.categoryId) : "",
      category2Id: x.category2Id?._id ? String(x.category2Id._id) : x.category2Id ? String(x.category2Id) : "",
      partnerId: x.partnerId?._id ? String(x.partnerId._id) : String(x.partnerId || ""),
      thumbnailUrl: x.thumbnailUrl || "",
      imageUrl: x.imageUrl || "",
      shortDescription: x.shortDescription || "",
      featuresHtml: x.featuresHtml || "",
      applicationHtml: x.applicationHtml || "",
      componentsHtml: x.componentsHtml || "",
      shippingStorageHtml: x.shippingStorageHtml || "",
      dataHtml: x.dataHtml || "",
      downloadHtml: x.downloadHtml || "",
      downloadFileUrl: x.downloadFileUrl || "",
      downloadFiles: Array.isArray(x.downloadFiles)
        ? x.downloadFiles.map((f) => ({ fileName: String(f?.fileName || "").trim(), url: String(f?.url || "").trim() })).filter((f) => f.url)
        : x.downloadFileUrl
        ? [{ fileName: "", url: x.downloadFileUrl }]
        : [],
      contentHtml: x.contentHtml || "",
      specification: x.specification || "",
      isRecommended: Boolean(x.isRecommended),
      isNew: Boolean(x.isNew),
      isActive: x.isActive !== false,
    };
    setForm(nextForm);
    setEnabledExtraSections(buildEnabledExtraSections(nextForm));
    setEnabledDownloadSection(Boolean(nextForm.downloadFileUrl) || nextForm.downloadFiles.length > 0);
    setMode("edit");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setEnabledExtraSections(buildEnabledExtraSections(blank));
    setEnabledDownloadSection(Boolean(blank.downloadFileUrl) || (blank.downloadFiles || []).length > 0);
    setMode("create");
  };

  const remove = async (id) => {
    if (!window.confirm("삭제할까요?")) return;
    setFeedback({ type: "", message: "" });
    try {
      await api.delete(`/admin/products/${id}`);
      setFeedback({ type: "success", message: "삭제되었습니다." });
      load();
    } catch (e2) {
      setFeedback({ type: "error", message: e2.response?.data?.error || "삭제에 실패했습니다." });
    }
  };

  const onSearch = () => {
    setPage(1);
    setQ(searchInput.trim());
  };

  if (mode !== "list") {
    return (
      <form onSubmit={save} className="card p-4 space-y-3 max-w-4xl">
        <div className="flex justify-between items-center">
          <h2 className="font-bold">{mode === "create" ? "제품 등록" : "제품 수정"}</h2>
          <button type="button" onClick={() => setMode("list")} className="text-sm text-slate-600">
            목록으로
          </button>
        </div>
        <label className="block text-sm font-medium">제품명</label>
        <input className="w-full border rounded p-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <label className="block text-sm font-medium">제품번호</label>
        <input
          className="w-full border rounded p-2 text-sm"
          value={form.productNumber}
          onChange={(e) => setForm({ ...form, productNumber: e.target.value })}
          placeholder="예: A-1000"
        />
        <label className="block text-sm font-medium">사업 구분 (기존 필터용)</label>
        <select className="w-full border rounded p-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {Object.entries(PARTNER_TYPE_LABELS).map(([k, lab]) => (
            <option key={k} value={k}>
              {lab}
            </option>
          ))}
        </select>
        <label className="block text-sm font-medium">분류 (조직도, 최대 4단계)</label>
        <select className="w-full border rounded p-2 text-sm" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">(분류 미지정)</option>
          {catOptions.map((c) => (
            <option key={c._id} value={c._id}>
              {c.label}
            </option>
          ))}
        </select>
        <label className="block text-sm font-medium">분류2 (조직도, 최대 4단계)</label>
        <select className="w-full border rounded p-2 text-sm" value={form.category2Id} onChange={(e) => setForm({ ...form, category2Id: e.target.value })}>
          <option value="">(분류2 미지정)</option>
          {catOptions.map((c) => (
            <option key={`second-${c._id}`} value={c._id}>
              {c.label}
            </option>
          ))}
        </select>
        <label className="block text-sm font-medium">고객사/제조사</label>
        <select className="w-full border rounded p-2 text-sm" value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })} required>
          <option value="">선택</option>
          {partners.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
        <AdminImageField
          label="썸네일 이미지"
          value={form.thumbnailUrl}
          onChange={(url) => setForm({ ...form, thumbnailUrl: url })}
        />
        <AdminImageField
          label="대표 사진"
          value={form.imageUrl}
          onChange={(url) => setForm({ ...form, imageUrl: url })}
        />
        <label className="block text-sm font-medium">짧은 설명</label>
        <input className="w-full border rounded p-2 text-sm" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
        <p className="text-xs text-slate-500">
          아래 항목은 내용이 있는 경우에만 제품 상세 페이지에 표시됩니다. 상세정보(본문) 위에 순서대로 노출됩니다.
        </p>
        {PRODUCT_EXTRA_HTML_FIELDS.map(({ field, heading }) => (
          <div key={field}>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={Boolean(enabledExtraSections[field])}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setEnabledExtraSections((prev) => ({ ...prev, [field]: checked }));
                  if (!checked) setForm((prev) => ({ ...prev, [field]: "" }));
                }}
              />
              {heading} 사용
            </label>
            {enabledExtraSections[field] ? (
              <div className="border rounded mt-1">
                <ClientCkEditor
                  config={CKEDITOR_UPLOAD_CONFIG}
                  data={form[field] || ""}
                  onChange={(html) => setForm({ ...form, [field]: html })}
                />
              </div>
            ) : null}
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={enabledDownloadSection}
            onChange={(e) => {
              const checked = e.target.checked;
              setEnabledDownloadSection(checked);
              if (!checked) setForm((prev) => ({ ...prev, downloadFileUrl: "", downloadFiles: [] }));
            }}
          />
          자료 다운로드 사용
        </label>
        {enabledDownloadSection ? (
          <AdminBoardPostAttachmentsField
            label="자료 다운로드 파일 업로드"
            items={form.downloadFiles}
            onChange={(downloadFiles) =>
              setForm((prev) => ({
                ...prev,
                downloadFiles,
                downloadFileUrl: downloadFiles[0]?.url || "",
              }))
            }
          />
        ) : null}
        <label className="block text-sm font-medium">상세정보 (본문 HTML)</label>
        <div className="border rounded">
          <ClientCkEditor
            config={CKEDITOR_UPLOAD_CONFIG}
            data={form.contentHtml || ""}
            onChange={(html) => setForm({ ...form, contentHtml: html })}
          />
        </div>
        <label className="block text-sm font-medium">규격</label>
        <textarea className="w-full border rounded p-2 text-sm min-h-[72px]" value={form.specification} onChange={(e) => setForm({ ...form, specification: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(form.isRecommended)} onChange={(e) => setForm({ ...form, isRecommended: e.target.checked })} />
          NEW 표시 (메인 추천제품 노출)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(form.isNew)} onChange={(e) => setForm({ ...form, isNew: e.target.checked })} />
          HOT 표시 (메인 신상품 노출)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          활성
        </label>
        {feedback.message ? (
          <p className={`text-sm ${feedback.type === "error" ? "text-red-600" : "text-emerald-700"}`}>{feedback.message}</p>
        ) : null}
        <button type="submit" className="bg-slate-900 text-white px-3 py-2 rounded">
          저장
        </button>
      </form>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap gap-2 justify-between mb-3">
        <h2 className="font-bold">제품 관리</h2>
        <button type="button" onClick={openCreate} className="bg-slate-900 text-white px-3 py-2 rounded text-sm">
          등록
        </button>
      </div>
      <div className="flex gap-2 mb-3">
        <input
          className={PAGE_SEARCH_INPUT_CLASS}
          placeholder="검색어"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
        />
        <button type="button" onClick={onSearch} className="px-3 py-2 rounded bg-slate-200">
          검색
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2 w-12">No</th>
              <th className="border p-2 text-left">제품명</th>
              <th className="border p-2 text-left">제품번호</th>
              <th className="border p-2 text-left">분류</th>
              <th className="border p-2 text-left">분류2</th>
              <th className="border p-2 w-20">활성</th>
              <th className="border p-2 w-32">관리</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((x, idx) => (
              <tr key={x._id}>
                <td className="border p-2 text-center">{(result.page - 1) * 10 + idx + 1}</td>
                <td className="border p-2">{x.name}</td>
                <td className="border p-2 text-slate-600">{x.productNumber || "—"}</td>
                <td className="border p-2 text-slate-600">{x.categoryId?.name || "—"}</td>
                <td className="border p-2 text-slate-600">{x.category2Id?.name || "—"}</td>
                <td className="border p-2 text-center">{x.isActive === false ? "N" : "Y"}</td>
                <td className="border p-2 text-center">
                  <button type="button" onClick={() => edit(x)} className="mr-2 text-blue-700">
                    수정
                  </button>
                  <button type="button" onClick={() => remove(x._id)} className="text-red-600">
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="border p-4 text-center text-slate-500">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center mt-3 text-sm">
        <span>총 {result.total}건</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded disabled:opacity-40">
            이전
          </button>
          <span>
            {page} / {result.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= result.totalPages}
            onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>
      {feedback.message && mode === "list" ? (
        <p className={`text-sm mt-3 ${feedback.type === "error" ? "text-red-600" : "text-emerald-700"}`}>{feedback.message}</p>
      ) : null}
    </div>
  );
}

function toDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CrudScreen({ title, path, fields }) {
  const [mode, setMode] = useState("list");
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const blank = useMemo(() => {
    const o = {};
    for (const f of fields) {
      if (path === "popups") {
        if (f === "isActive") {
          o[f] = true;
          continue;
        }
        if (f === "sortOrder") {
          o[f] = 0;
          continue;
        }
        if (f === "widthPx") {
          o[f] = 400;
          continue;
        }
        if (f === "heightPx") {
          o[f] = 520;
          continue;
        }
        if (f === "displayMode") {
          o[f] = "image_only";
          continue;
        }
        if (f === "position") {
          o[f] = "center";
          continue;
        }
      }
      o[f] = "";
    }
    return o;
  }, [fields, path]);
  const [form, setForm] = useState(blank);

  const load = () =>
    api
      .get(`/admin/${path}`, { params: { q, page, limit: 10 } })
      .then((r) => setResult(r.data))
      .catch(() => setFeedback({ type: "error", message: "목록을 불러오지 못했습니다." }));

  useEffect(() => {
    if (mode === "list") load();
  }, [path, q, page, mode]);

  const save = async (e) => {
    e.preventDefault();
    setFeedback({ type: "", message: "" });
    let payload = { ...form };
    if (path === "popups") {
      payload = {
        ...payload,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      };
    }
    try {
      if (editing) await api.put(`/admin/${path}/${editing}`, payload);
      else await api.post(`/admin/${path}`, payload);
      setEditing(null);
      setForm(blank);
      setMode("list");
      setFeedback({ type: "success", message: "저장되었습니다." });
      load();
    } catch (e2) {
      setFeedback({ type: "error", message: e2.response?.data?.error || "저장에 실패했습니다." });
    }
  };

  const edit = (x) => {
    setEditing(x._id);
    setForm(
      Object.fromEntries(
        fields.map((f) => {
          let val = x[f];
          if ((f === "startAt" || f === "endAt") && val) val = toDatetimeLocal(val);
          else if (val === undefined || val === null) val = "";
          return [f, val];
        })
      )
    );
    setMode("edit");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setMode("create");
  };

  const remove = async (id) => {
    setFeedback({ type: "", message: "" });
    try {
      await api.delete(`/admin/${path}/${id}`);
      setFeedback({ type: "success", message: "삭제되었습니다." });
      load();
    } catch (e2) {
      setFeedback({ type: "error", message: e2.response?.data?.error || "삭제에 실패했습니다." });
    }
  };

  const onSearch = () => {
    setPage(1);
    setQ(searchInput.trim());
  };

  if (mode !== "list") {
    return (
      <form onSubmit={save} className="card p-4 space-y-2">
        <div className="flex justify-between items-center">
          <h2 className="font-bold">{mode === "create" ? "등록 페이지" : "수정 페이지"}</h2>
          <button type="button" onClick={() => setMode("list")} className="text-sm text-slate-600">
            목록으로
          </button>
        </div>
        {fields.map((f) => {
          const lower = f.toLowerCase();
          const v = form[f];

          if (lower.includes("description") || lower === "content" || lower === "specification") {
            return (
              <textarea
                key={f}
                className="w-full border rounded p-2 min-h-24"
                placeholder={f}
                value={v}
                onChange={(e) => setForm({ ...form, [f]: e.target.value })}
              />
            );
          }
          if (lower.startsWith("is")) {
            const isBannerHiddenField = path === "banners" && f === "isActive";
            const checkedValue = isBannerHiddenField ? !Boolean(v === true || v === "true") : Boolean(v === true || v === "true");
            return (
              <label key={f} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checkedValue}
                  onChange={(e) => {
                    if (isBannerHiddenField) setForm({ ...form, [f]: !e.target.checked });
                    else setForm({ ...form, [f]: e.target.checked });
                  }}
                />
                {path === "banners" && f === "isActive"
                  ? CRUD_FIELD_LABELS[f] || f
                  : path === "popups" && f === "isActive"
                    ? "사이트에 표시 (체크 시 노출)"
                    : CRUD_FIELD_LABELS[f] || f}
              </label>
            );
          }
          if (isBoardImageField(f)) {
            return (
              <AdminImageField
                key={f}
                label={path === "popups" && f === "imageUrl" ? "팝업 이미지" : BOARD_IMAGE_LABELS[f] || f}
                value={typeof v === "string" ? v : ""}
                onChange={(url) => setForm({ ...form, [f]: url })}
              />
            );
          }
          if (f === "displayMode") {
            return (
              <div key={f} className="space-y-1">
                <label className="block text-sm font-medium">{CRUD_FIELD_LABELS[f] || f}</label>
                <select
                  className="w-full border rounded p-2"
                  value={v || "image_only"}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                >
                  <option value="image_only">이미지(또는 글)만 전체 표시</option>
                  <option value="image_overlay">이미지 배경 + 앞에 본문 HTML</option>
                </select>
              </div>
            );
          }
          if (f === "position") {
            return (
              <div key={f} className="space-y-1">
                <label className="block text-sm font-medium">{CRUD_FIELD_LABELS[f] || f}</label>
                <select
                  className="w-full border rounded p-2"
                  value={v || "center"}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                >
                  <option value="center">화면 중앙</option>
                  <option value="top_left">왼쪽 위</option>
                  <option value="top_right">오른쪽 위</option>
                  <option value="bottom_left">왼쪽 아래</option>
                  <option value="bottom_right">오른쪽 아래</option>
                </select>
              </div>
            );
          }
          if (f === "startAt" || f === "endAt") {
            return (
              <div key={f} className="space-y-1">
                <label className="block text-sm font-medium">{CRUD_FIELD_LABELS[f] || f}</label>
                <input
                  type="datetime-local"
                  className="w-full border rounded p-2"
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                />
              </div>
            );
          }
          if (f === "sortOrder" || f === "level" || f === "viewCount" || f === "widthPx" || f === "heightPx") {
            return (
              <div key={f} className="space-y-1">
                <label className="block text-sm font-medium">{CRUD_FIELD_LABELS[f] || f}</label>
                <input
                  type="number"
                  className="w-full border rounded p-2"
                  placeholder={f}
                  value={v === "" || v === null || v === undefined ? "" : v}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                />
              </div>
            );
          }
          return (
            <div key={f} className="space-y-1">
              <label className="block text-sm font-medium">{CRUD_FIELD_LABELS[f] || f}</label>
              <input className="w-full border rounded p-2" placeholder={f} value={v} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
            </div>
          );
        })}

        {feedback.message ? (
          <p className={`text-sm ${feedback.type === "error" ? "text-red-600" : "text-emerald-700"}`}>
            {feedback.message}
          </p>
        ) : null}
        <button className="bg-slate-900 text-white px-3 py-2 rounded">저장</button>
      </form>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap gap-2 justify-between mb-3">
        <h2 className="font-bold">{title}</h2>
        <button type="button" onClick={openCreate} className="bg-slate-900 text-white px-3 py-2 rounded text-sm">
          등록
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          className={PAGE_SEARCH_INPUT_CLASS}
          placeholder="검색어 입력"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
        />
        <button type="button" onClick={onSearch} className="px-3 py-2 rounded bg-slate-200">
          검색
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2 w-16">No</th>
              <th className="border p-2 text-left">제목/이름</th>
              <th className="border p-2 w-24">{path === "banners" ? "숨김" : "활성"}</th>
              <th className="border p-2 w-48">작성일</th>
              <th className="border p-2 w-32">관리</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((x, idx) => (
              <tr key={x._id}>
                <td className="border p-2 text-center">{(result.page - 1) * 10 + idx + 1}</td>
                <td className="border p-2">{x.title || x.name}</td>
                <td className="border p-2 text-center">{path === "banners" ? (x.isActive === false ? "Y" : "N") : x.isActive === false ? "N" : "Y"}</td>
                <td className="border p-2 text-center">{x.createdAt ? new Date(x.createdAt).toLocaleString() : "-"}</td>
                <td className="border p-2 text-center">
                  <button type="button" onClick={() => edit(x)} className="mr-2 text-blue-700">
                    수정
                  </button>
                  <button type="button" onClick={() => remove(x._id)} className="text-red-600">
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {result.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="border p-4 text-center text-slate-500">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-3 text-sm">
        <span>총 {result.total}건</span>
        <div className="flex items-center gap-2">
          <button type="button" disabled={result.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded disabled:opacity-40">
            이전
          </button>
          <span>
            {result.page} / {result.totalPages}
          </span>
          <button
            type="button"
            disabled={result.page >= result.totalPages}
            onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>

      {feedback.message ? (
        <p className={`text-sm mt-3 ${feedback.type === "error" ? "text-red-600" : "text-emerald-700"}`}>
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

const INQUIRY_STATUS = ["NEW", "IN_PROGRESS", "DONE"];

function AdminLogoSettings() {
  const [data, setData] = useState({});
  const [msg, setMsg] = useState("");
  const load = () => api.get("/admin/site-settings").then((r) => setData(r.data));
  useEffect(() => {
    load();
  }, []);
  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await api.put("/admin/site-settings", {
        headerLogoUrl: data.headerLogoUrl,
        companyName: data.companyName,
      });
      setMsg("저장되었습니다.");
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || "저장 실패");
    }
  };
  return (
    <form onSubmit={save} className="card p-5 space-y-4 max-w-2xl">
      <h2 className="font-bold text-lg">로고 관리</h2>
      <p className="text-sm text-slate-600">헤더 로고 이미지를 업로드하거나 URL을 직접 입력할 수 있습니다. 푸터 로고는 &quot;푸터 관리&quot;에서 설정합니다.</p>
      <AdminImageField label="헤더 로고 이미지 업로드" value={data.headerLogoUrl || ""} onChange={(url) => setData({ ...data, headerLogoUrl: url })} />
      <label className="block text-sm font-medium">헤더 로고 URL (직접 입력)</label>
      <input
        className="w-full border rounded p-2 text-sm"
        placeholder="https://..."
        value={data.headerLogoUrl || ""}
        onChange={(e) => setData({ ...data, headerLogoUrl: e.target.value })}
      />
      <label className="block text-sm font-medium">회사명 (푸터 로고 아래 표시)</label>
      <input className="w-full border rounded p-2 text-sm" value={data.companyName || ""} onChange={(e) => setData({ ...data, companyName: e.target.value })} />
      {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
      <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
        저장
      </button>
    </form>
  );
}

function AdminFooterSettings() {
  const [data, setData] = useState({});
  const [msg, setMsg] = useState("");
  const load = () => api.get("/admin/site-settings").then((r) => setData(r.data));
  useEffect(() => {
    load();
  }, []);
  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await api.put("/admin/site-settings", {
        footerLogoUrl: data.footerLogoUrl,
        footerTopBar: data.footerTopBar,
        copyrightText: data.copyrightText,
        showFooterAddress: data.showFooterAddress === true,
        address: data.address,
        tel: data.tel,
        fax: data.fax,
        email: data.email,
        businessRegistrationNumber: data.businessRegistrationNumber,
        termsTitle: data.termsTitle,
        termsUrl: data.termsUrl,
        privacyTitle: data.privacyTitle,
        privacyUrl: data.privacyUrl,
      });
      setMsg("저장되었습니다.");
      load();
    } catch (err) {
      setMsg(err.response?.data?.error || "저장 실패");
    }
  };
  return (
    <form onSubmit={save} className="card p-5 space-y-4 max-w-3xl">
      <h2 className="font-bold text-lg">푸터 관리</h2>
      <p className="text-sm text-slate-600">푸터 로고는 이미지 업로드 또는 URL로 설정할 수 있습니다. 연락처, 주소, 안내문구도 함께 관리합니다.</p>
      <AdminImageField label="푸터 로고 이미지 업로드" value={data.footerLogoUrl || ""} onChange={(url) => setData({ ...data, footerLogoUrl: url })} />
      <label className="block text-sm font-medium">푸터 로고 URL (직접 입력)</label>
      <input
        className="w-full border rounded p-2 text-sm"
        placeholder="https://..."
        value={data.footerLogoUrl || ""}
        onChange={(e) => setData({ ...data, footerLogoUrl: e.target.value })}
      />
      <label className="block text-sm font-medium">안내문구</label>
      <p className="text-xs text-slate-500 -mt-2 mb-1">푸터 상단 회색 바에 표시됩니다. 여러 줄 입력 가능합니다.</p>
      <textarea
        className="w-full border rounded p-2 text-sm min-h-[72px] whitespace-pre-wrap"
        placeholder="예: 제품 문의 안내, 영업시간 등"
        value={data.footerTopBar || ""}
        onChange={(e) => setData({ ...data, footerTopBar: e.target.value })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={data.showFooterAddress === true} onChange={(e) => setData({ ...data, showFooterAddress: e.target.checked })} />
        푸터 주소/오시는길 노출
      </label>
      <label className="block text-sm font-medium">주소</label>
      <textarea className="w-full border rounded p-2 text-sm min-h-[60px]" value={data.address || ""} onChange={(e) => setData({ ...data, address: e.target.value })} />
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium">전화번호</label>
          <input className="w-full border rounded p-2 text-sm" value={data.tel || ""} onChange={(e) => setData({ ...data, tel: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium">팩스</label>
          <input className="w-full border rounded p-2 text-sm" value={data.fax || ""} onChange={(e) => setData({ ...data, fax: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium">이메일</label>
          <input className="w-full border rounded p-2 text-sm" type="email" value={data.email || ""} onChange={(e) => setData({ ...data, email: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">사업자등록번호</label>
        <input
          className="w-full border rounded p-2 text-sm"
          placeholder="예: 123-45-67890"
          value={data.businessRegistrationNumber || ""}
          onChange={(e) => setData({ ...data, businessRegistrationNumber: e.target.value })}
        />
      </div>
      <label className="block text-sm font-medium">Copyright 문구</label>
      <textarea className="w-full border rounded p-2 text-sm min-h-[72px]" value={data.copyrightText || ""} onChange={(e) => setData({ ...data, copyrightText: e.target.value })} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">이용약관 버튼 문구</label>
          <input className="w-full border rounded p-2 text-sm" value={data.termsTitle || ""} onChange={(e) => setData({ ...data, termsTitle: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium">이용약관 링크 URL</label>
          <input className="w-full border rounded p-2 text-sm" value={data.termsUrl || ""} onChange={(e) => setData({ ...data, termsUrl: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium">개인정보 버튼 문구</label>
          <input className="w-full border rounded p-2 text-sm" value={data.privacyTitle || ""} onChange={(e) => setData({ ...data, privacyTitle: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium">개인정보 링크 URL</label>
          <input className="w-full border rounded p-2 text-sm" value={data.privacyUrl || ""} onChange={(e) => setData({ ...data, privacyUrl: e.target.value })} />
        </div>
      </div>
      {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
      <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
        저장
      </button>
    </form>
  );
}

function AdminAccountsScreen() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState("list");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [msg, setMsg] = useState("");
  const limit = 8;
  const load = () => api.get("/admin/system-admins").then((r) => setItems(r.data.items || []));
  useEffect(() => {
    load();
  }, []);
  const filtered = items.filter((a) => !q.trim() || a.email.toLowerCase().includes(q.toLowerCase()) || (a.name || "").toLowerCase().includes(q.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const paged = filtered.slice((page - 1) * limit, page * limit);
  const remove = async (id) => {
    if (!window.confirm("이 관리자를 삭제할까요?")) return;
    setMsg("");
    try {
      await api.delete(`/admin/system-admins/${id}`);
      setMsg("삭제되었습니다.");
      load();
    } catch (e) {
      setMsg(e.response?.data?.error || "삭제 실패");
    }
  };
  const create = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await api.post("/admin/system-admins", form);
      setForm({ email: "", password: "", name: "" });
      setMode("list");
      setMsg("등록되었습니다.");
      load();
    } catch (e) {
      setMsg(e.response?.data?.error || "등록 실패");
    }
  };
  if (mode === "create") {
    return (
      <form onSubmit={create} className="card p-5 max-w-md space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold">관리자 등록</h2>
          <button type="button" className="text-sm text-slate-600" onClick={() => setMode("list")}>
            목록
          </button>
        </div>
        <input className="w-full border rounded p-2" placeholder="이메일" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="w-full border rounded p-2" type="password" placeholder="비밀번호" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <input className="w-full border rounded p-2" placeholder="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        {msg ? <p className="text-sm text-slate-700">{msg}</p> : null}
        <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
          저장
        </button>
      </form>
    );
  }
  return (
    <div className="card p-4">
      <div className="flex flex-wrap gap-2 justify-between mb-3">
        <h2 className="font-bold">관리자 관리</h2>
        <button type="button" onClick={() => { setMsg(""); setMode("create"); }} className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded">
          등록
        </button>
      </div>
      <input className={`${PAGE_SEARCH_INPUT_CLASS} mb-3`} placeholder="이메일·이름 검색" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      {msg ? <p className="text-sm mb-2 text-slate-700">{msg}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2 w-12">No</th>
              <th className="border p-2 text-left">이메일</th>
              <th className="border p-2 text-left">이름</th>
              <th className="border p-2">등록일</th>
              <th className="border p-2 w-24">관리</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((a, idx) => (
              <tr key={a._id}>
                <td className="border p-2 text-center">{(page - 1) * limit + idx + 1}</td>
                <td className="border p-2">{a.email}</td>
                <td className="border p-2">{a.name}</td>
                <td className="border p-2 text-center text-xs">{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "-"}</td>
                <td className="border p-2 text-center">
                  <button type="button" className="text-red-600" onClick={() => remove(a._id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2 mt-3 text-sm">
        <button type="button" disabled={page <= 1} className="px-2 py-1 border rounded disabled:opacity-40" onClick={() => setPage((p) => Math.max(1, p - 1))}>
          이전
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button type="button" disabled={page >= totalPages} className="px-2 py-1 border rounded disabled:opacity-40" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
          다음
        </button>
      </div>
    </div>
  );
}

function InquiriesAdmin() {
  const [items, setItems] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const load = () => api.get("/admin/inquiries").then((r) => setItems(r.data));

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    setFeedback("");
    try {
      await api.patch(`/admin/inquiries/${id}/status`, { status });
      setFeedback("상태가 업데이트되었습니다.");
      load();
    } catch (e) {
      setFeedback(e.response?.data?.error || "상태 변경에 실패했습니다.");
    }
  };

  const filtered = items.filter((x) => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return true;
    return (
      String(x.name || "").toLowerCase().includes(keyword) ||
      String(x.email || "").toLowerCase().includes(keyword) ||
      String(x.affiliation || x.company || "").toLowerCase().includes(keyword) ||
      String(x.brand || "").toLowerCase().includes(keyword) ||
      String(x.catalogNumber || "").toLowerCase().includes(keyword) ||
      String(x.productName || x.productId?.name || "").toLowerCase().includes(keyword)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const paged = filtered.slice((page - 1) * limit, page * limit);

  return (
    <div className="card p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold">견적문의</h2>
        <input
          className={PAGE_SEARCH_INPUT_CLASS}
          placeholder="이름·이메일·소속·브랜드·카탈로그·제품명"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {feedback ? <p className="text-sm mb-3 text-slate-700">{feedback}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2 w-16">No</th>
              <th className="border p-2 text-left">문의자/제품</th>
              <th className="border p-2 text-left">연락처</th>
              <th className="border p-2 text-left">문의내용</th>
              <th className="border p-2 w-40">상태</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((i, idx) => (
              <tr key={i._id}>
                <td className="border p-2 text-center">{(page - 1) * limit + idx + 1}</td>
                <td className="border p-2">
                  <span className="text-xs text-slate-500">
                    {i.inquirerType === "DEALER" ? "업자" : i.inquirerType === "USER" ? "유저" : ""}
                  </span>
                  {i.inquirerType ? " · " : ""}
                  {i.name}
                  <br />
                  <span className="text-slate-600">{i.affiliation || i.company || "-"}</span>
                  <br />
                  <span className="font-medium">{i.productName || i.productId?.name || "-"}</span>
                  {(i.brand || i.catalogNumber) && (
                    <span className="block text-xs text-slate-500 mt-0.5">
                      {i.brand ? `브랜드: ${i.brand}` : ""}
                      {i.brand && i.catalogNumber ? " · " : ""}
                      {i.catalogNumber ? `Cat: ${i.catalogNumber}` : ""}
                    </span>
                  )}
                </td>
                <td className="border p-2">
                  {i.email}
                  <br />
                  {i.phone}
                </td>
                <td className="border p-2 max-w-xl whitespace-pre-wrap">
                  {i.message?.trim() ? i.message : <span className="text-slate-400">(내용 없음)</span>}
                  {i.attachmentUrl ? (
                    <div className="mt-2 text-xs">
                      <a href={i.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline break-all">
                        첨부파일
                      </a>
                    </div>
                  ) : null}
                </td>
                <td className="border p-2 text-center">
                  <select className="border rounded p-1" value={i.status} onChange={(e) => updateStatus(i._id, e.target.value)}>
                    {INQUIRY_STATUS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {paged.length === 0 ? (
              <tr>
                <td colSpan={5} className="border p-4 text-center text-slate-500">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end items-center mt-3 gap-2 text-sm">
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded disabled:opacity-40">
          이전
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-2 py-1 border rounded disabled:opacity-40"
        >
          다음
        </button>
      </div>
    </div>
  );
}

function AdminBoardsPanel() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState("list");
  const [form, setForm] = useState({
    slug: "",
    title: "",
    subtitle: "",
    displayType: "TABLE",
    showSearch: true,
    sortOrder: 0,
    isActive: true,
  });
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/admin/boards").then((r) => setItems(r.data.items || []));

  useEffect(() => {
    load();
  }, []);

  const createBoard = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await api.post("/admin/boards", { ...form, sortOrder: Number(form.sortOrder) || 0 });
      setForm({ slug: "", title: "", subtitle: "", displayType: "TABLE", showSearch: true, sortOrder: 0, isActive: true });
      setMsg("게시판이 등록되었습니다.");
      setMode("list");
      load();
    } catch (er) {
      setMsg(er.response?.data?.error || "등록 실패");
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing?._id) return;
    setMsg("");
    try {
      await api.put(`/admin/boards/${editing._id}`, {
        title: editing.title,
        subtitle: editing.subtitle,
        displayType: editing.displayType,
        showSearch: editing.showSearch,
        sortOrder: Number(editing.sortOrder) || 0,
        isActive: editing.isActive,
      });
      setEditing(null);
      setMsg("저장되었습니다.");
      setMode("list");
      load();
    } catch (er) {
      setMsg(er.response?.data?.error || "저장 실패");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("이 게시판을 삭제할까요? (글이 없을 때만 가능)")) return;
    setMsg("");
    try {
      await api.delete(`/admin/boards/${id}`);
      setMsg("삭제되었습니다.");
      load();
    } catch (er) {
      setMsg(er.response?.data?.error || "삭제 실패");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setMode("create");
    setMsg("");
    setForm({ slug: "", title: "", subtitle: "", displayType: "TABLE", showSearch: true, sortOrder: 0, isActive: true });
  };

  const openEdit = (board) => {
    setEditing({ ...board });
    setMode("edit");
    setMsg("");
  };

  if (mode === "create") {
    return (
      <form onSubmit={createBoard} className="card p-5 space-y-3 max-w-4xl">
        <div className="flex justify-between items-center">
          <h3 className="font-bold">게시판 등록</h3>
          <button type="button" className="text-sm text-slate-600" onClick={() => setMode("list")}>
            목록으로
          </button>
        </div>
        <p className="text-sm text-slate-600">
          slug는 영문 소문자·숫자·하이픈입니다. 기본 게시판: <code className="text-xs bg-slate-100 px-1 rounded">notices</code>,{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">events</code>, <code className="text-xs bg-slate-100 px-1 rounded">references</code> (각각{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">/notices</code> 등). 그 외 slug는 공개 주소{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">/board/슬러그</code> 로 접속합니다.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">slug (영문·숫자·하이픈)</label>
            <input className="w-full border rounded p-2 text-sm" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="promo-board" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">표시 형식</label>
            <select className="w-full border rounded p-2 text-sm" value={form.displayType} onChange={(e) => setForm({ ...form, displayType: e.target.value })}>
              {Object.entries(BOARD_DISPLAY_LABELS).map(([k, lab]) => (
                <option key={k} value={k}>
                  {lab}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">게시판 제목</label>
            <input className="w-full border rounded p-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="홍보물" required />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">부제목 (목록 상단 설명)</label>
            <input className="w-full border rounded p-2 text-sm" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" checked={form.showSearch} onChange={(e) => setForm({ ...form, showSearch: e.target.checked })} />
            공개 페이지 검색창 표시
          </label>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">정렬 순서</label>
            <input type="number" className="w-full border rounded p-2 text-sm" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            활성
          </label>
        </div>
        {msg ? <p className="text-sm text-slate-700">{msg}</p> : null}
        <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
          등록
        </button>
      </form>
    );
  }

  if (mode === "edit" && editing) {
    return (
      <form onSubmit={saveEdit} className="card p-5 space-y-3 border-2 border-amber-200 bg-amber-50/50 max-w-4xl">
        <div className="flex justify-between items-center">
          <h3 className="font-bold">게시판 수정 ({editing.slug})</h3>
          <button type="button" className="text-sm text-slate-600" onClick={() => { setEditing(null); setMode("list"); }}>
            목록으로
          </button>
        </div>
        <input className="w-full border rounded p-2 text-sm" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
        <input className="w-full border rounded p-2 text-sm" value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} placeholder="부제목" />
        <select className="w-full border rounded p-2 text-sm" value={editing.displayType} onChange={(e) => setEditing({ ...editing, displayType: e.target.value })}>
          {Object.entries(BOARD_DISPLAY_LABELS).map(([k, lab]) => (
            <option key={k} value={k}>
              {lab}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editing.showSearch !== false} onChange={(e) => setEditing({ ...editing, showSearch: e.target.checked })} />
          공개 페이지 검색창 표시
        </label>
        <input type="number" className="w-full border rounded p-2 text-sm" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} />
          활성
        </label>
        {msg ? <p className="text-sm text-slate-700">{msg}</p> : null}
        <div className="flex gap-2">
          <button type="submit" className="bg-slate-900 text-white px-3 py-2 rounded text-sm">
            저장
          </button>
          <button type="button" className="text-sm text-slate-600" onClick={() => { setEditing(null); setMode("list"); }}>
            취소
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h2 className="font-bold">게시판 목록</h2>
        <button type="button" onClick={openCreate} className="bg-slate-900 text-white px-3 py-2 rounded text-sm">
          등록
        </button>
      </div>
      {msg ? <p className="text-sm text-slate-700">{msg}</p> : null}

      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2 text-left">slug</th>
              <th className="border p-2 text-left">제목</th>
              <th className="border p-2 text-left">형식</th>
              <th className="border p-2 text-center">검색창</th>
              <th className="border p-2">활성</th>
              <th className="border p-2 w-32">관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b._id}>
                <td className="border p-2 font-mono text-xs">{b.slug}</td>
                <td className="border p-2">{b.title}</td>
                <td className="border p-2">{BOARD_DISPLAY_LABELS[b.displayType] || b.displayType}</td>
                <td className="border p-2 text-center">{b.showSearch === false ? "숨김" : "표시"}</td>
                <td className="border p-2 text-center">{b.isActive === false ? "N" : "Y"}</td>
                <td className="border p-2 text-center">
                  <button type="button" className="text-blue-700 mr-2" onClick={() => openEdit(b)}>
                    수정
                  </button>
                  <button type="button" className="text-red-600" onClick={() => remove(b._id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminBoardPostsPanel() {
  const [boards, setBoards] = useState([]);
  const [products, setProducts] = useState([]);
  const [boardId, setBoardId] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [mode, setMode] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState("");
  const blank = {
    boardId: "",
    title: "",
    summary: "",
    content: "",
    thumbnailUrl: "",
    isImportant: false,
    isActive: true,
    startAt: "",
    endAt: "",
    forceEnded: false,
    youtubeUrl: "",
    relatedProductId: "",
    attachments: [],
  };
  const [form, setForm] = useState(blank);

  const loadBoards = () => api.get("/admin/boards").then((r) => setBoards(r.data.items || []));
  const loadProducts = () =>
    api
      .get("/admin/products", { params: { page: 1, limit: 300 } })
      .then((r) => setProducts(Array.isArray(r.data?.items) ? r.data.items : []))
      .catch(() => setProducts([]));

  const loadPosts = () => {
    if (!boardId) return;
    api
      .get("/admin/board-posts", { params: { boardId, page, limit: 10 } })
      .then((r) => setResult(r.data))
      .catch(() => setMsg("글 목록을 불러오지 못했습니다."));
  };

  useEffect(() => {
    loadBoards();
    loadProducts();
  }, []);

  useEffect(() => {
    if (boards.length && !boardId) setBoardId(boards[0]._id);
  }, [boards]);

  useEffect(() => {
    if (mode === "list" && boardId) loadPosts();
  }, [boardId, page, mode]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...blank, boardId: boardId || "" });
    setMode("create");
    setMsg("");
  };

  const editPost = (row) => {
    setEditingId(row._id);
    setForm({
      boardId: row.boardId || boardId,
      title: row.title || "",
      summary: row.summary || "",
      content: row.content || "",
      thumbnailUrl: row.thumbnailUrl || "",
      isImportant: !!row.isImportant,
      isActive: row.isActive !== false,
      startAt: toDatetimeLocal(row.startAt),
      endAt: toDatetimeLocal(row.endAt),
      forceEnded: row.forceEnded === true,
      youtubeUrl: row.youtubeUrl || "",
      relatedProductId: row.relatedProductId?._id ? String(row.relatedProductId._id) : String(row.relatedProductId || ""),
      attachments: Array.isArray(row.attachments) ? row.attachments.map((a) => ({ fileName: a.fileName || "", url: a.url || "" })) : [],
    });
    setMode("edit");
    setMsg("");
  };

  const savePost = async (e) => {
    e.preventDefault();
    setMsg("");
    const payload = {
      ...form,
      boardId: form.boardId || boardId,
      startAt: form.startAt || null,
      endAt: form.endAt || null,
    };
    try {
      if (editingId) await api.put(`/admin/board-posts/${editingId}`, payload);
      else await api.post("/admin/board-posts", payload);
      setMode("list");
      setEditingId(null);
      setForm(blank);
      setMsg("저장되었습니다.");
      loadPosts();
    } catch (er) {
      setMsg(er.response?.data?.error || "저장 실패");
    }
  };

  const delPost = async (id) => {
    if (!window.confirm("삭제할까요?")) return;
    try {
      await api.delete(`/admin/board-posts/${id}`);
      setMsg("삭제되었습니다.");
      loadPosts();
    } catch (er) {
      setMsg(er.response?.data?.error || "삭제 실패");
    }
  };

  if (mode !== "list") {
    return (
      <form onSubmit={savePost} className="card p-5 space-y-3 max-w-2xl">
        <div className="flex justify-between items-center">
          <h3 className="font-bold">{editingId ? "글 수정" : "글 등록"}</h3>
          <button type="button" className="text-sm text-slate-600" onClick={() => setMode("list")}>
            목록으로
          </button>
        </div>
        <label className="block text-xs font-medium text-slate-600">게시판</label>
        <select className="w-full border rounded p-2 text-sm" value={form.boardId || boardId} onChange={(e) => setForm({ ...form, boardId: e.target.value })} required>
          {boards.map((b) => (
            <option key={b._id} value={b._id}>
              {b.title} ({b.slug})
            </option>
          ))}
        </select>
        <label className="block text-xs font-medium text-slate-600">제목</label>
        <input className="w-full border rounded p-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <label className="block text-xs font-medium text-slate-600">요약 (갤러리는 줄바꿈으로 항목 구분 가능)</label>
        <textarea className="w-full border rounded p-2 text-sm min-h-[72px]" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
        <label className="block text-xs font-medium text-slate-600">본문</label>
        <div className="border rounded bg-white">
          <ClientCkEditor
            config={CKEDITOR_UPLOAD_CONFIG}
            data={form.content || ""}
            onChange={(html) => setForm({ ...form, content: html })}
          />
        </div>
        <AdminImageField label="썸네일 이미지" value={form.thumbnailUrl} onChange={(url) => setForm({ ...form, thumbnailUrl: url })} />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">시작일시 (썸네일형·이벤트)</label>
            <input type="datetime-local" className="w-full border rounded p-2 text-sm" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">종료일시</label>
            <input type="datetime-local" className="w-full border rounded p-2 text-sm" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.forceEnded === true} onChange={(e) => setForm({ ...form, forceEnded: e.target.checked })} />
          기간과 무관하게 종료로 표시
        </label>
        <label className="block text-xs font-medium text-slate-600">YouTube URL (참고자료 등)</label>
        <input className="w-full border rounded p-2 text-sm" value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} />
        <label className="block text-xs font-medium text-slate-600">관련 제품 (선택)</label>
        <select
          className="w-full border rounded p-2 text-sm"
          value={form.relatedProductId || ""}
          onChange={(e) => setForm({ ...form, relatedProductId: e.target.value })}
        >
          <option value="">(미지정)</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} {p.productNumber ? `(${p.productNumber})` : ""}
            </option>
          ))}
        </select>
        <AdminBoardPostAttachmentsField
          items={form.attachments}
          onChange={(attachments) => setForm({ ...form, attachments })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isImportant} onChange={(e) => setForm({ ...form, isImportant: e.target.checked })} />
          상단 고정 (표형 공지)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          활성
        </label>
        {msg ? <p className="text-sm text-slate-700">{msg}</p> : null}
        <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
          저장
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">게시판 선택</label>
          <select className="border rounded p-2 text-sm min-w-[200px]" value={boardId} onChange={(e) => { setBoardId(e.target.value); setPage(1); }}>
            {boards.map((b) => (
              <option key={b._id} value={b._id}>
                {b.title} ({BOARD_DISPLAY_LABELS[b.displayType]})
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={openCreate} className="bg-slate-900 text-white px-4 py-2 rounded text-sm">
          글 등록
        </button>
      </div>
      {msg ? <p className="text-sm text-slate-700">{msg}</p> : null}
      <div className="card p-4 overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-slate-100">
            <tr>
              <th className="border p-2 w-12">No</th>
              <th className="border p-2 text-left">제목</th>
              <th className="border p-2 w-20">활성</th>
              <th className="border p-2 w-28">관리</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((row, idx) => (
              <tr key={row._id}>
                <td className="border p-2 text-center">{(page - 1) * 10 + idx + 1}</td>
                <td className="border p-2">{row.title}</td>
                <td className="border p-2 text-center">{row.isActive === false ? "N" : "Y"}</td>
                <td className="border p-2 text-center">
                  <button type="button" className="text-blue-700 mr-2" onClick={() => editPost(row)}>
                    수정
                  </button>
                  <button type="button" className="text-red-600" onClick={() => delPost(row._id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.items.length === 0 ? <p className="text-sm text-slate-500 p-4 text-center">글이 없습니다.</p> : null}
      </div>
      <div className="flex justify-center gap-2 text-sm">
        <button type="button" disabled={page <= 1} className="px-2 py-1 border rounded disabled:opacity-40" onClick={() => setPage((p) => Math.max(1, p - 1))}>
          이전
        </button>
        <span>
          {page} / {result.totalPages}
        </span>
        <button type="button" disabled={page >= result.totalPages} className="px-2 py-1 border rounded disabled:opacity-40" onClick={() => setPage((p) => p + 1)}>
          다음
        </button>
      </div>
    </div>
  );
}

const ADMIN_NAV_ICON_CLASS = "h-4 w-4 shrink-0 opacity-90";

function AdminNavIcon({ id }) {
  const c = ADMIN_NAV_ICON_CLASS;
  switch (id) {
    case "main":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" strokeLinejoin="round" />
        </svg>
      );
    case "logo":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
        </svg>
      );
    case "footer":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 6h16v12H4z" strokeLinejoin="round" />
          <path d="M8 14h8M8 10h5" strokeLinecap="round" />
        </svg>
      );
    case "admins":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" strokeLinejoin="round" />
          <path d="M4 20a8 8 0 0 1 16 0" strokeLinecap="round" />
        </svg>
      );
    case "boardSettings":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
        </svg>
      );
    case "boardPosts":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" strokeLinejoin="round" />
          <path d="M9 9h6M9 12h6" strokeLinecap="round" />
        </svg>
      );
    case "productCategories":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M8 6h13M8 12h13M8 18h13" strokeLinecap="round" />
          <path d="M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" />
        </svg>
      );
    case "partners":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 19V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14" strokeLinejoin="round" />
          <path d="M8 15h8M8 11h5" strokeLinecap="round" />
        </svg>
      );
    case "products":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 8.5 12 4l8 4.5v7L12 20 4 15.5v-7Z" strokeLinejoin="round" />
          <path d="M12 9v11" strokeLinecap="round" />
        </svg>
      );
    case "popups":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="5" y="6" width="14" height="10" rx="1.5" />
          <rect x="7" y="9" width="10" height="6" rx="1" opacity=".5" />
        </svg>
      );
    case "banners":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="6" width="18" height="12" rx="1.5" />
          <path d="M7 10h4M7 14h2" strokeLinecap="round" />
        </svg>
      );
    case "inquiries":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" strokeLinejoin="round" />
          <path d="M9 9h6M9 12h4" strokeLinecap="round" />
        </svg>
      );
    case "analytics":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 19h16M7 15l3-4 3 2 5-6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 15V9M10 11V7M13 13V5M16 9v6" strokeLinecap="round" />
        </svg>
      );
    default:
      return <span className={`${c} inline-block rounded bg-slate-600`} aria-hidden />;
  }
}

function AdminSidebarStats() {
  const [data, setData] = useState(null);

  const load = () => {
    api
      .get("/admin/analytics/summary")
      .then((r) => setData(r.data))
      .catch(() => setData(null));
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60000);
    return () => window.clearInterval(id);
  }, []);

  const timeStr =
    data?.generatedAt != null
      ? new Date(data.generatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
      : new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  const row = (label, value) => (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold tabular-nums text-slate-900">{typeof value === "number" ? `${value.toLocaleString()}명` : "—"}</span>
    </div>
  );

  return (
    <div className="mt-3 rounded border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm">
      <p className="mb-2 text-center text-[11px] font-bold text-[#0b4a8f]">{timeStr}</p>
      <div className="space-y-1.5">
        {row("오늘", data?.todayVisitors)}
        {row("어제", data?.yesterdayVisitors)}
        {row("이달", data?.thisMonthUniqueVisitors)}
        {row("전체", data?.totalUniqueVisitors)}
      </div>
    </div>
  );
}

function AdminAnalyticsScreen() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setErr("");
    api
      .get("/admin/analytics/summary")
      .then((r) => setData(r.data))
      .catch(() => {
        setData(null);
        setErr("통계를 불러오지 못했습니다.");
      });
  }, []);

  const statClass = "rounded-lg border border-slate-200 bg-white p-5 shadow-sm";
  const numClass = "text-2xl font-bold tabular-nums text-slate-900";
  const labelClass = "text-sm text-slate-500 mt-1";

  return (
    <div className="max-w-4xl space-y-4">
      <p className="text-sm text-slate-600">
        공개 사이트에서 페이지를 열 때마다 집계됩니다. 방문자는 브라우저에 저장된 익명 ID 기준이며, 날짜는{" "}
        <strong>한국 시간(KST)</strong> 기준입니다.
      </p>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={statClass}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">오늘 방문자</p>
            <p className={numClass}>{data.todayVisitors.toLocaleString()}</p>
            <p className={labelClass}>오늘({data.dayKeyKst}) 순방문(브라우저) 수</p>
          </div>
          <div className={statClass}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">어제 방문자</p>
            <p className={numClass}>{data.yesterdayVisitors.toLocaleString()}</p>
            <p className={labelClass}>어제({data.yesterdayKeyKst})</p>
          </div>
          <div className={statClass}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">이번 달 순 방문자</p>
            <p className={numClass}>{data.thisMonthUniqueVisitors.toLocaleString()}</p>
            <p className={labelClass}>
              {data.monthStartKeyKst} ~ {data.dayKeyKst} 기간 중 한 번이라도 방문한 서로 다른 ID
            </p>
          </div>
          <div className={statClass}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">전체 순 방문자</p>
            <p className={numClass}>{data.totalUniqueVisitors.toLocaleString()}</p>
            <p className={labelClass}>누적 서로 다른 방문자 ID 수</p>
          </div>
          <div className={statClass}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">오늘 페이지뷰</p>
            <p className={numClass}>{data.todayPageViews.toLocaleString()}</p>
            <p className={labelClass}>오늘 화면 전환·로딩 횟수 합계</p>
          </div>
          <div className={statClass}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">이번 달 페이지뷰</p>
            <p className={numClass}>{data.thisMonthPageViews.toLocaleString()}</p>
            <p className={labelClass}>이번 달 조회 수 합계</p>
          </div>
          <div className={statClass}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">전체 페이지뷰</p>
            <p className={numClass}>{data.totalPageViews.toLocaleString()}</p>
            <p className={labelClass}>누적 조회 수 합계</p>
          </div>
        </div>
      ) : !err ? (
        <p className="text-slate-500 text-sm">불러오는 중…</p>
      ) : null}
    </div>
  );
}

function AdminHome() {
  const basicTabs = ["logo", "footer", "admins"];
  const boardTabs = ["boardSettings", "boardPosts"];
  const [tab, setTab] = useState("logo");
  const [basicOpen, setBasicOpen] = useState(true);
  const [boardOpen, setBoardOpen] = useState(true);
  const router = useRouter();
  const siteTabOrder = ["productCategories", "partners", "products", "popups", "banners", "inquiries"];
  const tabs = {
    logo: <AdminLogoSettings />,
    footer: <AdminFooterSettings />,
    admins: <AdminAccountsScreen />,
    analytics: <AdminAnalyticsScreen />,
    banners: <CrudScreen title="배너 관리" path="banners" fields={["title", "imageUrl", "mobileImageUrl", "linkUrl", "isActive", "sortOrder"]} />,
    popups: (
      <CrudScreen
        title="팝업 관리"
        path="popups"
        fields={[
          "title",
          "displayMode",
          "position",
          "widthPx",
          "heightPx",
          "imageUrl",
          "content",
          "sortOrder",
          "startAt",
          "endAt",
          "isActive",
        ]}
      />
    ),
    productCategories: <AdminProductCategories />,
    partners: <AdminPartnersScreen />,
    products: <AdminProductsScreen />,
    boardSettings: <AdminBoardsPanel />,
    boardPosts: <AdminBoardPostsPanel />,
    inquiries: <InquiriesAdmin />,
  };
  const labels = {
    logo: "로고 관리",
    footer: "푸터 관리",
    admins: "관리자 관리",
    analytics: "접속 통계",
    banners: "배너 관리",
    popups: "팝업 관리",
    productCategories: "분류 관리",
    partners: "제조사 관리",
    products: "제품 관리",
    boardSettings: "게시판 설정",
    boardPosts: "글 관리",
    inquiries: "견적문의 관리",
  };

  const logout = () => {
    setToken(null);
    router.push("/admin/login");
  };

  const selectBasic = (k) => {
    setTab(k);
    setBasicOpen(true);
  };

  const isBoardTab = boardTabs.includes(tab);
  const isBasicTab = basicTabs.includes(tab);
  const isSiteTab = siteTabOrder.includes(tab);
  const isVisitorTab = tab === "analytics";

  const navLeaf = (k, iconId) => (
    <button
      key={k}
      type="button"
      onClick={() => setTab(k)}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${
        tab === k ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      <AdminNavIcon id={iconId} />
      <span className="min-w-0 flex-1">{labels[k]}</span>
      <span className="text-[10px] opacity-35" aria-hidden>
        ›
      </span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex">
        <aside className="flex min-h-screen w-[260px] shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-white">
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <Link href="/" className="mb-1 block px-1 text-lg font-bold tracking-tight text-white">
              Admin Console
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md bg-rose-700 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-600"
            >
              <AdminNavIcon id="main" />
              메인 화면
            </Link>

            <nav className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto pb-2">
              <p className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Basic manage</p>
              <button
                type="button"
                onClick={() => setBasicOpen((o) => !o)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-sm font-medium ${
                  isBasicTab ? "bg-slate-800 text-white" : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <AdminNavIcon id="logo" />
                  기본 설정
                </span>
                <span className="text-xs opacity-60" aria-hidden>
                  {basicOpen ? "▼" : "▶"}
                </span>
              </button>
              {basicOpen ? <div className="mb-2 ml-1 space-y-0.5 border-l border-slate-600 pl-2">{basicTabs.map((k) => navLeaf(k, k))}</div> : null}

              <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Board</p>
              <button
                type="button"
                onClick={() => setBoardOpen((o) => !o)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-sm font-medium ${
                  isBoardTab ? "bg-slate-800 text-white" : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <AdminNavIcon id="boardPosts" />
                  게시판
                </span>
                <span className="text-xs opacity-60" aria-hidden>
                  {boardOpen ? "▼" : "▶"}
                </span>
              </button>
              {boardOpen ? (
                <div className="mb-2 ml-1 space-y-0.5 border-l border-slate-600 pl-2">
                  {boardTabs.map((k) => navLeaf(k, k))}
                </div>
              ) : null}

              <p className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Site manage</p>
              <div className="space-y-0.5">{siteTabOrder.map((k) => navLeaf(k, k))}</div>

              <p className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Visitors stats</p>
              {navLeaf("analytics", "analytics")}
            </nav>

            <div className="mt-auto shrink-0 border-t border-slate-700 pt-3">
              <AdminSidebarStats />
              <button
                type="button"
                onClick={logout}
                className="mt-2 w-full rounded-md px-2 py-2 text-left text-sm text-red-300 hover:bg-slate-800 hover:text-red-200"
              >
                로그아웃
              </button>
            </div>
          </div>
        </aside>
        <main className="flex-1 p-6">
          <div className="mb-4">
            <h1 className="text-xl font-bold">
              {isBasicTab ? (
                <>
                  <span className="text-slate-500 font-medium text-base">기본 설정</span>
                  <span className="mx-2 text-slate-400 font-normal">›</span>
                  <span>{labels[tab]}</span>
                </>
              ) : isBoardTab ? (
                <>
                  <span className="text-slate-500 font-medium text-base">게시판</span>
                  <span className="mx-2 text-slate-400 font-normal">›</span>
                  <span>{labels[tab]}</span>
                </>
              ) : isSiteTab ? (
                <>
                  <span className="text-slate-500 font-medium text-base">사이트 관리</span>
                  <span className="mx-2 text-slate-400 font-normal">›</span>
                  <span>{labels[tab]}</span>
                </>
              ) : isVisitorTab ? (
                <span>{labels[tab]}</span>
              ) : (
                labels[tab]
              )}
            </h1>
          </div>
          {tabs[tab]}
        </main>
      </div>
    </div>
  );
}

export {
  Layout,
  Home,
  PartnersPage,
  ProductCatalogPage,
  PartnerProducts,
  ProductDetail,
  OrderGuidePage,
  CompanyAboutPage,
  DirectionsPage,
  BoardListPage,
  BoardPostDetailPage,
  BoardListPageFromParam,
  BoardPostDetailFromParam,
  InquiryPage,
  AdminLogin,
  AdminHome,
};

