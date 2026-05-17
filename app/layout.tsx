import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto Page Generator",
  description: "Browser-side workflow for tool page markdown generation."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
