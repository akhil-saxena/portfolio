"use client";

import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import { IconGitHub, IconLinkedIn, IconMail } from "@/components/icons";
import portfolioData from "../../data/portfolio_images.json";
import "@/styles/home.css";

const peekIds = [
  "abstract-intothemist",
  "architecture-singapore",
  "nature-sunrisepoint",
  "street-tunnelvision",
  "wildlife-kingfisher",
  "architecture-eiffeljpg",
];

const peekPhotos = peekIds
  .map((id) => portfolioData.find((p) => p.id === id))
  .filter(Boolean);

export default function HomePage() {
  return (
    <main className="home-d" id="main">
      <ThemeToggle />

      <header className="hd-hero">
        <h1 className="hd-name">Akhil Saxena</h1>
        <p className="hd-tagline">Interfaces & Imagery</p>
        <p className="hd-intro">
          Building for the web. Photographing everything else.
        </p>
      </header>

      <div className="hd-gallery">
        {peekPhotos.map((photo) => (
          <div key={photo!.id} className="hd-gallery-item">
            <Image
              src={photo!.urls.small}
              width={400}
              height={267}
              sizes="(max-width: 600px) 33vw, 270px"
              alt={photo!.title}
              loading="lazy"
              style={{ width: "100%", height: "160px", objectFit: "cover", backgroundImage: `url(${photo!.urls.thumb})` }}
            />
          </div>
        ))}
      </div>

      <div className="hd-ctas">
        <Link href="/photography" className="hd-cta hd-cta-primary">
          View Photography →
        </Link>
        <Link href="/dev" className="hd-cta hd-cta-secondary">
          View Resume
        </Link>
      </div>

      <footer className="hd-bottom">
        <div className="hd-social">
          <a href="https://github.com/akhil-saxena" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
            <IconGitHub size={18} />
          </a>
          <a href="https://www.linkedin.com/in/akhil-saxena" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <IconLinkedIn size={18} />
          </a>
          <a href="mailto:saxena.akhil42@gmail.com" aria-label="Email">
            <IconMail size={18} />
          </a>
        </div>
        <p className="hd-footer">© {new Date().getFullYear()} Akhil Saxena</p>
      </footer>
    </main>
  );
}
