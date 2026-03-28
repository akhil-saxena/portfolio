import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

interface NavProps {
  title: string;
  backHref?: string;
}

export default function Nav({ title, backHref = "/" }: NavProps) {
  return (
    <nav className="nav" aria-label="Main navigation">
      <div className="nav-left">
        <Link href={backHref} className="nav-back" aria-label="Go back">
          ←
        </Link>
        <span className="nav-title">{title}</span>
      </div>
      <ThemeToggle />
    </nav>
  );
}
