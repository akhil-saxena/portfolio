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
        ←
      </Link>
      <div className="page-nav-actions">
        {children}
        <ThemeToggle />
      </div>
    </nav>
  );
}
