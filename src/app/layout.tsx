import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { ShopProvider } from "@/lib/cart";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FabricVerse — Discover. Shop. Repeat.",
  description:
    "Shop premium fabrics from businesses and individuals. Follow your style. Support real people.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-fv-bg">
        <AuthProvider>
          <ShopProvider>{children}</ShopProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
