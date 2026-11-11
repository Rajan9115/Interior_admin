import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MAMA INTERIOR CMS",
    template: "%s | MAMA INTERIOR CMS",
  },
  description: "Administrative Content Management System for MAMA INTERIOR contracting business.",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-[#172B40]">
        {children}
      </body>
    </html>
  );
}
