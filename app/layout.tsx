import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import "./polish.css";
import "./design.css";

export const metadata: Metadata = {
  title: "卡片進度簿｜信用卡回饋與消費追蹤",
  description: "掌握信用卡回饋上限、帳單週期與消費滿額目標。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: [{url:"/favicon-32.png",sizes:"32x32",type:"image/png"}],
    shortcut: "/favicon-32.png",
    apple: [{url:"/apple-touch-icon.png",sizes:"180x180",type:"image/png"}],
  },
  appleWebApp: {capable:true,title:"卡片進度簿",statusBarStyle:"black-translucent"},
};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#101517'};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" data-theme="dark" suppressHydrationWarning>
      <body className="antialiased">
        <Script id="ledger-theme" strategy="beforeInteractive">{"try{document.documentElement.dataset.theme=localStorage.getItem('card-ledger-theme')==='light'?'light':'dark'}catch{}"}</Script>
        {children}
      </body>
    </html>
  );
}
