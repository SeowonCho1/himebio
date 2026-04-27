"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

function getOrCreateVisitorId() {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem("site_vid");
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem("site_vid", id);
    }
    return id;
  } catch {
    return null;
  }
}

/** 사이트 레이아웃에만 두세요. 경로가 바뀔 때마다 조회수를 1회씩 집계합니다. */
export function VisitBeacon() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;
    api.post("/visits", { visitorId, path: pathname }).catch(() => {});
  }, [pathname]);

  return null;
}
