import type { Metadata, Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

// Figures are set in a serif, as in print; Chinese stays in the system face.
const serif = Instrument_Serif({ weight: "400", subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "CARDI｜額度、回饋與卡片",
  description: "一眼看到每張卡還能刷多少、有沒有滿額，再挑這筆該刷哪張。",
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
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#0b0a09',colorScheme:'dark'};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className={serif.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
