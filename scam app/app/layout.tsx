import type { Metadata } from "next";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScamGraph Sentinel",
  description: "Stop authorized-payment scams before the money moves.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand" aria-label="ScamGraph Sentinel home">
            <span className="brandMark">SG</span>
            <span>ScamGraph Sentinel</span>
          </Link>
          <NavLinks />
        </header>
        {children}
      </body>
    </html>
  );
}
