"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

const STORAGE_PREFIX = "popup-hide-until:";

function localYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isHiddenToday(popupId) {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${popupId}`) === localYmd();
  } catch {
    return false;
  }
}

function setHiddenToday(popupId) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${popupId}`, localYmd());
  } catch {
    /* ignore */
  }
}

function positionClass(pos) {
  switch (pos) {
    case "top_left":
      return "left-4 top-20 md:top-28";
    case "top_right":
      return "right-4 top-20 md:top-28";
    case "bottom_left":
      return "left-4 bottom-4";
    case "bottom_right":
      return "right-4 bottom-4";
    default:
      return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
  }
}

function PopupCard({ popup, onDismiss }) {
  const [hideToday, setHideToday] = useState(false);
  const w = Math.min(Math.max(Number(popup.widthPx) || 400, 200), 1200);
  const h = Math.min(Math.max(Number(popup.heightPx) || 520, 200), 2000);
  const mode = popup.displayMode === "image_overlay" ? "image_overlay" : "image_only";
  const img = typeof popup.imageUrl === "string" ? popup.imageUrl.trim() : "";

  const close = useCallback(() => {
    if (hideToday) setHiddenToday(String(popup._id));
    onDismiss(String(popup._id));
  }, [hideToday, onDismiss, popup._id]);

  const body =
    mode === "image_overlay" && img ? (
      <div
        className="relative min-h-0 flex-1 overflow-auto bg-slate-900 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: img ? `url(${JSON.stringify(img)})` : undefined }}
      >
        <div className="relative z-[1] min-h-full bg-white/90 p-4 text-slate-900 backdrop-blur-[2px]">
          {popup.title ? <p className="mb-2 text-center text-sm font-semibold">{popup.title}</p> : null}
          {popup.content ? (
            <div
              className="prose prose-sm max-w-none text-slate-800 [&_img]:max-w-full [&_img]:h-auto"
              dangerouslySetInnerHTML={{ __html: popup.content }}
            />
          ) : (
            <p className="text-center text-sm text-slate-500">표시할 내용이 없습니다.</p>
          )}
        </div>
      </div>
    ) : img ? (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black">
        <img src={img} alt="" className="max-h-full max-w-full object-contain" />
      </div>
    ) : (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-white p-4 text-slate-800">
        {popup.title ? <p className="mb-2 text-center text-base font-bold">{popup.title}</p> : null}
        {popup.content ? (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{popup.content}</div>
        ) : (
          <p className="text-center text-sm text-slate-500">이미지 또는 내용을 등록해 주세요.</p>
        )}
      </div>
    );

  return (
    <>
      <button
        type="button"
        aria-label="배경 닫기"
        className="fixed inset-0 z-[5000] bg-black/45"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`popup-title-${popup._id}`}
        className={`fixed z-[5001] flex max-h-[min(92vh,calc(100vh-5rem))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl ${positionClass(popup.position)}`}
        style={{ width: `${w}px`, height: `${h}px` }}
      >
        <div id={`popup-title-${popup._id}`} className="sr-only">
          {popup.title || "프로모션 팝업"}
        </div>
        {body}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-black px-3 py-2.5 text-sm text-white">
          <label className="flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={hideToday}
              onChange={(e) => {
                const checked = e.target.checked;
                setHideToday(checked);
                if (checked) {
                  setHiddenToday(String(popup._id));
                  onDismiss(String(popup._id));
                }
              }}
              className="h-4 w-4 shrink-0 rounded border-white/50 bg-white text-slate-900"
            />
            <span>오늘 하루 이 창을 열지 않음</span>
          </label>
          <button
            type="button"
            aria-label="닫기"
            onClick={close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xl leading-none text-white hover:bg-white/15"
          >
            ×
          </button>
        </div>
      </div>
    </>
  );
}

export function SitePopups() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [items, setItems] = useState([]);
  const [sessionClosed, setSessionClosed] = useState(() => new Set());

  useEffect(() => {
    if (!isHome) return;
    api
      .get("/popups/active")
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => setItems([]));
  }, [isHome]);

  const visible = useMemo(() => {
    const sorted = [...items].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    const first =
      sorted.find((p) => p._id && !sessionClosed.has(String(p._id)) && !isHiddenToday(String(p._id))) || null;
    return first;
  }, [items, sessionClosed]);

  const onDismiss = useCallback((id) => {
    setSessionClosed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  if (!isHome || !visible) return null;

  return <PopupCard popup={visible} onDismiss={onDismiss} />;
}
