import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "卡片進度簿｜信用卡回饋與消費追蹤",
  description: "掌握信用卡回饋上限、帳單週期與消費滿額目標。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

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
