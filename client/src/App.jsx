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
import { useEffect, useMemo, useState } from "react";
import { api, setToken } from "./lib/api";

function IconCart({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 6h14l-1 7H7L6 6z" strokeLinejoin="round" />
      <path d="M6 6 5 3H2" strokeLinecap="round" />
      <circle cx="9" cy="19" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="19" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconQuote({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 10h5v9H8zM15 10h5v9h-5z" strokeLinejoin="round" />
      <path d="M8 10V7a3 3 0 0 1 3-3h2M15 10V7a3 3 0 0 1 3-3h2" strokeLinecap="round" />
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

const MOCK_PARTNERS = [
  { _id: "p1", name: "Acme Bio", description: "항체/단백질/시약 제조사", logoUrl: "" },
  { _id: "p2", name: "Helix Genomics", description: "분자생물학 시약 제조사", logoUrl: "" },
  { _id: "p3", name: "Nova Cell Science", description: "세포배양 제품 제조사", logoUrl: "" },
];

const MOCK_PRODUCTS = [
  { _id: "prd1", name: "Recombinant Protein A", shortDescription: "고순도 recombinant protein", thumbnailUrl: "" },
  { _id: "prd2", name: "Monoclonal Antibody Kit M-200", shortDescription: "고감도 monoclonal 항체 키트", thumbnailUrl: "" },
  { _id: "prd3", name: "qPCR Master Mix H-1", shortDescription: "고효율 qPCR 마스터믹스", thumbnailUrl: "" },
  { _id: "prd4", name: "Cell Culture Medium NC-Plus", shortDescription: "세포 성장 촉진 배양액", thumbnailUrl: "" },
];

const MOCK_NOTICES = [
  { _id: "n1", title: "배송 지연 안내", summary: "일부 제품 입고 지연 공지", isImportant: true },
  { _id: "n2", title: "연휴 배송 일정 공지", summary: "택배 마감/재개 일정 안내", isImportant: true },
  { _id: "n3", title: "고객센터 운영시간 변경", summary: "평일 운영시간 변경", isImportant: false },
];

const MOCK_EVENTS = [
  { _id: "e1", title: "상반기 프로모션", summary: "추천 제품 할인 이벤트" },
  { _id: "e2", title: "신규 고객 웰컴 쿠폰", summary: "첫 견적문의 고객 대상 혜택" },
  { _id: "e3", title: "빠른 납기 캠페인", summary: "긴급 프로젝트 지원" },
];

const MOCK_REFERENCES = [
  { _id: "r1", title: "단백질 발현 실험 참고자료", summary: "실험 세팅 가이드와 영상 자료", youtubeUrl: "" },
  { _id: "r2", title: "qPCR 실험 최적화 가이드", summary: "프라이머 설계 및 조건 최적화", youtubeUrl: "" },
  { _id: "r3", title: "세포배양 오염 방지 체크포인트", summary: "배양 관리 실무 팁", youtubeUrl: "" },
];

function Layout({ children }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [site, setSite] = useState(null);
  const menus = [
    ["/partners", "공식 제조사"],
    ["/synthesis", "합성서비스"],
    ["/events", "이벤트"],
    ["/references", "참고논문"],
    ["/notices", "공지사항"],
  ];

  const submitHeaderSearch = (e) => {
    e.preventDefault();
    const q = headerSearch.trim();
    navigate(q ? `/partners?search=${encodeURIComponent(q)}` : "/partners");
    setMenuOpen(false);
  };

  useEffect(() => {
    api
      .get("/site-settings")
      .then((r) => setSite(r.data))
      .catch(() => setSite(null));
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50">
      <header className="sticky top-0 z-[100] bg-[#002D5E] text-white shadow-md">
        <div className="container mx-auto max-w-6xl px-4 py-3 md:py-3.5">
          <div className="flex items-center gap-3 md:gap-4">
            <Link to="/" className="shrink-0 flex items-center" title="홈">
              <img
                src={site?.headerLogoUrl || "/logo.svg"}
                alt=""
                className="h-9 w-auto max-h-10 object-contain"
              />
            </Link>

            <form onSubmit={submitHeaderSearch} className="flex-1 min-w-0">
              <div className="relative">
                <input
                  className="w-full rounded-md bg-white text-slate-900 pl-4 pr-11 py-2.5 text-sm placeholder:text-slate-400 border-0 shadow-inner"
                  placeholder="찾으시는 제품·제조사 키워드를 입력해 주세요."
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-slate-900"
                  aria-label="검색"
                >
                  <IconSearch />
                </button>
              </div>
            </form>

            <div className="flex items-center gap-1 shrink-0">
              <Link
                to="/cart"
                className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-white/10"
                title="장바구니"
              >
                <IconCart />
              </Link>
              <Link
                to="/inquiry"
                className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-white/10"
                title="견적문의"
              >
                <IconQuote />
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-10 w-10 md:hidden inline-flex items-center justify-center rounded-md hover:bg-white/10"
                title="메뉴"
                aria-expanded={menuOpen}
              >
                <IconMenu />
              </button>
            </div>
          </div>

          <nav className={`mt-2 md:mt-2.5 ${menuOpen ? "block" : "hidden"} md:block`}>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium pb-0.5">
              {menus.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `opacity-90 hover:opacity-100 border-b-2 border-transparent ${isActive ? "border-white opacity-100" : ""}`
                  }
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
              <NavLink
                to="/inquiry"
                className={({ isActive }) =>
                  `opacity-90 hover:opacity-100 border-b-2 border-transparent ${isActive ? "border-white opacity-100" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                견적문의
              </NavLink>
            </div>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-12 border-t border-slate-200">
        {site?.footerTopBar ? (
          <div className="bg-slate-200/90 text-slate-800 text-sm py-2.5">
            <div className="container mx-auto max-w-6xl px-4 text-right whitespace-pre-wrap">{site.footerTopBar}</div>
          </div>
        ) : null}
        <div className="bg-white">
          <div className="container mx-auto max-w-6xl px-4 py-8 grid gap-8 md:grid-cols-[minmax(0,200px)_1fr]">
            <div>
              {site?.footerLogoUrl ? (
                <img src={site.footerLogoUrl} alt="" className="max-w-[200px] h-auto object-contain" />
              ) : (
                <div className="h-14 w-40 rounded bg-slate-100 border border-slate-200" />
              )}
              {site?.companyName ? <p className="mt-3 text-sm font-semibold text-slate-900">{site.companyName}</p> : null}
            </div>
            <div className="text-sm text-slate-600 space-y-2 leading-relaxed">
              {site?.copyrightText ? <p>{site.copyrightText}</p> : <p className="text-slate-400">저작권 문구를 관리자에서 설정해 주세요.</p>}
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
              <div className="flex flex-wrap gap-2 pt-2">
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

function HeroCarousel({ slides }) {
  const list = slides?.length ? slides : [{ title: "메인 프로모션", imageUrl: "", linkUrl: "" }];
  const [idx, setIdx] = useState(0);

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
        {s.imageUrl ? (
          <img src={s.imageUrl} alt={s.title || ""} className="absolute inset-0 w-full h-full object-cover" />
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
          api.get("/products", { params: { isRecommended: true, limit: 8 } }),
          api.get("/products", { params: { isNew: true, limit: 8 } }),
          api.get("/partners", { params: { type: "MANUFACTURER" } }),
        ]);
        setBanners(b.data);
        setRecommended(r.data.items);
        setNewItems(n.data.items);
        setPartners(p.data);
      } catch {
        setBanners([{ title: "임시 메인 배너", imageUrl: "" }]);
        setRecommended(MOCK_PRODUCTS);
        setNewItems(MOCK_PRODUCTS.slice(0, 3));
        setPartners(MOCK_PARTNERS);
      }
    })();
  }, []);

  return (
    <>
      <HeroCarousel slides={banners} />
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <div className="mt-2 mb-8">
          <h2 className="text-2xl font-bold text-slate-900">추천제품</h2>
          <p className="text-slate-500 text-sm mt-1">대표 제품 라인업</p>
        </div>
        <ProductGrid items={recommended} columns={3} />
        <div className="mt-12 mb-4">
          <h2 className="text-2xl font-bold text-slate-900">신상품</h2>
          <p className="text-slate-500 text-sm mt-1">최근 등록 제품</p>
        </div>
        <ProductGrid items={newItems} columns={3} />
        <div className="mt-12 mb-4">
          <h2 className="text-2xl font-bold text-slate-900">공식 제조사</h2>
          <p className="text-slate-500 text-sm mt-1">파트너 로고</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {partners.map((p) => (
            <div key={p._id} className="card p-4 text-center text-sm">
              {p.logoUrl ? (
                <img src={p.logoUrl} alt={p.name} className="h-10 mx-auto mb-2 object-contain" />
              ) : (
                <div className="h-10 bg-slate-100 mb-2 rounded" />
              )}
              {p.name}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ProductGrid({ items, columns = 4 }) {
  const grid =
    columns === 3 ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" : "grid md:grid-cols-4 gap-3";
  return (
    <div className={grid}>
      {items.map((x) => (
        <Link key={x._id} to={`/products/${x._id}`} className="card overflow-hidden hover:shadow-md transition-shadow">
          <div className={`bg-slate-100 flex items-center justify-center ${columns === 3 ? "h-40 md:h-44" : "h-24 rounded mb-2"}`}>
            {x.thumbnailUrl ? (
              <img src={x.thumbnailUrl} alt={x.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-slate-400 text-sm">No Image</span>
            )}
          </div>
          {columns === 3 ? (
            <div className="bg-slate-200/90 px-3 py-2 text-sm font-semibold text-slate-800 border-t border-slate-300/60">
              {x.name}
            </div>
          ) : null}
          <div className={`p-3 ${columns === 3 ? "pt-2" : ""}`}>
            {columns !== 3 ? <div className="font-medium text-sm">{x.name}</div> : null}
            <div className="text-xs text-slate-600 mt-1 line-clamp-2">{x.shortDescription}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function PartnersPage({ type }) {
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(urlSearch);
  const [items, setItems] = useState([]);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    api
      .get("/partners", { params: { type, search } })
      .then((r) => setItems(r.data))
      .catch(() => setItems(MOCK_PARTNERS.filter((x) => x.name.toLowerCase().includes(search.toLowerCase()))));
  }, [type, search]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <SectionTitle
        title={type === "SYNTHESIS" ? "합성서비스" : "공식 제조사"}
        desc="검색 후 파트너별 제품 탐색"
      />
      <input
        className="card p-2 w-full mb-4"
        placeholder="제조사 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid md:grid-cols-3 gap-3">
        {items.map((p) => (
          <Link key={p._id} to={`/partner/${p._id}/products`} className="card p-4">
            <div className="font-semibold">{p.name}</div>
            <div className="text-sm text-slate-500">{p.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PartnerProducts() {
  const { partnerId } = useParams();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    api
      .get("/products", { params: { partnerId, search, limit: 40 } })
      .then((r) => setItems(r.data.items))
      .catch(() => setItems(MOCK_PRODUCTS.filter((x) => x.name.toLowerCase().includes(search.toLowerCase()))));
  }, [partnerId, search]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <SectionTitle title="제조사별 제품" desc="제품명 검색" />
      <input
        className="card p-2 w-full mb-4"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="제품 검색"
      />
      <ProductGrid items={items} />
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    api.get(`/products/${id}`).then((r) => setItem(r.data));
  }, [id]);

  if (!item) return <div className="container mx-auto max-w-6xl px-4 py-8">Loading...</div>;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
    <div className="card p-5">
      <h1 className="text-2xl font-bold">{item.name}</h1>
      <p className="text-slate-600 mt-2">{item.description}</p>
      <pre className="bg-slate-100 p-3 rounded mt-3 whitespace-pre-wrap">{item.specification || "규격 정보 없음"}</pre>
      <Link
        to={`/inquiry?productId=${item._id}&productName=${encodeURIComponent(item.name)}`}
        className="inline-block mt-4 bg-slate-900 text-white px-4 py-2 rounded"
      >
        견적문의
      </Link>
    </div>
    </div>
  );
}

function ListPage({ title, endpoint, hasYoutube, detailPath }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    api
      .get(`/${endpoint}`, { params: { search: q, limit: 20 } })
      .then((r) => setItems(r.data.items))
      .catch(() => {
        const source = endpoint === "notices" ? MOCK_NOTICES : endpoint === "events" ? MOCK_EVENTS : MOCK_REFERENCES;
        setItems(source.filter((x) => x.title.toLowerCase().includes(q.toLowerCase())));
      });
  }, [q, endpoint]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <SectionTitle title={title} desc="목록/검색" />
      <input
        className="card p-2 w-full mb-4"
        placeholder="검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="space-y-3">
        {items.map((x) => (
          <Link to={`/${detailPath}/${x._id}`} key={x._id} className="card p-4 block">
            <div className="font-semibold">
              {x.title} {x.isImportant ? "📌" : ""}
            </div>
            <div className="text-sm text-slate-500 mt-1">{x.summary}</div>
            {hasYoutube && x.youtubeUrl ? (
              <a
                className="text-blue-700 text-sm"
                href={x.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                YouTube
              </a>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

function PostDetailPage({ endpoint, title }) {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get(`/${endpoint}/${id}`)
      .then((r) => setItem(r.data))
      .catch(() => setErr("데이터를 불러오지 못했습니다."));
  }, [endpoint, id]);

  if (err) return <div className="container mx-auto max-w-6xl px-4 py-8"><div className="card p-5 text-red-600">{err}</div></div>;
  if (!item) return <div className="container mx-auto max-w-6xl px-4 py-8">Loading...</div>;

  const listPath = title === "공지사항" ? "/notices" : title === "이벤트" ? "/events" : "/references";

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
    <div className="card p-5 space-y-3">
      <h1 className="text-2xl font-bold">{item.title}</h1>
      <p className="text-slate-500">{item.summary}</p>
      <article className="whitespace-pre-wrap">{item.content || "본문 없음"}</article>
      {item.youtubeUrl ? (
        <iframe
          title="youtube"
          src={item.youtubeUrl.replace("watch?v=", "embed/")}
          className="w-full h-64 rounded"
          allowFullScreen
        />
      ) : null}
      <div>
        <Link className="text-blue-700" to={listPath}>
          목록으로
        </Link>
      </div>
    </div>
    </div>
  );
}

function InquiryPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    productId: params.get("productId") || "",
    productName: params.get("productName") || "",
    message: "",
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/inquiries", form);
      setDone(true);
    } catch (e2) {
      setError(e2.response?.data?.error || "문의 등록에 실패했습니다.");
    }
  };

  if (done) return <div className="container mx-auto max-w-6xl px-4 py-8"><div className="card p-5">문의가 접수되었습니다.</div></div>;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
    <form onSubmit={onSubmit} className="card p-5 space-y-3">
      {[
        ["name", "이름"],
        ["company", "회사명"],
        ["email", "이메일"],
        ["phone", "연락처"],
        ["productName", "제품명"],
      ].map(([k, l]) => (
        <input
          key={k}
          required={k === "name" || k === "email"}
          className="w-full border rounded p-2"
          placeholder={l}
          value={form[k]}
          onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        />
      ))}
      <textarea
        required
        className="w-full border rounded p-2 min-h-24"
        placeholder="문의 내용"
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
      />
      {error ? <p className="text-red-600 text-sm">{error}</p> : null}
      <button className="bg-slate-900 text-white px-4 py-2 rounded">제출</button>
    </form>
    </div>
  );
}

function CartPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">장바구니</h1>
      <p className="text-slate-600 mt-3">장바구니 기능은 추후 연동 예정입니다. 견적이 필요하시면 견적문의를 이용해 주세요.</p>
      <Link to="/inquiry" className="inline-block mt-6 bg-[#002D5E] text-white px-5 py-2.5 rounded-md text-sm font-medium">
        견적문의
      </Link>
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
    <div className="container mx-auto max-w-6xl px-4 py-10">
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
            return (
              <label key={f} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(v === true || v === "true")}
                  onChange={(e) => setForm({ ...form, [f]: e.target.checked })}
                />
                {f}
              </label>
            );
          }
          return (
            <input
              key={f}
              className="w-full border rounded p-2"
              placeholder={f}
              value={v}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
            />
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
          className="border rounded p-2 flex-1"
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
              <th className="border p-2 w-24">활성</th>
              <th className="border p-2 w-48">작성일</th>
              <th className="border p-2 w-32">관리</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((x, idx) => (
              <tr key={x._id}>
                <td className="border p-2 text-center">{(result.page - 1) * 10 + idx + 1}</td>
                <td className="border p-2">{x.title || x.name}</td>
                <td className="border p-2 text-center">{x.isActive === false ? "N" : "Y"}</td>
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
      <p className="text-sm text-slate-600">헤더 로고 이미지 URL과 회사명을 입력합니다. 푸터 로고는 &quot;푸터 관리&quot;에서 설정합니다.</p>
      <label className="block text-sm font-medium">헤더 로고 URL</label>
      <input className="w-full border rounded p-2 text-sm" value={data.headerLogoUrl || ""} onChange={(e) => setData({ ...data, headerLogoUrl: e.target.value })} />
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
      <p className="text-sm text-slate-600">푸터에 노출되는 로고, 연락처, 주소, 안내문구를 입력합니다. (이미지는 URL)</p>
      <label className="block text-sm font-medium">푸터 로고 URL</label>
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
      <input className="border rounded p-2 text-sm w-full max-w-xs mb-3" placeholder="이메일·이름 검색" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
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
          className="border rounded p-2 text-sm w-64"
          placeholder="이름/이메일/제품 검색"
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
                  {i.name} / {i.productName || i.productId?.name}
                </td>
                <td className="border p-2">
                  {i.email}
                  <br />
                  {i.phone}
                </td>
                <td className="border p-2 max-w-xl whitespace-pre-wrap">{i.message}</td>
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

function AdminHome() {
  const basicTabs = ["logo", "footer", "admins"];
  const [tab, setTab] = useState("logo");
  const [basicOpen, setBasicOpen] = useState(true);
  const navigate = useNavigate();
  const contentTabOrder = ["banners", "popups", "partners", "products", "notices", "events", "references", "inquiries"];
  const tabs = {
    logo: <AdminLogoSettings />,
    footer: <AdminFooterSettings />,
    admins: <AdminAccountsScreen />,
    banners: <CrudScreen title="배너 관리" path="banners" fields={["title", "imageUrl", "linkUrl", "sortOrder", "isActive"]} />,
    popups: <CrudScreen title="팝업 관리" path="popups" fields={["title", "content", "imageUrl", "startAt", "endAt", "isActive"]} />,
    partners: <CrudScreen title="고객사/제조사 관리" path="partners" fields={["name", "type", "logoUrl", "description", "websiteUrl", "sortOrder", "isActive"]} />,
    products: <CrudScreen title="제품 관리" path="products" fields={["name", "category", "partnerId", "thumbnailUrl", "shortDescription", "description", "specification", "isRecommended", "isNew", "isActive"]} />,
    notices: <CrudScreen title="공지사항 관리" path="notices" fields={["title", "summary", "content", "thumbnailUrl", "isImportant", "isActive"]} />,
    events: <CrudScreen title="이벤트 관리" path="events" fields={["title", "summary", "content", "thumbnailUrl", "isActive"]} />,
    references: <CrudScreen title="참고논문 관리" path="references" fields={["title", "summary", "content", "thumbnailUrl", "youtubeUrl", "isActive"]} />,
    inquiries: <InquiriesAdmin />,
  };
  const labels = {
    logo: "로고 관리",
    footer: "푸터 관리",
    admins: "관리자 관리",
    banners: "배너 관리",
    popups: "팝업 관리",
    partners: "고객사/제조사 관리",
    products: "제품 관리",
    notices: "공지사항 관리",
    events: "이벤트 관리",
    references: "참고논문 관리",
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
        <Route path="/synthesis" element={<PartnersPage type="SYNTHESIS" />} />
        <Route path="/partner/:partnerId/products" element={<PartnerProducts />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/events" element={<ListPage title="이벤트" endpoint="events" detailPath="events" />} />
        <Route path="/events/:id" element={<PostDetailPage title="이벤트" endpoint="events" />} />
        <Route path="/references" element={<ListPage title="참고논문" endpoint="references" hasYoutube detailPath="references" />} />
        <Route path="/references/:id" element={<PostDetailPage title="참고논문" endpoint="references" />} />
        <Route path="/notices" element={<ListPage title="공지사항" endpoint="notices" detailPath="notices" />} />
        <Route path="/notices/:id" element={<PostDetailPage title="공지사항" endpoint="notices" />} />
        <Route path="/inquiry" element={<InquiryPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
