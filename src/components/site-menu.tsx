"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function SiteMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="sg-menu" ref={rootRef}>
      <button
        className="sg-menu__trigger"
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      </button>
      <nav className="sg-menu__panel" id="site-menu" aria-label="Site menu" hidden={!open}>
        <Link href="/plots" onClick={() => setOpen(false)}>
          Explore plots
        </Link>
        <a href="tel:+919000000000" onClick={() => setOpen(false)}>
          Contact us · +91 90000 00000
        </a>
      </nav>
    </div>
  );
}
