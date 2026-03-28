"use client";

import { useEffect, useRef } from "react";
import PathwayCard from "@/components/PathwayCard";
import ThemeToggle from "@/components/ThemeToggle";
import "@/styles/home.css";

export default function HomePage() {
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardsRef.current) return;
      if (window.innerWidth < 480) return;

      const x = (e.clientX / window.innerWidth - 0.5) * 10;
      const y = (e.clientY / window.innerHeight - 0.5) * 10;
      cardsRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <main className="home" id="main">
      <ThemeToggle />

      <header className="home-hero">
        <h1 className="home-name">Akhil Saxena</h1>
        <p className="home-tagline">Engineer · Photographer</p>
      </header>

      <div className="home-cards" ref={cardsRef}>
        <PathwayCard
          href="/photography"
          title="Photography"
          subtitle="Capturing moments across the world"
          cta="View gallery →"
          className="card-photo"
        >
          <div className="photo-card-overlay">📷</div>
        </PathwayCard>

        <PathwayCard
          href="/dev"
          title="Development"
          subtitle="Building products at scale"
          cta="View resume →"
          className="card-dev"
        >
          <div className="terminal">
            <div className="terminal-bar">
              <span className="terminal-dot" />
              <span className="terminal-dot" />
              <span className="terminal-dot" />
            </div>
            <div className="terminal-line">
              <span className="terminal-prompt">$ </span>
              <span className="terminal-value">whoami</span>
            </div>
            <div className="terminal-line">Akhil Saxena</div>
            <div className="terminal-line">
              <span className="terminal-prompt">$ </span>
              <span className="terminal-value">cat stack.txt</span>
            </div>
            <div className="terminal-line">React · Next.js · TypeScript</div>
            <div className="terminal-line">
              <span className="terminal-prompt">$ </span>
              <span className="terminal-value">cat companies.txt</span>
            </div>
            <div className="terminal-line">Brevo · PharmEasy · MAQ Software</div>
          </div>
        </PathwayCard>
      </div>

      <div className="home-social">
        <a href="https://github.com/akhil-saxena" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
          GitHub
        </a>
        <a href="https://www.linkedin.com/in/akhil-saxena" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          LinkedIn
        </a>
        <a href="mailto:saxena.akhil42@gmail.com" aria-label="Email">
          Email
        </a>
      </div>

      <p className="home-footer">© {new Date().getFullYear()} Akhil Saxena</p>
    </main>
  );
}
