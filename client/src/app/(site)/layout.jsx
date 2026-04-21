import { Suspense } from "react";
import { Layout } from "@/site/AppViews";

export default function SiteLayout({ children }) {
  return (
    <Layout>
      <Suspense fallback={<div className="container mx-auto max-w-full md:max-w-[85%] px-4 py-16 text-center text-slate-500">로딩…</div>}>
        {children}
      </Suspense>
    </Layout>
  );
}
