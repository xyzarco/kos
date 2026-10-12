import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kost Digital",
  description: "Pencatatan penghuni, tagihan, dan reminder WhatsApp untuk pemilik kost",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
