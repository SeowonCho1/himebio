"use client";

export function ScrollToTopButton() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-[140] h-11 w-11 rounded-full border border-slate-300 bg-white/95 text-slate-700 shadow-md transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
      aria-label="맨 위로 이동"
      title="맨 위로"
    >
      ↑
    </button>
  );
}
