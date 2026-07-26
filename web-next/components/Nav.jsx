"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loadLast } from "../lib/api";

const TABS = [
  { href: "/", label: "Apply", hint: "Submit your application" },
  { href: "/appeal", label: "Appeal & fix", hint: "Only if you were declined" },
  { href: "/simulator", label: "How it works", hint: "Guided examples" },
];

export default function Nav() {
  const path = usePathname();
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    const sync = () => setDenied(!!loadLast()?.summary?.denied);
    sync();
    const t = setInterval(sync, 800);
    return () => clearInterval(t);
  }, []);

  return (
    <nav className="nav">
      <Link href="/" className="navbrand">
        <span>🔭</span>
        <div><b>Glass Box</b><small>auditable lending decisions</small></div>
      </Link>
      <div className="navtabs">
        {TABS.map((t) => {
          const on = path === t.href;
          const locked = t.href === "/appeal" && !denied;
          return (
            <Link key={t.href} href={t.href} className={`navtab ${on ? "on" : ""} ${locked ? "locked" : ""}`} title={t.hint}>
              {t.label}
              {t.href === "/appeal" && denied && <i className="badge">1</i>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
