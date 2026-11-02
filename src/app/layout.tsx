import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "NutriScan AI", template: "%s · NutriScan AI" },
  description: "Scan your food. Discover your nutrition. Make informed choices.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#FBFAF5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
          Skip to content
        </a>
        <Nav />
        <main id="main" className="pb-24 md:pb-0">{children}</main>
        <footer className="mx-auto max-w-5xl px-5 pb-28 pt-10 text-sm text-muted md:pb-12">
          NutriScan AI gives estimates, not laboratory results or medical advice. Talk to a doctor or registered dietitian
          before making health decisions.
        </footer>
      </body>
    </html>
  );
}
