"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * react-router NavLink 대체: 활성 구간은 pathname 기준.
 * end=true 이면 정확히 href 와 일치할 때만 active.
 */
export function NavLink({ href, className, end = false, children, ...rest }) {
  const pathname = usePathname() || "";
  const path = typeof href === "string" ? href : "";
  const base = path.split("?")[0] || path;
  const isActive = end ? pathname === base : pathname === base || (base !== "/" && pathname.startsWith(`${base}/`));
  const cls = typeof className === "function" ? className({ isActive, isPending: false }) : className;
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
