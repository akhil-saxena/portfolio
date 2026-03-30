"use client";

import { useEffect } from "react";

/**
 * Each section h2 physically moves from its page position into the nav bar
 * as the user scrolls — identical to useScrollTitle but for multiple sections.
 *
 * When transitioning between sections, the outgoing title fades out with a
 * smooth slide-left + scale-down, while the incoming title animates into place.
 *
 * Uses live spacer positions (read-then-write pattern) to avoid layout drift
 * from accumulated margin/padding differences.
 */
export function useSectionScrollTitle(sectionIds: string[]) {
  useEffect(() => {
    const nav = document.querySelector(".page-nav") as HTMLElement;
    if (!nav) return;

    const DOCKED_SIZE = 18;
    const TRAVEL = 50;

    interface SectionData {
      h2: HTMLHeadingElement;
      spacer: HTMLDivElement;
      origLeft: number;
      origFontSize: number;
      origPaddingTop: number;
    }

    let navH = 0;
    let targetLeft = 0;
    let targetCenterY = 0;
    let ready = false;

    const sections: SectionData[] = [];

    for (const id of sectionIds) {
      const section = document.getElementById(id);
      if (!section) continue;
      const h2 = section.querySelector("h2") as HTMLHeadingElement;
      if (!h2) continue;

      const spacer = document.createElement("div");
      spacer.style.display = "none";
      h2.parentNode!.insertBefore(spacer, h2);

      h2.classList.add("visible");

      sections.push({
        h2,
        spacer,
        origLeft: 0,
        origFontSize: 0,
        origPaddingTop: 0,
      });
    }

    function measure() {
      for (const s of sections) {
        s.h2.style.cssText = "";
        s.spacer.style.display = "none";
      }

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

      for (const s of sections) {
        const r = s.h2.getBoundingClientRect();
        const cs = getComputedStyle(s.h2);
        s.origLeft = r.left;
        s.origFontSize = parseFloat(cs.fontSize);
        s.origPaddingTop = parseFloat(cs.paddingTop);
        // Spacer mirrors the h2's full box contribution including margin
        s.spacer.style.height = r.height + "px";
        s.spacer.style.marginBottom = cs.marginBottom;
      }

      ready = true;
    }

    function ease(t: number) {
      return 1 - (1 - t) * (1 - t) * (1 - t);
    }

    function applyFixed(h2: HTMLHeadingElement, z: number) {
      h2.style.position = "fixed";
      h2.style.top = "0";
      h2.style.left = "0";
      h2.style.margin = "0";
      h2.style.padding = "0";
      h2.style.border = "none";
      h2.style.background = "transparent";
      h2.style.zIndex = String(z);
      h2.style.lineHeight = "1.2";
      h2.style.transformOrigin = "0 0";
      h2.style.willChange = "transform";
    }

    function tick() {
      if (!ready) return;

      // ── READ phase: gather live positions ──
      // Use spacer position when h2 is fixed (spacer stays in flow).
      // This eliminates drift from margin/padding mismatches.
      const tops: number[] = sections.map((s) => {
        const el =
          s.spacer.style.display === "block" ? s.spacer : s.h2;
        return el.getBoundingClientRect().top;
      });

      // ── COMPUTE phase ──
      const raws = tops.map((top) =>
        Math.max(0, Math.min(1, (navH - top) / TRAVEL))
      );

      // Incoming = last section whose h2 has crossed into the nav zone
      let incomingIdx = -1;
      for (let i = raws.length - 1; i >= 0; i--) {
        if (raws[i] > 0) {
          incomingIdx = i;
          break;
        }
      }

      // Outgoing = the one just before incoming, if fully docked
      const outgoingIdx =
        incomingIdx > 0 && raws[incomingIdx - 1] >= 1
          ? incomingIdx - 1
          : -1;

      const dockedVisualH = DOCKED_SIZE * 1.2;
      const dockedY = targetCenterY - dockedVisualH / 2;

      // ── WRITE phase: apply styles ──
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        const raw = raws[i];

        if (raw <= 0) {
          s.h2.style.cssText = "";
          s.spacer.style.display = "none";
          continue;
        }

        s.spacer.style.display = "block";

        if (i === incomingIdx) {
          // ── INCOMING: move from page position into nav ──
          const p = ease(raw);
          const scale = 1 + (DOCKED_SIZE / s.origFontSize - 1) * p;

          // Start Y accounts for padding so text doesn't jump
          const startY = tops[i] + s.origPaddingTop;
          const x = s.origLeft + (targetLeft - s.origLeft) * p;
          const y = startY + (dockedY - startY) * p;

          applyFixed(s.h2, 52);
          s.h2.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
          s.h2.style.opacity = "1";
        } else if (i === outgoingIdx) {
          // ── OUTGOING: fade + slide left + shrink ──
          const inP = ease(raws[incomingIdx]);

          // Fade out faster (fully gone by 70% of incoming travel)
          const opacity = Math.max(0, 1 - inP * 1.4);
          // Slide left
          const slideX = -50 * inP;
          // Drift up slightly
          const slideY = -6 * inP;
          // Shrink 10%
          const dockedScale = DOCKED_SIZE / s.origFontSize;
          const scale = dockedScale * (1 - 0.1 * inP);

          applyFixed(s.h2, 51);
          s.h2.style.transform = `translate(${targetLeft + slideX}px, ${dockedY + slideY}px) scale(${scale})`;
          s.h2.style.opacity = String(opacity);
        } else {
          // Past sections: invisible, spacer holds layout
          s.h2.style.position = "fixed";
          s.h2.style.opacity = "0";
          s.h2.style.pointerEvents = "none";
        }
      }

      const activeRaw = incomingIdx >= 0 ? raws[incomingIdx] : 0;
      nav.classList.toggle("page-nav-filled", activeRaw >= 0.8);
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
      for (const s of sections) {
        s.h2.style.cssText = "";
        s.spacer.remove();
      }
    };
  }, [sectionIds]);
}
