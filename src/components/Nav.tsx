import Link from "next/link";

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
        {title && <span className="nav-title">{title}</span>}
      </div>
    </nav>
  );
}
