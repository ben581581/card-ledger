import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./polish.css";
import "./cardi.css";

export const metadata: Metadata = {
  title: "CARDI｜信用卡回饋與消費追蹤",
  description: "掌握信用卡回饋上限、帳單週期與消費滿額目標。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: [
      {url:"/favicon-16-graphite-v2.png",sizes:"16x16",type:"image/png"},
      {url:"/favicon-32-graphite-v2.png",sizes:"32x32",type:"image/png"},
    ],
    shortcut: "/favicon-32-graphite-v2.png",
    apple: [{url:"/apple-touch-icon-graphite-v2.png",sizes:"180x180",type:"image/png"}],
  },
  appleWebApp: {capable:true,title:"CARDI",statusBarStyle:"black-translucent"},
};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#080a0b'};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" data-theme="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
