import { IconArrowUpRight, getIcon } from "./icons";

interface ProjectCardProps {
  title: string;
  label: string | { text: string; icon: string };
  description: string;
  tech: string[];
  icon?: string | null;
  badges: { label: string; href: string; icon: string }[];
  href: string;
}

export default function ProjectCard({ title, label, description, tech, icon, badges, href }: ProjectCardProps) {
  const labelText = typeof label === "string" ? label : label.text;
  const labelIcon = typeof label === "string" ? null : label.icon;

  return (
    <div className="project-card reveal">
      <a href={href} target="_blank" rel="noopener noreferrer" className="pc-arrow" aria-label={`View ${title}`}>
        <IconArrowUpRight size={18} />
      </a>
      <div className="pc-top">
        <div className="pc-logo">
          {icon ? (
            <img src={icon} alt={`${title} icon`} width={48} height={48} />
          ) : (
            getIcon("code", { size: 24, className: "pc-logo-fallback" })
          )}
        </div>
        <div>
          <p className="pc-label">
            {labelIcon && getIcon(labelIcon, { size: 12 })}
            {labelText}
          </p>
          <h3 className="pc-name">{title}</h3>
        </div>
      </div>
      <p className="pc-desc">{description}</p>
      <div className="pc-stack">
        {tech.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="pc-stores">
        {badges.map((badge, i) => (
          <a key={i} href={badge.href} target="_blank" rel="noopener noreferrer" className="pc-store">
            {getIcon(badge.icon, { size: 14 })}
            {badge.label}
          </a>
        ))}
      </div>
    </div>
  );
}
