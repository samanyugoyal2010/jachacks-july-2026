import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Poppins } from "next/font/google";
import { BackgroundGlow } from "~/components/background-glow";
import { Navbar } from "~/components/navbar";
import { SmoothScroll } from "~/components/smooth-scroll";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Glass Box — AI Decision Audit",
  description:
    "Auditable multi-agent AI decision platform for high-stakes automated decisions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${fraunces.variable} ${jetbrainsMono.variable} font-sans`}
      >
        <ThemeProvider>
          <SmoothScroll />
          <BackgroundGlow />
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
