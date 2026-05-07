import { Suspense } from "react";
import { Layout } from "@/site/AppViews";

export default function SiteLayout({ children }) {
  return (
    <Layout>
      <Suspense fallback={<div className="mx-auto w-full max-w-full px-4 py-16 text-center text-slate-500 md:max-w-[70%]">로딩…</div>}>
        {children}
      </Suspense>
    </Layout>
  );
}
