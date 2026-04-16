import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, setToken } from "./lib/api";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

function IconInquiry({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M7 4.75h10A1.25 1.25 0 0 1 18.25 6v12A1.25 1.25 0 0 1 17 19.25H7A1.25 1.25 0 0 1 5.75 18V6A1.25 1.25 0 0 1 7 4.75Z" strokeLinejoin="round" />
      <path d="M9 9h6M9 12h6M9 15h4" strokeLinecap="round" />
      <path d="m14.5 18.5 1.25-1.25 1.75 1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M5 7h14M5 12h14M5 17h14" strokeLinecap="round" />
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
  { to: "/notices", label: "공지사항" },
  { to: "/customer/order-guide", label: "주문가이드" },
  { to: "/customer/about", label: "회사소개" },
  { to: "/customer/directions", label: "오시는길" },
  { to: "/inquiry", label: "견적문의" },
];

const TOP_MENUS = [
  { key: "partners", to: "/partners", label: "공식제조사", en: "MANUFACTURERS" },
  { key: "products", to: "/products", label: "제품소개", en: "PRODUCTS" },
  { key: "synthesis", to: "/synthesis", label: "합성서비스", en: "SYNTHESIS" },
  { key: "events", to: "/events", label: "이벤트", en: "EVENTS" },
  { key: "references", to: "/references", label: "참고논문", en: "REFERENCES" },
  { key: "support", to: "/notices", label: "고객지원", en: "CUSTOMER SUPPORT" },
];

const FOOTER_MENU_GROUPS = [
  {
    title: "제품소개",
    items: [
      { to: "/partners", label: "공식제조사" },
      { to: "/products", label: "제품소개" },
      { to: "/synthesis", label: "합성서비스" },
    ],
  },
  {
    title: "소식/자료",
    items: [
      { to: "/events", label: "이벤트" },
      { to: "/references", label: "참고논문" },
      { to: "/notices", label: "공지사항" },
    ],
  },
  {
    title: "고객지원",
    items: CUSTOMER_SUPPORT_SUB.filter((x) => x.to !== "/inquiry"),
  },
];

function getDropdownItemsByMenu(menuKey, categoryTree) {
  const flattenCategoryLinks = (nodes, depth = 0) => {
    const links = [];
    for (const node of nodes || []) {
      links.push({
        to: `/products?categoryId=${node._id}`,
        label: `${depth > 0 ? `${" -".repeat(depth)} ` : ""}${node.name}`,
      });
      if (node.children?.length) links.push(...flattenCategoryLinks(node.children, depth + 1));
    }
    return links;
  };
  if (menuKey === "products") {
    if (!categoryTree?.length) return [{ to: "/products", label: "전체 제품 보기" }];
    const out = [{ to: "/products", label: "전체 제품 보기" }, ...flattenCategoryLinks(categoryTree)];
    return out;
  }
  if (menuKey === "support") return CUSTOMER_SUPPORT_SUB;
  const menu = TOP_MENUS.find((m) => m.key === menuKey);
  return menu ? [{ to: menu.to, label: `${menu.label} 바로가기` }] : [];
}

function MobileCategoryLinks({ nodes, closeMenus, depth = 0 }) {
  return (nodes || []).map((node) => (
    <div key={node._id}>
      <Link to={`/products?categoryId=${node._id}`} className={`block py-0.5 ${depth === 0 ? "font-medium" : "text-xs opacity-90 pl-2"}`} onClick={closeMenus}>
        {`${depth > 0 ? `${" -".repeat(depth)} ` : ""}${node.name}`}
      </Link>
      {node.children?.length ? <MobileCategoryLinks nodes={node.children} closeMenus={closeMenus} depth={depth + 1} /> : null}
    </div>
  ));
}

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState("");
  const [panelMenuKey, setPanelMenuKey] = useState("");
  const [panelVisible, setPanelVisible] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [site, setSite] = useState(null);
  const [categoryTree, setCategoryTree] = useState([]);

  const submitHeaderSearch = (e) => {
    e.preventDefault();
    const q = headerSearch.trim();
    navigate(q ? `/partners?search=${encodeURIComponent(q)}` : "/partners");
    setMenuOpen(false);
    setActiveDropdown("");
  };

  const closeMenus = () => {
    setMenuOpen(false);
    setActiveDropdown("");
  };

  useEffect(() => {
    api
      .get("/site-settings")
      .then((r) => setSite(r.data))
      .catch(() => setSite(null));
  }, []);

  useEffect(() => {
    api
      .get("/product-categories")
      .then((r) => setCategoryTree(r.data?.tree || []))
      .catch(() => setCategoryTree([]));
  }, []);

  useEffect(() => {
    setActiveDropdown("");
    setMenuOpen(false);
  }, [location.pathname]);

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

  const navLinkClass = ({ isActive }) =>
    `whitespace-nowrap pb-1 border-b-2 transition-colors ${
      isActive ? "border-[#002D5E] text-[#002D5E] font-semibold" : "border-transparent text-slate-700 hover:text-[#002D5E] hover:border-[#002D5E]/50"
    }`;

  const activeMenu = TOP_MENUS.find((m) => m.key === panelMenuKey) || null;
  const activeItems = getDropdownItemsByMenu(panelMenuKey, categoryTree);

  return (
    <div className="flex min-h-screen grow flex-col overflow-x-clip bg-white">
      <header className="sticky top-0 z-[100] shrink-0 bg-slate-100 text-slate-900 shadow-sm border-b border-slate-200">
        <div
          className={`container mx-auto max-w-full md:max-w-[70%] px-4 flex flex-col py-3 md:py-4 ${
            menuOpen ? "min-h-[150px] h-auto justify-start gap-3 md:h-[150px] md:justify-center md:gap-3" : "h-[150px] justify-center gap-3"
          }`}
        >
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            <Link to="/" className="shrink-0 flex items-center" title="홈" onClick={closeMenus}>
              <img
                src={site?.headerLogoUrl || "/logo.svg"}
                alt=""
                className="h-14 md:h-16 w-auto max-h-[72px] object-contain"
              />
            </Link>

            <form onSubmit={submitHeaderSearch} className="flex-1 min-w-0">
              <div className="relative">
                <input
                  className="w-full rounded-md bg-white text-slate-900 pl-4 pr-11 py-3 text-sm placeholder:text-slate-400 border-0 shadow-inner"
                  placeholder="찾으시는 제품·제조사 키워드를 입력해 주세요."
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-600 hover:text-slate-900"
                  aria-label="검색"
                >
                  <IconSearch />
                </button>
              </div>
            </form>

            <div className="flex items-center gap-1 shrink-0">
              <Link
                to="/inquiry"
                className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-200"
                title="견적문의"
                onClick={closeMenus}
              >
                <span className="text-slate-400">
                  <IconInquiry className="w-7 h-7" />
                </span>
                <span className="hidden sm:block leading-tight">
                  <span className="block text-[11px] text-slate-700 font-medium">온라인 견적문의</span>
                  <span className="block text-[23px] md:text-[25px] text-[#234E84] font-extrabold -mt-0.5 tracking-[-0.01em]">바로가기</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-11 w-11 md:hidden inline-flex items-center justify-center rounded-md hover:bg-slate-200"
                title="메뉴"
                aria-expanded={menuOpen}
              >
                <IconMenu />
              </button>
            </div>
          </div>

          <div className="relative hidden md:block shrink-0 md:mt-2" onMouseLeave={() => setActiveDropdown("")}>
            <nav className="flex w-full flex-wrap items-center justify-between gap-y-1 text-base lg:text-[17px] font-semibold">
              {TOP_MENUS.map((m) => (
                <NavLink
                  key={m.key}
                  to={m.to}
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

            {activeMenu ? (
              <div
                className={`absolute left-1/2 top-full z-[120] w-screen max-w-none -translate-x-1/2 border-t border-slate-300 bg-white text-left text-slate-900 shadow-lg transition-all duration-200 ease-out ${
                  panelVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
                }`}
                role="navigation"
                aria-label={`${activeMenu.label} 하위 메뉴`}
              >
                <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-6">
                  <div className="mx-auto max-w-[960px] grid grid-cols-[220px_minmax(0,1fr)] gap-8 items-center min-h-[160px]">
                    <div className="min-w-0 self-center">
                      <h3 className="text-2xl md:text-[30px] font-bold text-slate-950 leading-tight">{activeMenu.label}</h3>
                      <p className="text-slate-700 font-semibold tracking-wide mt-2 text-xs md:text-sm">{activeMenu.en}</p>
                    </div>
                    {activeItems.length > 0 ? (
                      <ul className="grid grid-cols-1 gap-y-1 pt-1 w-full max-w-[320px] mx-auto text-left">
                        {activeItems.map((item) => (
                          <li key={`${activeMenu.key}-${item.to}-${item.label}`} className="w-full">
                            <Link to={item.to} className="block w-full text-slate-900 hover:text-[#002D5E] text-[15px] md:text-base leading-8" onClick={closeMenus}>
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="pt-1 text-slate-700 text-sm text-center">표시할 하위 메뉴가 없습니다.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {menuOpen ? (
            <nav className="md:hidden shrink-0 border-t border-slate-300 pt-3 pb-1 max-h-[min(60vh,420px)] overflow-y-auto text-sm">
              <div className="flex flex-col gap-3">
                {TOP_MENUS.map((m) => (
                  <NavLink key={m.key} to={m.to} end={m.key === "products"} className={navLinkClass} onClick={closeMenus}>
                    {m.label}
                  </NavLink>
                ))}
                <div className="pl-2 border-l border-slate-300 space-y-1.5 text-slate-700">
                  {categoryTree.length === 0 ? (
                    <Link to="/products" className="block py-0.5" onClick={closeMenus}>
                      전체 제품
                    </Link>
                  ) : (
                    <MobileCategoryLinks nodes={categoryTree} closeMenus={closeMenus} />
                  )}
                  {CUSTOMER_SUPPORT_SUB.map((s) => (
                    <Link key={s.to} to={s.to} className="block py-0.5" onClick={closeMenus}>
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="grow w-full min-h-0">{children}</main>
      <footer className="mt-0 shrink-0 border-t border-slate-200 bg-slate-100">
        <div className="bg-slate-100">
          <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-8 space-y-6">
            <div className="pb-6 border-b border-slate-300">
              <div>
                {site?.footerLogoUrl ? (
                  <img src={site.footerLogoUrl} alt="" className="max-w-[200px] h-auto object-contain" />
                ) : (
                  <div className="h-14 w-40 rounded bg-slate-100 border border-slate-200" />
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)] items-start pb-6 border-b border-slate-300">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {FOOTER_MENU_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="text-sm font-semibold text-slate-800 mb-2">{group.title}</p>
                    <ul className="space-y-1">
                      {group.items.map((item) => (
                        <li key={`${group.title}-${item.to}`}>
                          <Link to={item.to} className="text-sm text-slate-600 hover:text-[#002D5E]">
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="text-sm text-slate-600 space-y-2 leading-relaxed">
                {site?.address ? <p>{site.address}</p> : null}
                <p>
                  {site?.tel ? <span>TEL {site.tel}</span> : null}
                  {site?.tel && site?.fax ? <span className="mx-1">|</span> : null}
                  {site?.fax ? <span>FAX {site.fax}</span> : null}
                  {(site?.tel || site?.fax) && site?.email ? <span className="mx-1">|</span> : null}
                  {site?.email ? (
                    <span>
                      이메일{" "}
                      <a href={`mailto:${site.email}`} className="text-[#002D5E] underline">
                        {site.email}
                      </a>
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="flex flex-wrap justify-center gap-2">
                {site?.termsUrl ? (
                  <a
                    href={site.termsUrl}
                    className="inline-block px-3 py-1.5 text-xs border border-slate-300 rounded bg-slate-50 text-slate-800 hover:bg-slate-100"
                  >
                    {site.termsTitle || "이용약관"}
                  </a>
                ) : null}
                {site?.privacyUrl ? (
                  <a
                    href={site.privacyUrl}
                    className="inline-block px-3 py-1.5 text-xs border border-slate-300 rounded bg-slate-50 text-slate-800 hover:bg-slate-100"
                  >
                    {site.privacyTitle || "개인정보취급방침"}
                  </a>
                ) : null}
              </div>
              {site?.copyrightText ? (
                <p className="text-xs text-slate-600">{site.copyrightText}</p>
              ) : (
                <p className="text-xs text-slate-400">저작권 문구를 관리자에서 설정해 주세요.</p>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
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

function PageBreadcrumb({ segments, subMenus = [], subMenuAnchorIndex = -1 }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isCurrentSubMenu = (to) => location.pathname === to || location.pathname.startsWith(`${to}/`);
  const anchorIndex = subMenus.length ? (subMenuAnchorIndex >= 0 ? subMenuAnchorIndex : (segments || []).length - 1) : -1;

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="mt-2 md:mt-3">
      <nav className="flex flex-wrap items-center gap-x-1.5 text-xs sm:text-sm text-slate-500" aria-label="현재 위치">
        <Link to="/" className="inline-flex items-center shrink-0 text-slate-500 hover:text-[#002D5E]" title="홈" aria-label="홈">
          <IconHomeCrumb />
        </Link>
        {(segments || []).map((seg, i) => (
          <span key={i} className="relative inline-flex items-center gap-x-1.5 min-w-0">
            <span className="text-slate-300 shrink-0" aria-hidden>
              |
            </span>
            {subMenus.length && i === anchorIndex ? (
              <>
                {seg.to ? (
                  <Link to={seg.to} className="hover:text-[#002D5E] truncate min-w-0">
                    {seg.label}
                  </Link>
                ) : (
                  <span className="truncate min-w-0 text-slate-800 font-medium">{seg.label}</span>
                )}
                <button
                  type="button"
                  className="inline-flex items-center justify-center text-slate-500 hover:text-[#002D5E]"
                  aria-label="하위 메뉴 열기"
                  aria-expanded={open}
                  onClick={() => setOpen((v) => !v)}
                >
                  <svg className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {open ? (
                  <div className="absolute left-0 top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
                    {subMenus.map((menu) => (
                      <Link
                        key={menu.to}
                        to={menu.to}
                        className={`block px-3 py-2 whitespace-nowrap ${
                          isCurrentSubMenu(menu.to) ? "bg-slate-100 text-[#002D5E] font-medium" : "text-slate-700 hover:bg-slate-50 hover:text-[#002D5E]"
                        }`}
                      >
                        {menu.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </>
            ) : seg.to ? (
              <Link to={seg.to} className="hover:text-[#002D5E] truncate min-w-0">
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
    <header className="text-center px-2 py-10 sm:py-12 md:py-14">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-4 text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">{subtitle}</p> : null}
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

const BOARD_DETAIL_SLUG_TITLE = {
  notices: "공지사항",
  events: "이벤트",
  references: "참고논문",
};

function HeroCarousel({ slides }) {
  const list = slides?.length ? slides : [];
  const [idx, setIdx] = useState(0);

  if (!list.length) return null;

  useEffect(() => {
    if (list.length <= 1) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), 6000);
    return () => clearInterval(t);
  }, [list.length]);

  const s = list[idx];
  const go = (delta) => setIdx((i) => (i + delta + list.length) % list.length);

  return (
    <section className="relative w-screen left-1/2 -translate-x-1/2 bg-[#0a2744]">
      <div className="relative h-[min(52vw,420px)] md:h-[440px]">
        {s.imageUrl || s.mobileImageUrl ? (
          <picture className="absolute inset-0 block">
            <source media="(max-width: 767px)" srcSet={s.mobileImageUrl || s.imageUrl} />
            <img src={s.imageUrl || s.mobileImageUrl} alt={s.title || ""} className="absolute inset-0 w-full h-full object-cover" />
          </picture>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#003a6b] via-[#002D5E] to-slate-900 flex items-center justify-center">
            <p className="text-white/90 text-xl md:text-2xl font-semibold px-6 text-center">{s.title || "프로모션 배너"}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-black/25 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-white text-lg md:text-xl font-semibold drop-shadow">{s.title}</p>
          {s.linkUrl ? (
            s.linkUrl.startsWith("http") ? (
              <a
                href={s.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 text-sm text-white border border-white/80 rounded px-4 py-1.5 hover:bg-white/10"
              >
                자세히 보기
              </a>
            ) : (
              <Link
                to={s.linkUrl}
                className="inline-block mt-2 text-sm text-white border border-white/80 rounded px-4 py-1.5 hover:bg-white/10"
              >
                자세히 보기
              </Link>
            )
          ) : null}
        </div>
        {list.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/35 text-white text-xl hover:bg-black/50"
              aria-label="이전 배너"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/35 text-white text-xl hover:bg-black/50"
              aria-label="다음 배너"
            >
              ›
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {list.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/70"}`}
                  aria-label={`배너 ${i + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function Home() {
  const [banners, setBanners] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [newItems, setNewItems] = useState([]);
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [b, r, n, p] = await Promise.all([
          api.get("/banners"),
          api.get("/products", { params: { isRecommended: true, limit: 12 } }),
          api.get("/products", { params: { isNew: true, limit: 12 } }),
          api.get("/partners", { params: { type: "MANUFACTURER" } }),
        ]);
        setBanners(b.data);
        setRecommended((r.data.items || []).slice(0, 12));
        setNewItems((n.data.items || []).slice(0, 12));
        setPartners(p.data);
      } catch {
        setBanners([]);
        setRecommended([]);
        setNewItems([]);
        setPartners([]);
      }
    })();
  }, []);

  return (
    <>
      <HeroCarousel slides={banners} />
      <section className="bg-white pt-10 md:pt-12 pb-10 md:pb-12">
        <div className="container mx-auto max-w-full md:max-w-[70%] px-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">추천제품</h2>
            {/* <p className="text-slate-500 text-sm mt-1">대표 제품 라인업</p> */}
          </div>
          <ProductGrid items={recommended} columns={4} />
        </div>
      </section>

      <section className="bg-[#f4f4f4] pt-10 md:pt-12 pb-10 md:pb-12">
        <div className="container mx-auto max-w-full md:max-w-[70%] px-4">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-900">신상품</h2>
            {/* <p className="text-slate-500 text-sm mt-1">최근 등록 제품</p> */}
          </div>
          <ProductGrid items={newItems} columns={4} />
        </div>
      </section>

      <section className="bg-white pt-10 md:pt-12 pb-10 md:pb-12">
        <div className="container mx-auto max-w-full md:max-w-[70%] px-4">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Partners</h2>
            {/* <p className="text-slate-500 text-sm mt-1">Partner logos</p> */}
          </div>
          <PartnerLogoMarquee partners={partners} />
        </div>
      </section>
    </>
  );
}

function ProductGrid({ items, columns = 4 }) {
  const grid =
    columns === 3 ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4";
  return (
    <div className={grid}>
      {items.map((x) => (
        <Link key={x._id} to={`/products/${x._id}`} className="card overflow-hidden hover:shadow-md transition-shadow">
          <div className={`bg-slate-100 flex items-center justify-center ${columns === 3 ? "h-40 md:h-44" : "h-40 md:h-44"}`}>
            {x.thumbnailUrl ? (
              <img src={x.thumbnailUrl} alt={x.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-slate-400 text-sm">No Image</span>
            )}
          </div>
          {columns >= 3 ? (
            <div className="bg-slate-200/90 px-3 py-2 text-sm font-semibold text-slate-800 border-t border-slate-300/60">
              {x.name}
            </div>
          ) : null}
          <div className={`p-3 ${columns >= 3 ? "pt-2" : ""}`}>
            {columns < 3 ? <div className="font-medium text-sm">{x.name}</div> : null}
            <div className="text-xs text-slate-600 mt-1 line-clamp-2">{x.shortDescription}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function PartnerLogoMarquee({ partners }) {
  const scrollerRef = useRef(null);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

  const logoItems = useMemo(() => {
    const base = partners?.length ? partners : [];
    return [...base, ...base];
  }, [partners]);

  if (!logoItems.length) {
    return <div className="text-sm text-slate-500 py-6 text-center">등록된 파트너 로고가 없습니다.</div>;
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const speedPxPerSec = 28;
    let rafId = 0;
    let prevTs = 0;

    const tick = (ts) => {
      if (!prevTs) prevTs = ts;
      const dt = ts - prevTs;
      prevTs = ts;

      if (!isDownRef.current) {
        const half = el.scrollWidth / 2;
        if (half > 0) {
          el.scrollLeft += (speedPxPerSec * dt) / 1000;
          if (el.scrollLeft >= half) el.scrollLeft -= half;
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [logoItems.length]);

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
    const walk = (x - startXRef.current) * 1.35;
    el.scrollLeft = startScrollLeftRef.current - walk;
  };

  return (
    <div
      ref={scrollerRef}
      className="hide-scrollbar overflow-x-auto cursor-grab active:cursor-grabbing select-none py-2"
      onMouseDown={onMouseDown}
      onMouseUp={() => {
        isDownRef.current = false;
      }}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      <div className="inline-flex items-center gap-6 md:gap-10 pr-6">
        {logoItems.map((p, idx) => (
          <Link
            key={`${p._id || p.name}-${idx}`}
            to={p._id ? `/partner/${p._id}` : "/partners"}
            className="w-[150px] md:w-[170px] h-[56px] md:h-[64px] flex items-center justify-center shrink-0"
            draggable={false}
          >
            {p.logoUrl ? (
              <img src={p.logoUrl} alt={p.name} className="max-h-full max-w-full object-contain" draggable={false} />
            ) : (
              <span className="text-slate-400 text-xs">로고 없음</span>
            )}
          </Link>
        ))}
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

function ProductCatalogPage({ businessType = "MANUFACTURER" }) {
  const [sp, setSp] = useSearchParams();
  const categoryId = sp.get("categoryId") || "";
  const urlSearch = sp.get("search") || "";
  const [search, setSearch] = useState(urlSearch);
  const [items, setItems] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    api
      .get("/product-categories")
      .then((r) => setTree(r.data?.tree || []))
      .catch(() => setTree([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get("/products", {
        params: {
          category: businessType,
          categoryId: categoryId || undefined,
          search: search.trim() || undefined,
          limit: 48,
        },
      })
      .then((r) => setItems(r.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [businessType, categoryId, search]);

  const catLabel = categoryId ? findCategoryLabelPath(tree, categoryId) : "";
  const isSynthesis = businessType === "SYNTHESIS";
  const pageTitle = isSynthesis ? "합성서비스" : "제품소개";
  const pageSubtitle = isSynthesis ? "합성서비스 제품을 분류 또는 검색어로 찾아보실 수 있습니다." : "분류 또는 검색어로 제품을 찾아보실 수 있습니다.";
  const pagePath = isSynthesis ? "/synthesis" : "/products";

  const applySearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(sp);
    if (search.trim()) next.set("search", search.trim());
    else next.delete("search");
    if (categoryId) next.set("categoryId", categoryId);
    else next.delete("categoryId");
    setSp(next, { replace: true });
  };

  return (
    <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-6 md:py-8">
      <PageBreadcrumb
        segments={[
          { label: "제품 안내" },
          { to: pagePath, label: pageTitle },
          ...(catLabel ? [{ label: catLabel }] : []),
        ]}
      />
      <PageHeroTitle title={catLabel || pageTitle} subtitle={pageSubtitle} />
      <PageContentRule />
      <div className="mt-6 md:mt-8 space-y-4">
        <form onSubmit={applySearch} className="mx-auto flex w-full max-w-[760px] flex-wrap justify-center gap-2">
          <input
            className={`${PAGE_SEARCH_INPUT_CLASS} min-w-[200px]`}
            placeholder="제품명 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="px-4 py-2 rounded-md bg-[#002D5E] !text-white text-sm font-medium">
            검색
          </button>
        </form>
        {loading ? <p className="text-slate-500 py-8">불러오는 중…</p> : <ProductGrid items={items} />}
        {!loading && items.length === 0 ? <p className="text-center text-slate-500 py-8">표시할 제품이 없습니다.</p> : null}
      </div>
    </div>
  );
}

function CustomerSupportStaticPage({ title, subtitle, body }) {
  return (
    <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-6 md:py-8">
      <PageBreadcrumb segments={[{ label: "고객지원" }, { label: title }]} subMenus={CUSTOMER_SUPPORT_SUB} />
      <PageHeroTitle title={title} subtitle={subtitle} />
      <PageContentRule />
      <article className="mt-8 card p-6 md:p-8 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{body}</article>
    </div>
  );
}

function PartnersPage({ type }) {
  const [searchParams] = useSearchParams();
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

  return (
    <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-6 md:py-8">
      <PageBreadcrumb
        segments={[
          { label: "제품 안내" },
          { label: type === "SYNTHESIS" ? "합성서비스" : "공식 제조사" },
        ]}
      />
      <PageHeroTitle
        title={type === "SYNTHESIS" ? "합성서비스" : "공식 제조사"}
        subtitle={
          type === "SYNTHESIS"
            ? "맞춤 합성 및 관련 서비스 파트너를 검색한 뒤, 제품·서비스를 탐색해 보세요."
            : "검증된 공식 제조사를 검색한 뒤, 제조사별 제품 카탈로그로 이동할 수 있습니다."
        }
      />
      <PageContentRule />
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
      <div className="grid md:grid-cols-3 gap-3">
        {items.map((p) => (
          <Link key={p._id} to={`/partner/${p._id}`} className="card p-4">
            <div className="font-semibold">{p.name}</div>
            <div className="text-sm text-slate-500">{p.description}</div>
          </Link>
        ))}
      </div>
      </div>
    </div>
  );
}

function PartnerProducts() {
  const { partnerId } = useParams();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [partnerName, setPartnerName] = useState("");
  const [partnerListPath, setPartnerListPath] = useState("/partners");
  const [partnerListLabel, setPartnerListLabel] = useState("공식 제조사");

  useEffect(() => {
    api
      .get("/products", { params: { partnerId, search, limit: 40 } })
      .then((r) => setItems(r.data.items))
      .catch(() => setItems([]));
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

  return (
    <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-6 md:py-8">
      <PageBreadcrumb
        segments={[
          { to: partnerListPath, label: partnerListLabel },
          { label: partnerName ? `${partnerName} 제품` : "제조사별 제품" },
        ]}
      />
      <PageHeroTitle title={partnerName ? `${partnerName} 제품` : "제조사별 제품"} subtitle="제품명으로 검색한 뒤 상세 페이지에서 견적문의를 진행할 수 있습니다." />
      <PageContentRule />
      <div className="mt-6 md:mt-8">
      <div className="mb-4 flex justify-center">
        <input
          className={PAGE_SEARCH_INPUT_CLASS}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제품 검색"
        />
      </div>
      <ProductGrid items={items} />
      </div>
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => setItem(r.data));
  }, [id]);

  if (!item) return <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-8">Loading...</div>;

  const crumbTitle = item.name && item.name.length > 36 ? `${item.name.slice(0, 36)}…` : item.name;
  const inquiryLink = `/inquiry?productId=${item._id}&productName=${encodeURIComponent(item.name)}&catalogNumber=${encodeURIComponent(
    item.productNumber || ""
  )}&quantity=${encodeURIComponent(String(qty))}`;

  return (
    <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-6 md:py-8">
      <PageBreadcrumb segments={[{ to: "/partners", label: "제품 안내" }, { label: crumbTitle }]} />
      <PageHeroTitle
        title={item.name}
        subtitle={item.categoryPath?.length ? item.categoryPath.join(" › ") : "제품 상세 정보"}
      />
      <PageContentRule />
      <div className="mt-6 md:mt-8">
        <div className="card p-5 md:p-6 space-y-6">
          <section className="grid gap-6 md:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded border overflow-hidden bg-slate-100 min-h-[260px]">
              {item.imageUrl || item.thumbnailUrl ? (
                <img src={item.imageUrl || item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full min-h-[260px] flex items-center justify-center text-slate-400 text-sm">이미지 없음</div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl md:text-4xl font-bold text-slate-900 leading-tight">{item.name}</h2>
              <p className="text-sm text-slate-600">제품 코드: {item.productNumber || "-"}</p>
              <p className="text-sm text-slate-600 leading-6">{item.shortDescription || item.description || "제품 설명이 없습니다."}</p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button type="button" className="inline-flex items-center border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm hover:bg-slate-50" onClick={() => window.print()}>
                  프린트
                </button>
                <Link to={inquiryLink} className="inline-flex items-center border border-slate-300 text-slate-700 px-4 py-2 rounded text-sm hover:bg-slate-50">
                  제품 문의
                </Link>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200 pt-5 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">상세정보</h3>
            {item.contentHtml ? (
              <div className="text-slate-700 leading-7 [&_img]:max-w-full [&_img]:h-auto" dangerouslySetInnerHTML={{ __html: item.contentHtml }} />
            ) : (
              <p className="text-slate-600">{item.description || "상세 정보가 없습니다."}</p>
            )}
            {item.specification ? <pre className="bg-slate-100 p-3 rounded whitespace-pre-wrap">{item.specification}</pre> : null}
            {item.category2Path?.length ? <p className="text-sm text-slate-500">분류2: {item.category2Path.join(" › ")}</p> : null}
          </section>

          <section className="border-t border-slate-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">주문정보</h3>
              <Link to={inquiryLink} className="inline-flex items-center rounded bg-[#002D5E] !text-white px-4 py-2 text-sm font-medium hover:opacity-95">
                견적문의
              </Link>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr className="text-slate-700">
                    <th className="p-3 text-left font-semibold min-w-[220px]">Product</th>
                    <th className="p-3 text-left font-semibold w-40">Cat.No.</th>
                    <th className="p-3 text-center font-semibold w-32">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200 last:border-b-0">
                    <td className="p-3 text-slate-800">{item.name}</td>
                    <td className="p-3 text-slate-700">{item.productNumber || "-"}</td>
                    <td className="p-3">
                      <div className="mx-auto inline-flex items-center border border-slate-300 rounded overflow-hidden">
                        <button
                          type="button"
                          className="h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-800"
                          onClick={() => setQty((v) => Math.max(1, v - 1))}
                          aria-label="수량 감소"
                        >
                          -
                        </button>
                        <span className="h-8 min-w-[40px] px-2 inline-flex items-center justify-center font-medium">{qty}</span>
                        <button type="button" className="h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-800" onClick={() => setQty((v) => v + 1)} aria-label="수량 증가">
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
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

function BoardListPage({ slug, fallbackTitle }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setErr("");
    api
      .get(`/${slug}`, { params: { search: q, page, limit: 20 } })
      .then((r) => setData(r.data))
      .catch(() => setErr("목록을 불러오지 못했습니다."));
  }, [slug, q, page]);

  useEffect(() => {
    setQ("");
    setPage(1);
  }, [slug]);

  if (err) {
    return (
      <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-8">
        <div className="card p-5 text-red-600">{err}</div>
      </div>
    );
  }
  if (!data?.board) return <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-8">Loading…</div>;

  const { board, items, total, hasMore } = data;
  const title = board.title || fallbackTitle;
  const displayType = board.displayType || "TABLE";

  const listSubtitle =
    (board.subtitle && String(board.subtitle).trim()) ||
    BOARD_LIST_SLUG_SUBTITLE[slug] ||
    (displayType === "GALLERY" ? "갤러리 형태로 게시글을 확인할 수 있습니다." : displayType === "THUMBNAIL_LIST" ? "이벤트·프로모션 소식을 안내합니다." : "게시글 목록입니다.");

  const listPageHeader = (
    <>
      <PageBreadcrumb segments={[{ label: "고객지원" }, { label: title }]} subMenus={slug === "notices" ? CUSTOMER_SUPPORT_SUB : []} />
      <PageHeroTitle title={title} subtitle={listSubtitle} />
      <PageContentRule />
    </>
  );

  const shouldShowSearch = board.showSearch !== false;

  const searchBar = (
    <div className="mb-5 flex justify-center">
      <input
        className={PAGE_SEARCH_INPUT_CLASS}
        placeholder="검색"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
      />
    </div>
  );

  if (displayType === "GALLERY") {
    return (
      <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-6 md:py-8">
        {listPageHeader}
        <div className="mt-6 md:mt-8">
        {shouldShowSearch ? searchBar : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((x) => (
            <Link key={x._id} to={`/${slug}/${x._id}`} className="card overflow-hidden hover:shadow-md transition-shadow block">
              <div className="aspect-square bg-slate-100 border-b border-slate-100">
                {x.thumbnailUrl ? (
                  <img src={x.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">이미지 없음</div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm text-slate-900 leading-snug">{x.title}</h3>
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
        <div className="flex justify-center gap-2 mt-6 text-sm">
          <button type="button" disabled={page <= 1} className="px-3 py-1 border rounded disabled:opacity-40" onClick={() => setPage((p) => Math.max(1, p - 1))}>
            이전
          </button>
          <span className="px-2 py-1">
            {page}페이지 {total != null ? `(총 ${total}건)` : ""}
          </span>
          <button type="button" disabled={!hasMore} className="px-3 py-1 border rounded disabled:opacity-40" onClick={() => setPage((p) => p + 1)}>
            다음
          </button>
        </div>
        </div>
      </div>
    );
  }

  if (displayType === "THUMBNAIL_LIST") {
    const now = new Date();
    return (
      <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-6 md:py-8">
        {listPageHeader}
        <div className="mt-6 md:mt-8">
        {shouldShowSearch ? searchBar : null}
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden bg-white">
          {items.map((x) => {
            const active =
              (!x.endAt || new Date(x.endAt) >= now) && (!x.startAt || new Date(x.startAt) <= now);
            return (
              <Link key={x._id} to={`/${slug}/${x._id}`} className="flex flex-col sm:flex-row gap-4 p-4 hover:bg-slate-50 transition-colors">
                <div className="w-full sm:w-52 shrink-0 h-36 bg-slate-100 rounded overflow-hidden border border-slate-100">
                  {x.thumbnailUrl ? (
                    <img src={x.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">이미지 없음</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {active ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#002D5E] text-white text-xs font-medium">진행중</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs">종료</span>
                    )}
                    {x.startAt || x.endAt ? (
                      <span className="text-slate-500 text-xs">
                        {formatPostDate(x.startAt)} ~ {formatPostDate(x.endAt)}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mt-1">{x.title}</h3>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{x.summary}</p>
                </div>
              </Link>
            );
          })}
        </div>
        {items.length === 0 ? <p className="text-center text-slate-500 py-8">등록된 글이 없습니다.</p> : null}
        <div className="flex justify-center gap-2 mt-6 text-sm">
          <button type="button" disabled={page <= 1} className="px-3 py-1 border rounded disabled:opacity-40" onClick={() => setPage((p) => Math.max(1, p - 1))}>
            이전
          </button>
          <span className="px-2 py-1">
            {page}페이지 {total != null ? `(총 ${total}건)` : ""}
          </span>
          <button type="button" disabled={!hasMore} className="px-3 py-1 border rounded disabled:opacity-40" onClick={() => setPage((p) => p + 1)}>
            다음
          </button>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-6 md:py-8">
      {listPageHeader}
      <div className="mt-6 md:mt-8">
      {shouldShowSearch ? searchBar : null}
      <div className="overflow-x-auto border-x border-b border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr className="text-slate-900">
              <th className="text-center p-3 w-14 text-xs sm:text-sm font-bold">No</th>
              <th className="text-center p-3 w-24 text-xs sm:text-sm font-bold">상태</th>
              <th className="text-center p-3 min-w-[40%] text-xs sm:text-sm font-bold">제목</th>
              <th className="text-center p-3 w-28 whitespace-nowrap text-xs sm:text-sm font-bold">작성자</th>
              <th className="text-center p-3 w-32 whitespace-nowrap text-xs sm:text-sm font-bold">등록일</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x, idx) => (
              <tr key={x._id} className="border-b border-slate-200 hover:bg-slate-50/80">
                <td className="p-3 text-center text-slate-600 align-middle">{(page - 1) * 20 + idx + 1}</td>
                <td className="p-3 text-center align-middle">
                  {x.isImportant ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-[#002D5E] text-white">공지</span>
                  ) : (
                    <span className="text-slate-500 text-xs">일반</span>
                  )}
                </td>
                <td className="p-3 text-left align-middle">
                  <Link to={`/${slug}/${x._id}`} className="block w-full h-full">
                    <span className="font-medium text-slate-900 hover:text-[#002D5E]">{x.title}</span>
                    {x.summary ? <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{x.summary}</p> : null}
                  </Link>
                </td>
                <td className="p-3 text-center text-slate-600 whitespace-nowrap align-middle">관리자</td>
                <td className="p-3 text-center text-slate-600 whitespace-nowrap align-middle">{formatPostDate(x.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 ? <p className="text-center text-slate-500 py-8">등록된 글이 없습니다.</p> : null}
      <div className="flex justify-center gap-2 mt-6 text-sm">
        <button type="button" disabled={page <= 1} className="px-3 py-1 border rounded disabled:opacity-40" onClick={() => setPage((p) => Math.max(1, p - 1))}>
          이전
        </button>
        <span className="px-2 py-1">
          {page}페이지 {total != null ? `(총 ${total}건)` : ""}
        </span>
        <button type="button" disabled={!hasMore} className="px-3 py-1 border rounded disabled:opacity-40" onClick={() => setPage((p) => p + 1)}>
          다음
        </button>
      </div>
      </div>
    </div>
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

  if (err) return <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-8"><div className="card p-5 text-red-600">{err}</div></div>;
  if (!item) return <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-8">Loading…</div>;

  const listPath = `/${slug}`;
  const boardListLabel = BOARD_DETAIL_SLUG_TITLE[slug] || slug;
  const crumbPost = item.title.length > 32 ? `${item.title.slice(0, 32)}…` : item.title;

  return (
    <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-6 md:py-8">
      <PageBreadcrumb
        segments={[
          { label: "고객지원" },
          { to: listPath, label: boardListLabel },
          { label: crumbPost },
        ]}
        subMenus={slug === "notices" ? CUSTOMER_SUPPORT_SUB : []}
        subMenuAnchorIndex={1}
      />
      <PageContentRule />
      <div className="mt-6 md:mt-8 space-y-4">
      <article className="card p-5 md:p-6 text-slate-800">
        <header className="border-b border-slate-200 pb-3 mb-5">
          <h1 className="text-xl md:text-2xl font-semibold text-slate-900">{item.title}</h1>
          <div className="mt-2 text-xs md:text-sm text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{boardListLabel}</span>
            <span>{formatPostDate(item.createdAt)}</span>
            <span>조회수 {item.viewCount || 0}</span>
          </div>
        </header>
        {item.content ? <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: item.content }} /> : "본문 없음"}
      </article>
        {item.youtubeUrl ? (
          <iframe
            title="youtube"
            src={String(item.youtubeUrl).replace("watch?v=", "embed/")}
            className="w-full h-64 rounded"
            allowFullScreen
          />
        ) : null}
        <div className="flex justify-end items-center gap-2 text-sm text-slate-600">
          <button
            type="button"
            className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50"
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
            공유
          </button>
          <button type="button" className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50" onClick={() => window.print()}>
            프린트
          </button>
        </div>
        <div className="border border-slate-200 rounded bg-white divide-y">
          <div className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="text-slate-500 shrink-0">이전글</span>
            {adjacent.prev ? (
              <Link to={`/${slug}/${adjacent.prev._id}`} className="text-slate-800 hover:text-[#002D5E] truncate">
                {adjacent.prev.title}
              </Link>
            ) : (
              <span className="text-slate-400">이전글이 없습니다.</span>
            )}
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="text-slate-500 shrink-0">다음글</span>
            {adjacent.next ? (
              <Link to={`/${slug}/${adjacent.next._id}`} className="text-slate-800 hover:text-[#002D5E] truncate">
                {adjacent.next.title}
              </Link>
            ) : (
              <span className="text-slate-400">다음글이 없습니다.</span>
            )}
          </div>
        </div>
        <div>
          <Link className="inline-flex px-4 py-2 rounded bg-[#002D5E] !text-white text-sm font-medium hover:opacity-95" to={listPath}>
            목록
          </Link>
        </div>
      </div>
    </div>
  );
}

const INQUIRY_HOW_HEARD = [
  { value: "SEARCH", label: "검색" },
  { value: "REFERRAL", label: "지인 추천" },
  { value: "AD", label: "광고" },
  { value: "SNS", label: "SNS(블로그/인스타)" },
  { value: "BROCHURE", label: "브로슈어/전단지" },
  { value: "MAIL", label: "우편물" },
  { value: "CONFERENCE", label: "학회/박람회" },
  { value: "OTHER", label: "기타" },
];

const INQUIRY_PRIVACY_TEXT = `수집·이용 목적: 견적 및 구매 상담, 문의 응대

수집 항목: 이름, 소속, 연락처(전화번호), 이메일, 문의 제품 정보, 선택 항목(수량·문의내용·유입 경로·첨부파일 등)

보유·이용 기간: 상담 완료 후 6개월(또는 관계 법령에 따른 기간), 삭제 요청 시 지체 없이 파기

문의에 따른 응대를 위해 최소한의 개인정보를 수집합니다. 동의를 거부할 수 있으나, 동의하지 않을 경우 견적문의 접수가 제한될 수 있습니다.

개인정보 처리에 관한 문의: 사이트 하단 또는 고객지원 안내에 따른 담당자에게 연락해 주세요.`;

function InquiryPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    inquirerType: "",
    affiliation: "",
    name: "",
    email: "",
    phone: "",
    productId: params.get("productId") || "",
    brand: "",
    catalogNumber: params.get("catalogNumber") || "",
    productName: params.get("productName") || "",
    quantity: params.get("quantity") || "",
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
      setUploadErr(er.response?.data?.error || "첨부 업로드에 실패했습니다.");
    } finally {
      setUploadBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.inquirerType) {
      setError("구분(유저/업자)을 선택해 주세요.");
      return;
    }
    if (!form.privacyAgreed) {
      setError("개인정보 수집 및 이용에 동의해 주세요.");
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
      setError(e2.response?.data?.error || "문의 등록에 실패했습니다.");
    }
  };

  if (done) {
    return (
      <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-8">
        <div className="card p-8 text-center text-slate-800">
          <p className="text-lg font-semibold">문의가 접수되었습니다.</p>
          <p className="mt-2 text-slate-600 text-sm">빠른 시일 내에 연락드리겠습니다.</p>
          <Link to="/" className="inline-block mt-6 text-[#002D5E] font-medium text-sm">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  const fieldClass = "w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 md:py-8 pb-16 md:pb-24 ">
      <PageBreadcrumb segments={[{ label: "고객지원" }, { label: "견적문의" }]} />
      <PageHeroTitle
        title="견적문의"
        subtitle="견적 및 주문은 해당 제품 또는 서비스 페이지에서 신청해 주시면 더 빠르게 처리됩니다. 아래 폼으로 문의하시면 담당자가 연락드립니다."
      />
      <PageContentRule />
      <form onSubmit={onSubmit} className="card p-6 md:p-8 mt-6 md:mt-8 space-y-8 bg-white">
        <p className="text-right text-xs text-slate-500">
          <span className="text-red-600">*</span> 는 필수 입력사항입니다.
        </p>

        <section className="space-y-4 border-b border-slate-200 pb-8">
          <h2 className="text-base font-bold text-slate-900 border-l-4 border-[#002D5E] pl-3">문의자 정보</h2>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                구분 <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-wrap gap-6 text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inquirerType"
                    checked={form.inquirerType === "USER"}
                    onChange={() => setForm({ ...form, inquirerType: "USER" })}
                    className="text-[#002D5E]"
                  />
                  유저
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inquirerType"
                    checked={form.inquirerType === "DEALER"}
                    onChange={() => setForm({ ...form, inquirerType: "DEALER" })}
                    className="text-[#002D5E]"
                  />
                  딜러
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                소속 <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder="소속을 입력해주세요."
                value={form.affiliation}
                onChange={(e) => setForm({ ...form, affiliation: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                이름 <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder="이름을 입력해주세요."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                전화번호 <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder="전화번호를 입력해주세요."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                이메일 <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                className={fieldClass}
                required
                placeholder="이메일을 입력해주세요."
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-b border-slate-200 pb-8">
          <h2 className="text-base font-bold text-slate-900 border-l-4 border-[#002D5E] pl-3">문의 제품 정보</h2>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                제조사 <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder="제조사를 입력해주세요."
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                카탈로그 넘버 <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder="카탈로그 넘버를 입력해주세요."
                value={form.catalogNumber}
                onChange={(e) => setForm({ ...form, catalogNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                제품명 <span className="text-red-600">*</span>
              </label>
              <input
                className={fieldClass}
                required
                placeholder="제품명을 입력해주세요."
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">수량</label>
              <input
                className={fieldClass}
                placeholder="수량을 입력해주세요."
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">문의내용</label>
              <textarea
                className={`${fieldClass} min-h-[140px] resize-y`}
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-b border-slate-200 pb-8">
          <h2 className="text-base font-bold text-slate-900 border-l-4 border-[#002D5E] pl-3">기타 정보 수집</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">알게 된 경로</label>
            <div className="flex items-center gap-4 text-sm overflow-x-auto whitespace-nowrap">
              {INQUIRY_HOW_HEARD.map((opt) => (
                <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="radio"
                    name="howHeard"
                    checked={form.howHeard === opt.value}
                    onChange={() => setForm({ ...form, howHeard: opt.value, howHeardOther: opt.value === "OTHER" ? form.howHeardOther : "" })}
                    className="text-[#002D5E]"
                  />
                  <span>
                    {opt.label}
                    {opt.value === "OTHER" ? (
                      <input
                        className={`${fieldClass} ml-2 inline-block w-[260px] align-middle`}
                        placeholder="기타 내용을 입력해주세요."
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">첨부파일</label>
            <input type="file" accept="image/*,.pdf,application/pdf" disabled={uploadBusy} onChange={onFile} className="block w-full text-sm border border-slate-200 rounded-md p-2 bg-white" />
            <p className="text-xs text-slate-500 mt-1">(예: 사업자등록증, 품목리스트, 등) 이미지 또는 PDF, 최대 10MB</p>
            {form.attachmentUrl ? (
              <p className="text-xs text-[#002D5E] mt-2 break-all">
                <a href={form.attachmentUrl} target="_blank" rel="noreferrer" className="underline">
                  첨부 확인
                </a>
              </p>
            ) : null}
            {uploadErr ? <p className="text-red-600 text-xs mt-1">{uploadErr}</p> : null}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 border-l-4 border-[#002D5E] pl-3">개인정보 수집 및 이용에 대한 안내</h2>
          <div className="border border-slate-200 rounded-md bg-slate-50 p-4 max-h-48 overflow-y-auto text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{INQUIRY_PRIVACY_TEXT}</div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={form.privacyAgreed}
                onChange={(e) => setForm({ ...form, privacyAgreed: e.target.checked })}
                className="rounded border-slate-300 text-[#002D5E]"
              />
              개인정보 수집 및 이용에 동의합니다. <span className="text-red-600">*</span>
            </label>
            <button type="button" className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-700 hover:bg-slate-50" onClick={() => setPrivacyModal(true)}>
              전문보기
            </button>
          </div>
        </section>

        {error ? <p className="text-red-600 text-sm">{error}</p> : null}

        <div className="pt-2 flex justify-center">
          <button type="submit" className="w-full sm:w-auto bg-[#002D5E] !text-white px-8 py-3 rounded-md text-sm font-medium hover:opacity-95">
            문의하기
          </button>
        </div>
      </form>

      {privacyModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-900">개인정보 수집·이용 안내 (전문)</span>
              <button type="button" className="text-slate-500 text-xl leading-none px-2" onClick={() => setPrivacyModal(false)} aria-label="닫기">
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{INQUIRY_PRIVACY_TEXT}</div>
            <div className="p-4 border-t border-slate-200">
              <button type="button" className="w-full py-2 rounded-md bg-slate-900 text-white text-sm" onClick={() => setPrivacyModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin1234");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post("/admin/login", { email, password });
      localStorage.setItem("admin_token", r.data.token);
      setToken(r.data.token);
      nav("/admin");
    } catch {
      setErr("로그인 실패");
    }
  };

  return (
    <div className="container mx-auto max-w-full md:max-w-[70%] px-4 py-10">
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
  const [tree, setTree] = useState([]);
  const [flatItems, setFlatItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [rootName, setRootName] = useState("");
  const [childForm, setChildForm] = useState(null);
  const [childName, setChildName] = useState("");
  const [editForm, setEditForm] = useState(null);

  const load = () => {
    api
      .get("/admin/product-categories")
      .then((r) => {
        setTree(r.data.tree || []);
        setFlatItems(r.data.items || []);
      })
      .catch(() => setMsg("목록을 불러오지 못했습니다."));
  };

  useEffect(() => {
    load();
  }, []);

  const addRoot = async (e) => {
    e.preventDefault();
    setMsg("");
    const name = rootName.trim();
    if (!name) return;
    try {
      await api.post("/admin/product-categories", { name, parentId: null, sortOrder: 0 });
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
    contentHtml: "",
    specification: "",
    isRecommended: false,
    isNew: false,
    isActive: true,
  };
  const [form, setForm] = useState(blank);

  const loadRefs = () => {
    api.get("/admin/partners", { params: { page: 1, limit: 200 } }).then((r) => setPartners(r.data.items || []));
    api.get("/admin/product-categories").then((r) => {
      setCatOptions(flattenCategoryOptions(r.data.tree || []));
    });
  };

  const load = () =>
    api
      .get("/admin/products", { params: { q, page, limit: 10 } })
      .then((r) => setResult(r.data))
      .catch(() => setFeedback({ type: "error", message: "목록을 불러오지 못했습니다." }));

  useEffect(() => {
    loadRefs();
  }, []);

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
      productNumber: x.productNumber || "",
      category: x.category || "MANUFACTURER",
      categoryId: x.categoryId?._id ? String(x.categoryId._id) : x.categoryId ? String(x.categoryId) : "",
      category2Id: x.category2Id?._id ? String(x.category2Id._id) : x.category2Id ? String(x.category2Id) : "",
      partnerId: x.partnerId?._id ? String(x.partnerId._id) : String(x.partnerId || ""),
      thumbnailUrl: x.thumbnailUrl || "",
      imageUrl: x.imageUrl || "",
      shortDescription: x.shortDescription || "",
      contentHtml: x.contentHtml || "",
      specification: x.specification || "",
      isRecommended: Boolean(x.isRecommended),
      isNew: Boolean(x.isNew),
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
      <form onSubmit={save} className="card p-4 space-y-3 max-w-2xl">
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
        <label className="block text-sm font-medium">본문</label>
        <div className="border rounded">
          <CKEditor editor={ClassicEditor} data={form.contentHtml || ""} onChange={(_, editor) => setForm({ ...form, contentHtml: editor.getData() })} />
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

function CrudScreen({ title, path, fields }) {
  const [mode, setMode] = useState("list");
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const blank = useMemo(() => Object.fromEntries(fields.map((f) => [f, ""])), [fields]);
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
    try {
      if (editing) await api.put(`/admin/${path}/${editing}`, form);
      else await api.post(`/admin/${path}`, form);
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
    setForm(Object.fromEntries(fields.map((f) => [f, x[f] ?? ""])));
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
                {CRUD_FIELD_LABELS[f] || f}
              </label>
            );
          }
          if (isBoardImageField(f)) {
            return (
              <AdminImageField
                key={f}
                label={BOARD_IMAGE_LABELS[f] || f}
                value={typeof v === "string" ? v : ""}
                onChange={(url) => setForm({ ...form, [f]: url })}
              />
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
        address: data.address,
        tel: data.tel,
        fax: data.fax,
        email: data.email,
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

function toDatetimeLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminBoardPostsPanel() {
  const [boards, setBoards] = useState([]);
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
    youtubeUrl: "",
  };
  const [form, setForm] = useState(blank);

  const loadBoards = () => api.get("/admin/boards").then((r) => setBoards(r.data.items || []));

  const loadPosts = () => {
    if (!boardId) return;
    api
      .get("/admin/board-posts", { params: { boardId, page, limit: 10 } })
      .then((r) => setResult(r.data))
      .catch(() => setMsg("글 목록을 불러오지 못했습니다."));
  };

  useEffect(() => {
    loadBoards();
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
      youtubeUrl: row.youtubeUrl || "",
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
          <CKEditor editor={ClassicEditor} data={form.content || ""} onChange={(_e, editor) => setForm({ ...form, content: editor.getData() })} />
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
        <label className="block text-xs font-medium text-slate-600">YouTube URL (참고자료 등)</label>
        <input className="w-full border rounded p-2 text-sm" value={form.youtubeUrl} onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })} />
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

function AdminHome() {
  const basicTabs = ["logo", "footer", "admins"];
  const boardTabs = ["boardSettings", "boardPosts"];
  const [tab, setTab] = useState("logo");
  const [basicOpen, setBasicOpen] = useState(true);
  const [boardOpen, setBoardOpen] = useState(true);
  const navigate = useNavigate();
  const contentTabOrder = ["banners", "popups", "productCategories", "products", "inquiries"];
  const tabs = {
    logo: <AdminLogoSettings />,
    footer: <AdminFooterSettings />,
    admins: <AdminAccountsScreen />,
    banners: <CrudScreen title="배너 관리" path="banners" fields={["title", "imageUrl", "mobileImageUrl", "linkUrl", "isActive", "sortOrder"]} />,
    popups: <CrudScreen title="팝업 관리" path="popups" fields={["title", "content", "imageUrl", "startAt", "endAt", "isActive"]} />,
    productCategories: <AdminProductCategories />,
    products: <AdminProductsScreen />,
    boardSettings: <AdminBoardsPanel />,
    boardPosts: <AdminBoardPostsPanel />,
    inquiries: <InquiriesAdmin />,
  };
  const labels = {
    logo: "로고 관리",
    footer: "푸터 관리",
    admins: "관리자 관리",
    banners: "배너 관리",
    popups: "팝업 관리",
    productCategories: "분류 관리",
    products: "제품 관리",
    boardSettings: "게시판 설정",
    boardPosts: "글 관리",
    inquiries: "견적문의 관리",
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    setToken(null);
    navigate("/admin/login");
  };

  const selectBasic = (k) => {
    setTab(k);
    setBasicOpen(true);
  };

  const isBoardTab = boardTabs.includes(tab);
  const isBasicTab = basicTabs.includes(tab);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex">
        <aside className="w-64 min-h-screen bg-slate-900 text-white p-4">
          <Link to="/" className="font-bold text-lg block mb-6">
            Admin Console
          </Link>
          <nav className="space-y-1">
            <div>
              <button
                type="button"
                onClick={() => setBasicOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm font-medium ${
                  isBasicTab ? "bg-slate-800" : "hover:bg-slate-800"
                }`}
              >
                <span>기본 관리</span>
                <span className="text-xs opacity-70" aria-hidden>
                  {basicOpen ? "▼" : "▶"}
                </span>
              </button>
              {basicOpen ? (
                <div className="mt-1 ml-2 border-l border-slate-600 pl-2 space-y-0.5">
                  {basicTabs.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => selectBasic(k)}
                      className={`w-full text-left px-3 py-2 rounded text-sm ${
                        tab === k ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {labels[k]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="pt-2 mt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setBoardOpen((o) => !o);
                  setTab("boardSettings");
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm font-medium ${
                  isBoardTab ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>게시판 관리</span>
                <span className="text-xs opacity-70" aria-hidden>
                  {boardOpen ? "▼" : "▶"}
                </span>
              </button>
              {boardOpen ? (
                <div className="mt-1 ml-2 border-l border-slate-600 pl-2 space-y-0.5">
                  {boardTabs.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setTab(k);
                        setBoardOpen(true);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm ${
                        tab === k ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {labels[k]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="pt-2 mt-2 border-t border-slate-700 space-y-0.5">
              {contentTabOrder.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    tab === k ? "bg-slate-700" : "hover:bg-slate-800"
                  }`}
                >
                  {labels[k]}
                </button>
              ))}
            </div>
          </nav>
          <button type="button" onClick={logout} className="mt-6 text-sm text-red-300 hover:text-red-200">
            로그아웃
          </button>
        </aside>
        <main className="flex-1 p-6">
          <div className="mb-4">
            <h1 className="text-xl font-bold">
              {isBasicTab ? (
                <>
                  <span className="text-slate-500 font-medium text-base">기본 관리</span>
                  <span className="mx-2 text-slate-400 font-normal">›</span>
                  <span>{labels[tab]}</span>
                </>
              ) : isBoardTab ? (
                <>
                  <span className="text-slate-500 font-medium text-base">게시판 관리</span>
                  <span className="mx-2 text-slate-400 font-normal">›</span>
                  <span>{labels[tab]}</span>
                </>
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

function AdminRoute({ children }) {
  const token = localStorage.getItem("admin_token");
  if (!token) return <Navigate to="/admin/login" replace />;
  setToken(token);
  return children;
}

function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  if (location.pathname === "/admin/login") return <AdminLogin />;
  if (isAdmin) {
    return (
      <AdminRoute>
        <AdminHome />
      </AdminRoute>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/partners" element={<PartnersPage type="MANUFACTURER" />} />
        <Route path="/synthesis" element={<ProductCatalogPage businessType="SYNTHESIS" />} />
        <Route path="/partner/:partnerId" element={<PartnerProducts />} />
        <Route path="/partner/:partnerId/products" element={<PartnerProducts />} />
        <Route path="/products" element={<ProductCatalogPage businessType="MANUFACTURER" />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route
          path="/customer/order-guide"
          element={
            <CustomerSupportStaticPage
              title="주문가이드"
              subtitle="주문 절차 및 유의사항을 안내합니다. 세부 내용은 관리자에서 게시글 형태로 보강할 수 있습니다."
              body={`1. 제품소개 또는 공식제조사 메뉴에서 품목을 확인합니다.
2. 제품 상세 페이지에서 견적문의를 요청하거나, 견적문의 메뉴에서 일괄 문의를 남깁니다.
3. 담당자 확인 후 이메일 또는 유선으로 연락드립니다.

※ 납기·가격은 품목·수량에 따라 달라질 수 있습니다.`}
            />
          }
        />
        <Route
          path="/customer/about"
          element={
            <CustomerSupportStaticPage
              title="회사소개"
              subtitle="회사 개요 및 사업 영역입니다. 실제 소개 문구는 관리자 설정 또는 별도 에디터 연동으로 교체할 수 있습니다."
              body={`바이오 시약 무역 전문 기업으로 연구기관·기업 고객에게 검증된 제조사 제품과 합성 서비스를 연결합니다.

본 페이지는 안내용 예시 문구입니다. 회사 연혁, 비전, 조직도 등은 추후 반영해 주세요.`}
            />
          }
        />
        <Route
          path="/customer/directions"
          element={
            <CustomerSupportStaticPage
              title="오시는길"
              subtitle="본사 위치 및 교통 안내입니다. 주소는 사이트 푸터 설정과 맞춰 주시기 바랍니다."
              body={`대중교통 및 주차 안내는 준비 중입니다.

지도 연동(네이버·카카오 지도)은 추후 추가할 수 있습니다.`}
            />
          }
        />
        <Route path="/events" element={<BoardListPage slug="events" fallbackTitle="이벤트" />} />
        <Route path="/events/:id" element={<BoardPostDetailPage slug="events" />} />
        <Route path="/references" element={<BoardListPage slug="references" fallbackTitle="참고논문" />} />
        <Route path="/references/:id" element={<BoardPostDetailPage slug="references" />} />
        <Route path="/notices" element={<BoardListPage slug="notices" fallbackTitle="공지사항" />} />
        <Route path="/notices/:id" element={<BoardPostDetailPage slug="notices" />} />
        <Route path="/board/:slug" element={<BoardListPageFromParam />} />
        <Route path="/board/:slug/:id" element={<BoardPostDetailFromParam />} />
        <Route path="/inquiry" element={<InquiryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function ScrollToTopButton() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-[140] h-11 w-11 rounded-full border border-slate-300 bg-white/95 text-slate-700 shadow-md hover:bg-slate-50"
      aria-label="맨 위로 이동"
      title="맨 위로"
    >
      ↑
    </button>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <ScrollToTopButton />
    </BrowserRouter>
  );
}

export default App;

