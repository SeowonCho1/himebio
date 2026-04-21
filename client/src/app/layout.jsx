import Script from "next/script";
import "./globals.css";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";

export const metadata = {
  title: "하이미바이오메드",
  description:
    "하이미바이오메드 공식 사이트. 바이오 시약·제조사 제품, 합성서비스, 참고자료, 공지, 견적문의.",
  robots: "index,follow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link href="https://hangeul.pstatic.net/hangeul_static/css/nanum-gothic.css" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className="min-h-screen flex flex-col">
        {children}
        <ScrollToTopButton />
        <Script
          src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=a52f604d33143e31be2db34b4d5b9cfd"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
