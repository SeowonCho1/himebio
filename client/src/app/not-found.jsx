import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-slate-600">요청하신 페이지를 찾을 수 없습니다.</p>
      <Link href="/" className="text-[#002D5E] font-medium hover:underline">
        홈으로
      </Link>
    </div>
  );
}
