"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Magnetic } from "~/components/magnetic";
import { Button } from "~/components/ui/button";
import { loadLast } from "~/lib/audit/session";
import { cn } from "~/lib/utils";

const links = [
  { href: "/", label: "How it works" },
  { href: "/apply", label: "Apply" },
  { href: "/appeal", label: "Appeal & fix" },
];

export function Navbar() {
  const pathname = usePathname();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const sync = () => setDenied(!!loadLast()?.denied);
    sync();
    const t = setInterval(sync, 800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/60 bg-card/80 py-1.5 pr-1.5 pl-4 shadow-lg shadow-black/20 backdrop-blur-xl backdrop-saturate-150"
        aria-label="Primary"
      >
        <Link
          href="/"
          className="font-display mr-1 text-lg font-semibold tracking-tight italic transition-transform duration-150 ease-out active:scale-95"
        >
          Glass Box
        </Link>
        <div className="flex gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            const locked = link.href === "/appeal" && !denied;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={locked ? "Unlocks if an application is declined" : undefined}
                className={cn(
                  "relative rounded-full px-2.5 py-1.5 text-sm tracking-wide transition-colors duration-150 ease-out active:scale-95",
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                  locked && !active && "opacity-40",
                )}
              >
                {link.label}
                {link.href === "/appeal" && denied && (
                  <span className="absolute -top-0.5 -right-0.5 flex size-2 rounded-full bg-destructive" />
                )}
              </Link>
            );
          })}
        </div>
        <Magnetic className="ml-1" strength={0.14} radius={18}>
          <Button asChild size="sm">
            <Link href="/apply">Apply now →</Link>
          </Button>
        </Magnetic>
      </nav>
    </div>
  );
}
