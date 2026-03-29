"use client";

import { useState } from "react";
import { IconPlus, IconEdit } from "../icons";

interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  period: string;
  location: string;
  logo: string | null;
  url: string | null;
  bullets: string[];
}

interface ExperienceEditorProps {
  entries: ExperienceEntry[];
  onChange: (entries: ExperienceEntry[]) => void;
}

export default function ExperienceEditor({ entries, onChange }: ExperienceEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(entries[0]?.id || null);
  const [editingBullet, setEditingBullet] = useState<{ entryId: string; index: number } | null>(null);
  const [bulletDraft, setBulletDraft] = useState("");

  const updateEntry = (id: string, updates: Partial<ExperienceEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const addBullet = (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    updateEntry(id, { bullets: [...entry.bullets, "New achievement..."] });
  };

  const updateBullet = (entryId: string, index: number, text: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    const bullets = [...entry.bullets];
    bullets[index] = text;
    updateEntry(entryId, { bullets });
  };

  const deleteBullet = (entryId: string, index: number) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    updateEntry(entryId, { bullets: entry.bullets.filter((_, i) => i !== index) });
  };

  const addRole = () => {
    const newEntry: ExperienceEntry = {
      id: `role-${Date.now()}`,
      company: "Company Name",
      role: "Role Title",
      period: "Start – End",
      location: "City",
      logo: null,
      url: null,
      bullets: ["Describe your achievement..."],
    };
    onChange([newEntry, ...entries]);
    setExpandedId(newEntry.id);
  };

  const deleteRole = (id: string) => {
    if (confirm("Delete this role?")) {
      onChange(entries.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="admin-experience">
      <div className="admin-content-header">
        <div>
          <p className="admin-content-label">Resume</p>
          <h2 className="admin-content-title">Experience</h2>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={addRole}>
          <IconPlus size={14} /> Add Role
        </button>
      </div>

      <div className="admin-role-list">
        {entries.map((entry) => (
          <div key={entry.id} className="admin-role-card">
            <div
              className="admin-role-header"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <div className="admin-role-header-left">
                <div>
                  <h3 className="admin-role-company">{entry.company}</h3>
                  <p className="admin-role-meta">{entry.role} · {entry.bullets.length} bullets</p>
                </div>
              </div>
              <span className={`admin-role-chevron ${expandedId === entry.id ? "open" : ""}`}>▸</span>
            </div>

            {expandedId === entry.id && (
              <div className="admin-role-body">
                <div className="admin-role-fields">
                  <div className="admin-role-field-row">
                    <label className="admin-field">
                      <span className="admin-field-label">Company</span>
                      <input type="text" value={entry.company} onChange={(e) => updateEntry(entry.id, { company: e.target.value })} className="admin-input" />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field-label">Role</span>
                      <input type="text" value={entry.role} onChange={(e) => updateEntry(entry.id, { role: e.target.value })} className="admin-input" />
                    </label>
                  </div>
                  <div className="admin-role-field-row">
                    <label className="admin-field">
                      <span className="admin-field-label">Period</span>
                      <input type="text" value={entry.period} onChange={(e) => updateEntry(entry.id, { period: e.target.value })} className="admin-input" />
                    </label>
                    <label className="admin-field">
                      <span className="admin-field-label">Location</span>
                      <input type="text" value={entry.location} onChange={(e) => updateEntry(entry.id, { location: e.target.value })} className="admin-input" />
                    </label>
                  </div>
                  <div className="admin-role-field-row">
                    <label className="admin-field">
                      <span className="admin-field-label">URL (optional)</span>
                      <input type="text" value={entry.url || ""} onChange={(e) => updateEntry(entry.id, { url: e.target.value || null })} className="admin-input" placeholder="https://..." />
                    </label>
                  </div>
                </div>

                <div className="admin-bullets">
                  {entry.bullets.map((bullet, i) => (
                    <div key={i} className="admin-bullet">
                      {editingBullet?.entryId === entry.id && editingBullet?.index === i ? (
                        <div className="admin-bullet-edit">
                          <textarea
                            value={bulletDraft}
                            onChange={(e) => setBulletDraft(e.target.value)}
                            className="admin-input admin-textarea"
                            rows={3}
                          />
                          <div className="admin-bullet-edit-actions">
                            <button className="admin-btn admin-btn-secondary" onClick={() => setEditingBullet(null)}>Cancel</button>
                            <button className="admin-btn admin-btn-primary" onClick={() => {
                              updateBullet(entry.id, i, bulletDraft);
                              setEditingBullet(null);
                            }}>Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="admin-bullet-text" dangerouslySetInnerHTML={{ __html: bullet }} />
                          <div className="admin-bullet-actions">
                            <button className="admin-bullet-btn" onClick={() => { setEditingBullet({ entryId: entry.id, index: i }); setBulletDraft(bullet); }}>
                              <IconEdit size={11} />
                            </button>
                            <button className="admin-bullet-btn admin-bullet-delete" onClick={() => deleteBullet(entry.id, i)}>×</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  <button className="admin-add-pill" onClick={() => addBullet(entry.id)}>
                    <IconPlus size={10} /> Add bullet
                  </button>
                </div>

                <button className="admin-delete-link" onClick={() => deleteRole(entry.id)}>Delete role</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
