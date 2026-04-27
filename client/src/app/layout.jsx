import Script from "next/script";
import "./globals.css";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

export const metadata = {
  title: "하이미바이오메드",
  description:
    "하이미바이오메드 공식 사이트. 바이오 시약·제조사 제품, 합성서비스, 참고자료, 공지, 견적문의.",
  robots: "index,follow",
};

const kakaoMapKey = (process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY || "").trim();

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@2.0/nanumsquare.css"
        />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className="min-h-screen flex flex-col">
        {children}
        <ScrollToTopButton />
        {kakaoMapKey ? (
          <Script
            src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoMapKey)}&autoload=false`}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
