"use client";

import { useEffect, useRef } from "react";

/**
 * Makes a single <h1> physically move from its page position
 * into the nav bar as the user scrolls. One element, no clones.
 *
 * Uses position:fixed + GPU-accelerated transform for smooth 60fps.
 * A spacer div preserves layout when the title lifts out of flow.
 */
export function useScrollTitle() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const title = titleRef.current!;
    const spacer = spacerRef.current!;
    if (!title || !spacer) return;

    const nav = document.querySelector(".page-nav") as HTMLElement;
    if (!nav) return;

    let origDocTop = 0;
    let origLeft = 0;
    let origFontSize = 0;
    let origHeight = 0;
    let navH = 0;
    let targetLeft = 0;
    let targetCenterY = 0;
    let ready = false;

    const DOCKED_SIZE = 18;
    const TRAVEL = 50;

    function measure() {
      title.style.cssText = "";
      spacer.style.display = "none";

      const r = title.getBoundingClientRect();
      origDocTop = r.top + window.scrollY;
      origLeft = r.left;
      origFontSize = parseFloat(getComputedStyle(title).fontSize);
      origHeight = r.height;
      spacer.style.height = origHeight + "px";

      navH = nav.offsetHeight;

      const back = nav.querySelector(".page-nav-back");
      if (back) {
        const br = back.getBoundingClientRect();
        targetLeft = br.right + 12;
        targetCenterY = br.top + br.height / 2;
      } else {
        targetLeft = 72;
        targetCenterY = navH / 2;
      }

      ready = true;
    }

    function ease(t: number) {
      return 1 - (1 - t) * (1 - t) * (1 - t);
    }

    function tick() {
      if (!ready) return;

      const scrollY = window.scrollY;
      const naturalY = origDocTop - scrollY;
      const past = navH - naturalY;

      if (past <= 0) {
        title.style.cssText = "";
        spacer.style.display = "none";
        nav.classList.remove("page-nav-filled");
        return;
      }

      const raw = Math.min(1, past / TRAVEL);
      const p = ease(raw);

      spacer.style.display = "block";

      const scale = 1 + (DOCKED_SIZE / origFontSize - 1) * p;

      // Docked Y: align visual center of scaled title with arrow center
      // At p=1, visual height = DOCKED_SIZE * 1.2
      const dockedVisualH = DOCKED_SIZE * 1.2;
      const dockedY = targetCenterY - dockedVisualH / 2;

      const x = origLeft + (targetLeft - origLeft) * p;
      const y = navH + (dockedY - navH) * p;

      title.style.position = "fixed";
      title.style.top = "0";
      title.style.left = "0";
      title.style.margin = "0";
      title.style.padding = "0";
      title.style.zIndex = "52";
      title.style.lineHeight = "1.2";
      title.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      title.style.transformOrigin = "0 0";
      title.style.willChange = "transform";

      nav.classList.toggle("page-nav-filled", raw >= 0.8);
    }

    requestAnimationFrame(() => {
      measure();
      tick();
    });

    window.addEventListener("scroll", tick, { passive: true });

    function onResize() {
      ready = false;
      requestAnimationFrame(() => {
        measure();
        tick();
      });
    }
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return { titleRef, spacerRef };
}
