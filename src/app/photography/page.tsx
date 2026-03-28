"use client";

import { useState, useMemo } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import FilterTabs from "@/components/FilterTabs";
import MasonryGrid from "@/components/MasonryGrid";
import Lightbox from "@/components/Lightbox";
import portfolioData from "../../../data/portfolio_images.json";
import "@/styles/photography.css";

interface Photo {
  id: string;
  title: string;
  category: string;
  tags: string[];
  urls: { original: string; medium: string; thumb: string };
  exif?: {
    camera: string | null;
    lens: string | null;
    aperture: string | null;
    shutter: string | null;
    iso: number | null;
    focalLength: string | null;
  };
  order: number;
}

export default function PhotographyPage() {
  const photos = (portfolioData as Photo[]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let result = photos;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    } else if (category !== "All") {
      result = result.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    return result;
  }, [photos, category, search]);

  return (
    <>
      <Nav title="Photography" />
      <main className="photo-page" id="main">
        <header className="photo-header">
          <p className="photo-label">Portfolio</p>
          <h1 className="photo-title">Photography</h1>
        </header>

        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val);
          }}
        />

        <FilterTabs
          active={category}
          onSelect={(cat) => {
            setCategory(cat);
            setSearch("");
          }}
          searchActive={search.trim().length > 0}
        />

        <MasonryGrid photos={filtered} onPhotoClick={setLightboxIndex} />

        {lightboxIndex !== null && (
          <Lightbox
            photos={filtered}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </main>
      <Footer />
    </>
  );
}
