"use client";

import { useState } from "react";
import { IconPlus, IconEdit } from "../icons";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatPeriod(startMonth: string, startYear: string, endMonth: string, endYear: string, isPresent: boolean): string {
  const start = `${startMonth} ${startYear}`.trim();
  const end = isPresent ? "Present" : `${endMonth} ${endYear}`.trim();
  return `${start} – ${end}`;
}

interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  period: string; // Keep for display — computed from start/end
  startMonth: string; // "Jan", "Feb", etc.
  startYear: string; // "2023"
  endMonth: string;  // "Jun" or ""
  endYear: string;   // "2023" or ""
  isPresent: boolean;
  location: string;
  logo: string | null;
  url: string | null;
  bullets: string[];
}

interface ExperienceEditorProps {
  entries: ExperienceEntry[];
  onChange: (entries: ExperienceEntry[]) => void;
}

function SortableBullet({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="admin-bullet" {...attributes}>
      <span className="admin-bullet-handle" {...listeners}>⠿</span>
      {children}
    </div>
  );
}

export default function ExperienceEditor({ entries, onChange }: ExperienceEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(entries[0]?.id || null);
  const [editingBullet, setEditingBullet] = useState<{ entryId: string; index: number } | null>(null);
  const [bulletDraft, setBulletDraft] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleBulletDragEnd = (entryId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    const oldIndex = parseInt(String(active.id).split("-bullet-")[1]);
    const newIndex = parseInt(String(over.id).split("-bullet-")[1]);
    updateEntry(entryId, { bullets: arrayMove(entry.bullets, oldIndex, newIndex) });
  };

  const addRole = () => {
    const newEntry: ExperienceEntry = {
      id: `role-${Date.now()}`,
      company: "Company Name",
      role: "Role Title",
      period: "Jan 2024 – Present",
      startMonth: "Jan",
      startYear: "2024",
      endMonth: "",
      endYear: "",
      isPresent: true,
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
                    <div className="admin-field">
                      <span className="admin-field-label">Start</span>
                      <div className="admin-date-row">
                        <select value={entry.startMonth || ""} onChange={(e) => updateEntry(entry.id, { startMonth: e.target.value, period: formatPeriod(e.target.value, entry.startYear, entry.endMonth, entry.endYear, entry.isPresent) })} className="admin-input admin-date-select">
                          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <input type="text" value={entry.startYear || ""} onChange={(e) => updateEntry(entry.id, { startYear: e.target.value, period: formatPeriod(entry.startMonth, e.target.value, entry.endMonth, entry.endYear, entry.isPresent) })} className="admin-input admin-year-input" placeholder="Year" maxLength={4} />
                      </div>
                    </div>
                    <div className="admin-field">
                      <span className="admin-field-label">End</span>
                      <div className="admin-date-row">
                        {!entry.isPresent && (
                          <>
                            <select value={entry.endMonth || ""} onChange={(e) => updateEntry(entry.id, { endMonth: e.target.value, period: formatPeriod(entry.startMonth, entry.startYear, e.target.value, entry.endYear, false) })} className="admin-input admin-date-select">
                              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <input type="text" value={entry.endYear || ""} onChange={(e) => updateEntry(entry.id, { endYear: e.target.value, period: formatPeriod(entry.startMonth, entry.startYear, entry.endMonth, e.target.value, false) })} className="admin-input admin-year-input" placeholder="Year" maxLength={4} />
                          </>
                        )}
                        <label className="admin-checkbox-label">
                          <input type="checkbox" checked={entry.isPresent || false} onChange={(e) => {
                            const present = e.target.checked;
                            updateEntry(entry.id, { isPresent: present, period: formatPeriod(entry.startMonth, entry.startYear, entry.endMonth, entry.endYear, present) });
                          }} />
                          Present
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="admin-role-field-row">
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
                    <div className="admin-field">
                      <span className="admin-field-label">Company Logo</span>
                      <div className="admin-logo-field">
                        {entry.logo ? (
                          <div className="admin-logo-preview">
                            <img src={entry.logo} alt="Logo" width={32} height={32} />
                            <button className="admin-logo-remove" onClick={() => updateEntry(entry.id, { logo: null })}>×</button>
                          </div>
                        ) : (
                          <input type="text" value="" onChange={(e) => updateEntry(entry.id, { logo: e.target.value || null })} className="admin-input" placeholder="Paste image URL..." />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="admin-bullets">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleBulletDragEnd(entry.id)}
                  >
                    <SortableContext
                      items={entry.bullets.map((_, i) => `${entry.id}-bullet-${i}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {entry.bullets.map((bullet, i) => (
                        <SortableBullet key={`${entry.id}-bullet-${i}`} id={`${entry.id}-bullet-${i}`}>
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
                        </SortableBullet>
                      ))}
                    </SortableContext>
                  </DndContext>
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
