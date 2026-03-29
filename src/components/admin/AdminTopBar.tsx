"use client";

import ThemeToggle from "../ThemeToggle";
import DeployButton from "./DeployButton";

type Tab = "home" | "photography" | "dev";

interface AdminTopBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  deployProps: {
    hasUnsaved: boolean;
    photos: unknown[];
    resume: {
      experience: unknown[];
      projects: unknown[];
      skills: unknown[];
      education: unknown[];
    };
    siteConfig?: Record<string, unknown>;
    homeConfig?: Record<string, unknown>;
    onDeploySuccess: () => void;
    disabled?: boolean;
  };
}

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "photography", label: "Photography" },
  { id: "dev", label: "Development" },
];

export default function AdminTopBar({ activeTab, onTabChange, deployProps }: AdminTopBarProps) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <span className="admin-topbar-logo">Admin</span>
        <nav className="admin-topbar-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`admin-topbar-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="admin-topbar-right">
        <ThemeToggle />
        <DeployButton {...deployProps} />
      </div>
    </header>
  );
}
