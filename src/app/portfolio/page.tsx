"use client";

import { useState, useMemo } from "react";
import PageNav from "@/components/PageNav";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import FilterTabs from "@/components/FilterTabs";
import MasonryGrid from "@/components/MasonryGrid";
import Lightbox from "@/components/Lightbox";
import { useScrollTitle } from "@/hooks/useScrollTitle";
import portfolioData from "../../../data/portfolio_images.json";
import siteConfig from "../../../data/site_config.json";
import "@/styles/photography.css";
import { Photo } from "@/types";

export default function PhotographyPage() {
  const photos = (portfolioData as Photo[]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const { titleRef, spacerRef } = useScrollTitle();

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

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: photos.length };
    photos.forEach((p) => {
      const cat = p.category.charAt(0).toUpperCase() + p.category.slice(1);
      c[cat] = (c[cat] || 0) + 1;
    });
    return c;
  }, [photos]);

  return (
    <>
      <PageNav backHref="/" />
      <main className="photo-page" id="main">
        <div ref={spacerRef} />
        <h1 ref={titleRef} className="page-scroll-title">Photography</h1>

        <div className="photo-toolbar">
          <FilterTabs
            active={category}
            onSelect={(cat) => {
              setCategory(cat);
              setSearch("");
            }}
            searchActive={search.trim().length > 0}
            counts={counts}
          />
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
            }}
          />
        </div>

        <MasonryGrid photos={filtered} columns={(siteConfig.categoryColumns as Record<string, number>)?.[category] || 4} onPhotoClick={setLightboxIndex} />

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
