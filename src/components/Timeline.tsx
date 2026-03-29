import Image from "next/image";

interface TimelineEntry {
  id?: string;
  company: string;
  role: string;
  period: string;
  location: string;
  logo?: string | null;
  url?: string | null;
  bullets: string[];
}

interface TimelineProps {
  entries: TimelineEntry[];
}

export default function Timeline({ entries }: TimelineProps) {
  return (
    <div className="timeline">
      {entries.map((entry, i) => (
        <div key={entry.id || i} className="timeline-entry reveal">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div className="timeline-header">
              <div className="timeline-header-left">
                {entry.logo && (
                  <Image src={entry.logo} alt={`${entry.company} logo`} className="timeline-logo" width={32} height={32} />
                )}
                <div>
                  <h3 className="timeline-company">
                    {entry.url ? (
                      <a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.company}</a>
                    ) : (
                      entry.company
                    )}
                  </h3>
                  <p className="timeline-role">{entry.role}</p>
                </div>
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
