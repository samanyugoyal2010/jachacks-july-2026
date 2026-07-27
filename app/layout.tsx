import type { Metadata } from "next";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glass Box",
  description: "Traceable, appealable AI compliance for automated loan decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand" aria-label="Glass Box home">
            <span className="brandMark">GB</span>
            <span>Glass Box</span>
          </Link>
          <NavLinks />
        </header>
        {children}
      </body>
    </html>
  );
}
