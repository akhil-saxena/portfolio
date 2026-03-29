"use client";

import { useState } from "react";
import { IconUpload } from "../icons";

interface DeployButtonProps {
  hasUnsaved: boolean;
  photos: unknown[];
  resume: {
    experience: unknown[];
    projects: unknown[];
    skills: unknown[];
    education: unknown[];
  };
  onDeploySuccess: () => void;
  disabled?: boolean;
}

type DeployStatus = "idle" | "confirming" | "deploying" | "success" | "error";

export default function DeployButton({ hasUnsaved, photos, resume, onDeploySuccess, disabled }: DeployButtonProps) {
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    setStatus("deploying");
    setError(null);

    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: {
            "data/portfolio_images.json": JSON.stringify(photos, null, 2),
            "data/resume.json": JSON.stringify(resume, null, 2),
          },
          baseSha: "latest", // TODO: track actual baseSha from /api/data
          message: "chore: update portfolio data via admin",
        }),
      });

      if (res.status === 409) {
        setError("Data was updated externally — please refresh and try again.");
        setStatus("error");
        return;
      }

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "Deploy failed");
      }

      setStatus("success");
      onDeploySuccess();
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deploy failed");
      setStatus("error");
    }
  };

  if (status === "confirming") {
    return (
      <div className="admin-deploy-confirm">
        <p className="admin-deploy-confirm-text">Deploy changes to production?</p>
        <div className="admin-deploy-confirm-actions">
          <button className="admin-btn admin-btn-secondary" onClick={() => setStatus("idle")}>Cancel</button>
          <button className="admin-btn admin-btn-primary" onClick={handleDeploy}>Deploy</button>
        </div>
      </div>
    );
  }

  if (status === "deploying") {
    return (
      <button className="admin-action-btn admin-action-primary" disabled>
        <span className="admin-spinner" />
        Deploying...
      </button>
    );
  }

  if (status === "success") {
    return (
      <button className="admin-action-btn admin-action-success" disabled>
        ✓ Live
      </button>
    );
  }

  if (status === "error") {
    return (
      <div className="admin-deploy-error">
        <p className="admin-deploy-error-text">{error}</p>
        <button className="admin-btn admin-btn-secondary" onClick={() => setStatus("idle")}>Dismiss</button>
      </div>
    );
  }

  return (
    <button
      className={`admin-action-btn admin-action-primary ${hasUnsaved ? "has-changes" : ""}`}
      onClick={() => hasUnsaved ? setStatus("confirming") : null}
      disabled={disabled || !hasUnsaved}
    >
      <IconUpload size={14} />
      Save & Deploy
    </button>
  );
}
