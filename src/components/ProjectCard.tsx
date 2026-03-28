interface ProjectCardProps {
  title: string;
  label: string;
  description: string;
  tech: string[];
  icon?: string;
  badges: { label: string; href: string; icon: "github" | "play-store" | "chrome-store" }[];
  href: string;
}

const icons = {
  github: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>
  ),
  "play-store": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 010 2.594zM1.337.924a1.486 1.486 0 00-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 00-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"/></svg>
  ),
  "chrome-store": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0112 6.545h10.691A12 12 0 0012 0zM1.931 5.47A11.943 11.943 0 000 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 01-6.865-2.29zm13.342 2.166a5.446 5.446 0 011.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 110-8.728 4.364 4.364 0 010 8.728Z"/></svg>
  ),
};

export default function ProjectCard({ title, label, description, tech, icon, badges, href }: ProjectCardProps) {
  return (
    <div className="project-card reveal">
      <a href={href} target="_blank" rel="noopener noreferrer" className="pc-arrow" aria-label={`View ${title}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
      </a>
      <div className="pc-top">
        {icon && (
          <div className="pc-logo">
            <img src={icon} alt={`${title} icon`} width={48} height={48} />
          </div>
        )}
        <div>
          <p className="pc-label">{label}</p>
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
            {icons[badge.icon]}
            {badge.label}
          </a>
        ))}
      </div>
    </div>
  );
}
