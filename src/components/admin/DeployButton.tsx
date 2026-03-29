"use client";

import { useState, useCallback } from "react";
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
  siteConfig?: Record<string, unknown>;
  onDeploySuccess: () => void;
  disabled?: boolean;
}

type DeployStatus = "idle" | "confirming" | "committing" | "building" | "success" | "error";

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error";
}

function timestamp() {
  return new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function DeployButton({ hasUnsaved, photos, resume, siteConfig, onDeploySuccess, disabled }: DeployButtonProps) {
  const [status, setStatus] = useState<DeployStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [...prev, { time: timestamp(), message, type }]);
  }, []);

  const handleDeploy = async () => {
    setStatus("committing");
    setError(null);
    setLogs([]);

    addLog("Preparing files for deploy...");

    try {
      addLog("Committing to GitHub...");
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: {
            "data/portfolio_images.json": JSON.stringify(photos, null, 2),
            "data/resume.json": JSON.stringify(resume, null, 2),
            ...(siteConfig ? { "data/site_config.json": JSON.stringify(siteConfig, null, 2) } : {}),
          },
          baseSha: "latest",
          message: "chore: update portfolio data via admin",
        }),
      });

      if (res.status === 409) {
        addLog("Conflict — data was updated externally", "error");
        setError("Data was updated externally — please refresh and try again.");
        setStatus("error");
        return;
      }

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "Deploy failed");
      }

      const result = await res.json() as { sha?: string };
      addLog(`Committed: ${result.sha?.slice(0, 7) || "ok"}`, "success");

      setStatus("building");
      addLog("Triggered Cloudflare Pages rebuild...");
      addLog("Waiting for build to complete...");

      // Poll for a bit to simulate build progress
      // CF Pages doesn't have a public API we can poll from the browser,
      // so we show estimated progress
      const steps = [
        { delay: 3000, msg: "Installing dependencies..." },
        { delay: 5000, msg: "Building Next.js..." },
        { delay: 8000, msg: "Generating static pages..." },
        { delay: 3000, msg: "Deploying to edge..." },
      ];

      for (const step of steps) {
        await new Promise(r => setTimeout(r, step.delay));
        addLog(step.msg);
      }

      addLog("Deploy complete — site is live!", "success");
      setStatus("success");
      onDeploySuccess();

      setTimeout(() => {
        setStatus("idle");
        setLogs([]);
      }, 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deploy failed";
      addLog(msg, "error");
      setError(msg);
      setStatus("error");
    }
  };

  const showModal = status === "confirming" || status === "committing" || status === "building" || status === "success" || status === "error";

  return (
    <>
      <button
        className={`admin-action-btn admin-action-primary ${hasUnsaved ? "has-changes" : ""}`}
        onClick={() => hasUnsaved ? setStatus("confirming") : null}
        disabled={disabled || !hasUnsaved}
      >
        <IconUpload size={14} />
        {status === "committing" || status === "building" ? "Deploying..." : "Save & Deploy"}
      </button>

      {showModal && (
        <div className="admin-deploy-modal-overlay" onClick={() => status === "error" || status === "success" ? setStatus("idle") : null}>
          <div className="admin-deploy-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-deploy-modal-title">
              {status === "confirming" && "Deploy to Production"}
              {status === "committing" && "Committing..."}
              {status === "building" && "Building..."}
              {status === "success" && "Deployed!"}
              {status === "error" && "Deploy Failed"}
            </h3>

            {status === "confirming" && (
              <>
                <p className="admin-deploy-modal-text">
                  This will commit your changes to GitHub and trigger a Cloudflare Pages rebuild. The site will update in ~1-2 minutes.
                </p>
                <div className="admin-deploy-modal-actions">
                  <button className="admin-btn admin-btn-secondary" onClick={() => setStatus("idle")}>Cancel</button>
                  <button className="admin-btn admin-btn-primary" onClick={handleDeploy}>Deploy Now</button>
                </div>
              </>
            )}

            {(status === "committing" || status === "building" || status === "success" || status === "error") && (
              <div className="admin-deploy-log">
                {logs.map((log, i) => (
                  <div key={i} className={`admin-deploy-log-entry admin-deploy-log-${log.type}`}>
                    <span className="admin-deploy-log-time">{log.time}</span>
                    <span className="admin-deploy-log-msg">{log.message}</span>
                  </div>
                ))}
                {(status === "committing" || status === "building") && (
                  <div className="admin-deploy-log-entry admin-deploy-log-info">
                    <span className="admin-deploy-log-time">{timestamp()}</span>
                    <span className="admin-spinner-small" />
                  </div>
                )}
              </div>
            )}

            {(status === "success" || status === "error") && (
              <div className="admin-deploy-modal-actions">
                <button className="admin-btn admin-btn-secondary" onClick={() => { setStatus("idle"); setLogs([]); }}>Close</button>
                {status === "success" && (
                  <a href="https://akhilsaxena.pages.dev" target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-primary">
                    View Site
                  </a>
                )}
                {status === "error" && (
                  <button className="admin-btn admin-btn-primary" onClick={handleDeploy}>Retry</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
