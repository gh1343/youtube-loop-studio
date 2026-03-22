import type { Metadata } from "next";
import { Nanum_Myeongjo, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Loop Studio | 유튜브 루프 스튜디오",
  description: "Loop and practice specific ranges from YouTube videos. 유튜브 영상 구간을 반복 연습하세요.",
};

const bodyFont = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Nanum_Myeongjo({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
