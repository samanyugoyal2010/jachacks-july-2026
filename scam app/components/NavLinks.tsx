"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/transfer", label: "Transfer" },
  { href: "/investigation/demo-case", label: "Investigation" },
  { href: "/replay/demo-case", label: "Replay" },
  { href: "/audit/demo-case", label: "Audit" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary navigation">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(link.href.replace("/demo-case", ""));
        return (
          <Link className={active ? "active" : ""} aria-current={active ? "page" : undefined} href={link.href} key={link.href}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
