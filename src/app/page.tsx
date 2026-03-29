"use client";

import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import { getIcon } from "@/components/icons";
import portfolioData from "../../data/portfolio_images.json";
import homeConfig from "../../data/home_config.json";
import "@/styles/home.css";

const peekPhotos = homeConfig.peekIds
  .map((id) => portfolioData.find((p) => p.id === id))
  .filter(Boolean);

export default function HomePage() {
  return (
    <>
    <ThemeToggle />
    <main className="home-d" id="main">
      <header className="hd-hero">
        <h1 className="hd-name">{homeConfig.title}</h1>
        <p className="hd-tagline">{homeConfig.subtitle}</p>
        <p className="hd-intro">
          {homeConfig.intro}
        </p>
      </header>

      <div className="hd-gallery">
        {peekPhotos.map((photo, index) => {
          const position = (homeConfig.peekPositions as Record<string, string>)[photo!.id] || "center";
          return (
            <div key={photo!.id} className="hd-gallery-item">
              <Image
                src={(photo!.urls as Record<string, string>).small || photo!.urls.medium}
                width={400}
                height={267}
                alt={photo!.title}
                loading={index === 0 ? "eager" : "lazy"}
                priority={index === 0}
                style={{ width: "100%", height: "160px", objectFit: "cover", objectPosition: position, backgroundImage: `url(${photo!.urls.thumb})` }}
              />
            </div>
          );
        })}
      </div>

      <div className="hd-ctas">
        {homeConfig.ctas.map((cta, i) => (
          <Link key={i} href={cta.link} className={`hd-cta hd-cta-${cta.style}`}>
            {cta.text}
          </Link>
        ))}
      </div>

      <footer className="hd-bottom">
        <div className="hd-social">
          {homeConfig.socialLinks.map((link, i) => (
            <a key={i} href={link.url} target={link.url.startsWith("mailto:") ? undefined : "_blank"} rel={link.url.startsWith("mailto:") ? undefined : "noopener noreferrer"} aria-label={link.label}>
              {getIcon(link.icon, { size: 18 })}
            </a>
          ))}
        </div>
        <p className="hd-footer">© {new Date().getFullYear()} Akhil Saxena</p>
      </footer>
    </main>
    </>
  );
}
