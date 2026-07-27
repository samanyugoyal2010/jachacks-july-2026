"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/transfer", label: "Demo" },
  { href: "/investigation/demo-case", label: "Graph" },
  { href: "/replay/demo-case", label: "Replay" },
  { href: "/audit/demo-case", label: "Audit" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary navigation">
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(link.href.replace("/demo-case", ""));
        return (
          <Link className={active ? "active" : ""} aria-current={active ? "page" : undefined} href={link.href} key={link.href}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
