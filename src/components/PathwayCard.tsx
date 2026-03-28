import Link from "next/link";

interface PathwayCardProps {
  href: string;
  title: string;
  subtitle: string;
  cta: string;
  className?: string;
  children: React.ReactNode;
}

export default function PathwayCard({ href, title, subtitle, cta, className, children }: PathwayCardProps) {
  return (
    <Link href={href} className={`pathway-card ${className || ""}`}>
      <div className="pathway-card-visual">
        {children}
      </div>
      <div className="pathway-card-info">
        <h2 className="pathway-card-title">{title}</h2>
        <p className="pathway-card-subtitle">{subtitle}</p>
        <span className="pathway-card-cta">{cta}</span>
      </div>
    </Link>
  );
}
