"use client";

import { useState } from "react";

interface EducationEntry {
  id: string;
  school: string;
  logo: string | null;
  degree: string;
  cgpa: string;
  period: string;
  url: string | null;
  leadership: string[];
}

interface EducationEditorProps {
  entries: EducationEntry[];
  onChange: (entries: EducationEntry[]) => void;
}

export default function EducationEditor({ entries, onChange }: EducationEditorProps) {
  const [newLeadership, setNewLeadership] = useState<Record<string, string>>({});

  const updateEntry = (id: string, updates: Partial<EducationEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const addLeadership = (id: string) => {
    const value = newLeadership[id]?.trim();
    if (!value) return;
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    updateEntry(id, { leadership: [...entry.leadership, value] });
    setNewLeadership({ ...newLeadership, [id]: "" });
  };

  const removeLeadership = (id: string, index: number) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    updateEntry(id, { leadership: entry.leadership.filter((_, i) => i !== index) });
  };

  return (
    <div>
      <div className="admin-content-header">
        <div>
          <p className="admin-content-label">Resume</p>
          <h2 className="admin-content-title">Education</h2>
        </div>
      </div>

      {entries.map((edu) => (
        <div key={edu.id} className="admin-role-card">
          <div className="admin-role-body" style={{ paddingTop: "20px" }}>
            <div className="admin-role-fields">
              <div className="admin-role-field-row">
                <label className="admin-field">
                  <span className="admin-field-label">School</span>
                  <input type="text" value={edu.school} onChange={(e) => updateEntry(edu.id, { school: e.target.value })} className="admin-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field-label">Degree</span>
                  <input type="text" value={edu.degree} onChange={(e) => updateEntry(edu.id, { degree: e.target.value })} className="admin-input" />
                </label>
              </div>
              <div className="admin-role-field-row">
                <label className="admin-field">
                  <span className="admin-field-label">CGPA</span>
                  <input type="text" value={edu.cgpa} onChange={(e) => updateEntry(edu.id, { cgpa: e.target.value })} className="admin-input" />
                </label>
                <label className="admin-field">
                  <span className="admin-field-label">Period</span>
                  <input type="text" value={edu.period} onChange={(e) => updateEntry(edu.id, { period: e.target.value })} className="admin-input" />
                </label>
              </div>
              <label className="admin-field">
                <span className="admin-field-label">URL (optional)</span>
                <input type="text" value={edu.url || ""} onChange={(e) => updateEntry(edu.id, { url: e.target.value || null })} className="admin-input" placeholder="https://..." />
              </label>
            </div>

            <div className="admin-leadership">
              <p className="admin-field-label">Leadership & Activities</p>
              <div className="admin-skill-tags">
                {edu.leadership.map((l, i) => (
                  <span key={i} className="admin-skill-tag">
                    {l}
                    <button className="admin-skill-remove" onClick={() => removeLeadership(edu.id, i)}>×</button>
                  </span>
                ))}
                <div className="admin-skill-add">
                  <input
                    type="text"
                    value={newLeadership[edu.id] || ""}
                    onChange={(e) => setNewLeadership({ ...newLeadership, [edu.id]: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addLeadership(edu.id)}
                    className="admin-input admin-skill-input"
                    placeholder="Add activity..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
