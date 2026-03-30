"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

interface PageNavProps {
  backHref?: string;
  children?: React.ReactNode;
}

export default function PageNav({ backHref = "/", children }: PageNavProps) {
  return (
    <nav className="page-nav" aria-label="Main navigation">
      <Link href={backHref} className="page-nav-back" aria-label="Go back">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </Link>
      <div className="page-nav-actions">
        {children}
        <ThemeToggle />
      </div>
    </nav>
  );
}
