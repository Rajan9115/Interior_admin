import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MAMA INTERIOR CMS",
    template: "%s | MAMA INTERIOR CMS",
  },
  description: "Administrative Content Management System for MAMA INTERIOR contracting business.",
  robots: "noindex, nofollow",
  icons: {
    icon: [
      { url: "/branding/favicon.ico", sizes: "any" },
      { url: "/branding/favicon.svg", type: "image/svg+xml" },
      { url: "/branding/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/branding/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/branding/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
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
