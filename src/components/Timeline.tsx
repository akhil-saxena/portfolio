interface TimelineEntry {
  company: string;
  role: string;
  period: string;
  location: string;
  bullets: string[];
}

interface TimelineProps {
  entries: TimelineEntry[];
}

export default function Timeline({ entries }: TimelineProps) {
  return (
    <div className="timeline">
      {entries.map((entry, i) => (
        <div key={i} className="timeline-entry reveal">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div className="timeline-header">
              <div>
                <h3 className="timeline-company">{entry.company}</h3>
                <p className="timeline-role">{entry.role}</p>
              </div>
              <div className="timeline-meta">
                <span className="timeline-period">{entry.period}</span>
                <span className="timeline-location">{entry.location}</span>
              </div>
            </div>
            <ul className="timeline-bullets">
              {entry.bullets.map((bullet, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: bullet }} />
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
