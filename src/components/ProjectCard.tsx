interface ProjectCardProps {
  title: string;
  description: string;
  tech: string;
  icon?: string;
  badges: { label: string; href: string }[];
}

export default function ProjectCard({ title, description, tech, icon, badges }: ProjectCardProps) {
  return (
    <div className="project-card reveal">
      {icon && <span className="project-icon">{icon}</span>}
      <h3 className="project-title">{title}</h3>
      <p className="project-desc">{description}</p>
      <p className="project-tech">{tech}</p>
      <div className="project-badges">
        {badges.map((badge, i) => (
          <a key={i} href={badge.href} target="_blank" rel="noopener noreferrer" className="project-badge">
            {badge.label}
          </a>
        ))}
      </div>
    </div>
  );
}
