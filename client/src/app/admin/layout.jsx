"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin/login")) return;
    if (pathname.startsWith("/admin")) {
      if (!localStorage.getItem("admin_token")) {
        router.replace("/admin/login");
        return;
      }
    }
    setReady(true);
  }, [pathname, router]);

  if (!pathname) return null;
  if (pathname.startsWith("/admin/login")) return children;
  if (pathname.startsWith("/admin") && !ready) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">로딩…</div>;
  }
  return children;
}
