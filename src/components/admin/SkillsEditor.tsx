"use client";

import { useState } from "react";
import { IconPlus } from "../icons";

interface SkillGroup {
  category: string;
  icon: string;
  items: string[];
}

interface SkillsEditorProps {
  skills: SkillGroup[];
  onChange: (skills: SkillGroup[]) => void;
}

export default function SkillsEditor({ skills, onChange }: SkillsEditorProps) {
  const [newSkill, setNewSkill] = useState<Record<string, string>>({});

  const updateGroup = (index: number, updates: Partial<SkillGroup>) => {
    onChange(skills.map((g, i) => (i === index ? { ...g, ...updates } : g)));
  };

  const addSkill = (index: number) => {
    const value = newSkill[index]?.trim();
    if (!value) return;
    const group = skills[index];
    if (group.items.includes(value)) return;
    updateGroup(index, { items: [...group.items, value] });
    setNewSkill({ ...newSkill, [index]: "" });
  };

  const removeSkill = (groupIndex: number, skillIndex: number) => {
    const group = skills[groupIndex];
    updateGroup(groupIndex, { items: group.items.filter((_, i) => i !== skillIndex) });
  };

  const addGroup = () => {
    onChange([...skills, { category: "New Category", icon: "code", items: [] }]);
  };

  const deleteGroup = (index: number) => {
    if (confirm("Delete this skill group?")) {
      onChange(skills.filter((_, i) => i !== index));
    }
  };

  return (
    <div>
      <div className="admin-content-header">
        <div>
          <p className="admin-content-label">Resume</p>
          <h2 className="admin-content-title">Skills</h2>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={addGroup}>
          <IconPlus size={14} /> Add Group
        </button>
      </div>

      {skills.map((group, gi) => (
        <div key={gi} className="admin-skill-group">
          <div className="admin-skill-group-header">
            <input
              type="text"
              value={group.category}
              onChange={(e) => updateGroup(gi, { category: e.target.value })}
              className="admin-input admin-skill-category-input"
            />
            <button className="admin-delete-link" onClick={() => deleteGroup(gi)}>Delete</button>
          </div>
          <div className="admin-skill-tags">
            {group.items.map((item, si) => (
              <span key={si} className="admin-skill-tag">
                {item}
                <button className="admin-skill-remove" onClick={() => removeSkill(gi, si)}>×</button>
              </span>
            ))}
            <div className="admin-skill-add">
              <input
                type="text"
                value={newSkill[gi] || ""}
                onChange={(e) => setNewSkill({ ...newSkill, [gi]: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addSkill(gi)}
                className="admin-input admin-skill-input"
                placeholder="Add skill..."
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
