/**
 * The one island this site has. Plan 05-12, Task 1. (PUB-06, PUB-07, PUB-14; §5.1, §9.2, §9.3.)
 *
 * ================================================================================================
 * WHAT THIS COMPONENT IS, AND WHAT IT DELIBERATELY IS NOT
 * ================================================================================================
 *
 * It is a delegated click listener, a history entry and a `<Lightbox>`. It renders NOTHING of its
 * own until opened: `Lightbox` returns `null` while `open` is false, and the item array is not even
 * built until the first open (see `lightboxItems`). The grid it listens to stays STATIC ASTRO HTML
 * — no `client:*` directive reaches `PhotoGrid` or `PhotoTile`, so with JavaScript off, or in the
 * window before this island idles, every tile is still a working link to a prerendered page. That
 * one decision satisfies PUB-04's crawlability, PUB-06's lightbox, PUB-09's per-photo page and the
 * Back button (§9.2).
 *
 * It is NOT a re-implementation of anything the design system already does. §9.1 verified DS-07 /
 * G-14 against the shipped chunk — backdrop-click close, `srcset`, pointer gestures, the `aria-live`
 * slide announcement, `role="dialog"` + `aria-modal` + `useFocusTrap`, ArrowLeft/Right + Escape on a
 * document listener, wrap-around navigation — and G-14 is CLOSED. None of it is repeated here.
 *
 * ================================================================================================
 * 🔴 THE SHIPPED SWIPE NAVIGATES. IT DOES NOT DISMISS. MEASURED IN `chunk-4I5ZCPSS.js`.
 * ================================================================================================
 *
 * PUB-06 asks for "keyboard, backdrop and swipe dismissal". The component's pointer handlers read:
 *
 *     var BACKDROP_TAP_SLOP_PX = 10;
 *     var SWIPE_MIN_DISTANCE_PX = 44;
 *     var SWIPE_HORIZONTAL_DOMINANCE = 1.5;
 *     ...
 *     if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX) return;
 *     if (Math.abs(dx) < Math.abs(dy) * SWIPE_HORIZONTAL_DOMINANCE) return;
 *     if (dx < 0) goNext(); else goPrev();
 *
 * A horizontal swipe NAVIGATES, with wrap-around. A vertical drag does nothing: `dx` is small, so
 * the navigation branch returns, and `backdropTapRef` is false because the gesture travelled more
 * than the 10px tap slop, so the backdrop-click branch returns too. There is no swipe-to-dismiss in
 * the component, and the always-dark backdrop declares `touch-action: pan-y`, which deliberately
 * hands the vertical axis to the browser — so a consumer cannot add one without fighting a rule the
 * design system wrote on purpose.
 *
 * NO LOCAL GESTURE LAYER IS ADDED HERE, and that is a decision rather than an omission. §9.1 says
 * "G-14 is closed. Do not re-implement any part of it", and the Core Value says a gap the site
 * exposes is a FINDING rather than a workaround — the same disposition OQ-4's 40px filter pill and
 * `Eyebrow`'s inline weight already ship under. What the touch reader HAS today is measured and
 * recorded in the summary: a backdrop tap closes, the close button closes, Escape closes from a
 * keyboard, and the Back button closes because of the history entry below. The upstream ask is
 * written out in full in the summary; it is a handful of lines in the component, not a refactor.
 *
 * ================================================================================================
 * WHY THE ISLAND BUILDS THE CAPTION AND THE PAGE DOES NOT
 * ================================================================================================
 *
 * `LightboxItem.caption` is a `ReactNode`, and a hydrated island's props are SERIALISED INTO THE
 * PAGE as JSON — an Astro template expression handed to a `ReactNode` prop is not JSON and fails
 * the build (`PublicNav.tsx` measured that boundary). So the page passes serialisable photo data —
 * `src`, `alt`, `srcSet`, `place` and the six raw EXIF fields — and the caption is composed here,
 * in React, from `exifRows`.
 *
 * `srcSet` arrives as a FINISHED STRING. It is computed at build time in `src/lib/photo-lightbox.ts`
 * — a SEPARATE module, and the split is the result of a measurement rather than a preference: with
 * the builder exported from this file, the browser chunk carried `srcsetFor`, `VARIANTS`,
 * `GUTTER_RUNGS` and `sizesFor`, because an island's client entry is the MODULE and not the
 * component. That file's header records the before-and-after.
 *
 * This file must never import `src/lib/photo-pipeline.ts`, directly or transitively: it reaches
 * `node:crypto`, and this is the only module in the public site that becomes a browser chunk (§5.3
 * assertion 5, threat T-05-12-04). Task 1's gate checks the source and 05-14 re-checks the built
 * chunks, because a source-level scan says nothing about what the bundler emitted.
 *
 * `sizes` is DELIBERATELY ABSENT from every item, for the reason recorded in that same file.
 *
 * ================================================================================================
 * COLOUR: THE LIGHTBOX IS ALWAYS DARK, AND THE CAPTION HAS TO BE TOLD
 * ================================================================================================
 *
 * §9.1: the component's docstring records an "always-dark invariant (NO `:root.dark` overrides)".
 * That is correct — the image is the surface — and it must not be "fixed" to follow the theme.
 * `.ds-atom-lightbox-caption` sets `color: #ffffff` on the caption container, so anything inside it
 * that does NOT claim a colour inherits white in both themes.
 *
 * MEASURED, and the two design-system components behave differently:
 *
 *   `Text`   omits any inline colour when `tone` is absent; the variant default lives in
 *            `:where(.ds-atom-text[data-variant="body"])` at specificity (0,0,0) precisely so a
 *            consumer class can win (`primitives.css`'s own comment: "passing `tone` means the
 *            component owns the colour; omitting it hands the colour to the cascade"). So no `tone`
 *            here, and `photos.css` hands it `color: inherit` at (0,2,0). That is the documented
 *            path, not a reach past the component.
 *
 *   `Eyebrow` INLINES `color: var(--ink-3)` whenever neither `color` nor `tone` is given, and a
 *            `tone` resolves to a theme ink either way. Both are wrong on an always-dark surface:
 *            in light mode `--ink-3` is a dark grey on a 92%-black backdrop. An inline style cannot
 *            be reached by a consumer stylesheet without `!important`, so the component's own
 *            `color` prop — documented as the legacy override "for one-offs" — is the ONLY path it
 *            offers. `color="inherit"` is that path. The upstream ask (give `Eyebrow` the same
 *            `:where()` treatment `Text` got in finding E5) is in the summary.
 *
 * `Text`'s `mono` prop was considered for the label and rejected on measurement: `baseStyle` inlines
 * `fontFamily: "var(--font)"`, and an inline declaration beats `.ds-atom-text[data-mono="true"]
 * { font-family: var(--mono) }` in the cascade, so `mono` cannot take effect. Also filed upstream.
 *
 * ================================================================================================
 * MOTION
 * ================================================================================================
 *
 * This component adds NO transition, NO animation and NO transform of its own, so there is nothing
 * for `prefers-reduced-motion` to govern here. The one animation on the surface is the design
 * system's own `animation: lightboxFade 0.2s ease-out` on `.ds-atom-lightbox-backdrop`; §12.2 is
 * the shell's business and a consumer re-declaring it would be a second definition.
 *
 * `useReducedMotion` from `@akhil-saxena/design-system/hooks` was NOT imported, and the reason is
 * measured rather than assumed: the hooks entry is a BARREL of its own (11 files / 19,372 B traced
 * from `dist/hooks/index.js`), which is why `assert-ds-import-contract.mjs` excludes `/hooks` from
 * its permitted set by name. There is nothing to gate, so nothing was imported.
 *
 * ================================================================================================
 * REPORTING
 * ================================================================================================
 *
 * There is none. This file logs nothing — not `console.warn` on a missing grid, not anything. A
 * missing grid degrades to the no-JS path, which is a working page; a log would be swallowed in
 * production and is noise in dev.
 */

import { Eyebrow } from '@akhil-saxena/design-system/components/Eyebrow';
import type { LightboxItem } from '@akhil-saxena/design-system/components/Lightbox';
import { Lightbox } from '@akhil-saxena/design-system/components/Lightbox';
import { Text } from '@akhil-saxena/design-system/components/Text';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { exifRows } from '../../lib/exif-display';
import type { PhotoLightboxRecord } from '../../lib/photo-lightbox';

export interface PhotoLightboxProps {
  /** Every photograph on the page, in the order the tiles are rendered. */
  readonly items: readonly PhotoLightboxRecord[];
  /** A CSS selector for the grid whose clicks are delegated — `#ph-grid` on both gallery routes. */
  readonly gridSelector: string;
}

/**
 * The attribute the tile anchor carries, written once. `PhotoTile.astro` emits it and
 * `test/public/lightbox.node.test.ts` asserts the emitted values are a dense `0..n-1` sequence
 * whose length equals the rendered tile count.
 */
const INDEX_ATTRIBUTE = 'data-lb-index';

/** Closed while there is nothing to show. Frozen so a stray mutation cannot make it stateful. */
const NO_ITEMS: readonly LightboxItem[] = Object.freeze([]);

/**
 * The caption for one photograph, or `undefined`.
 *
 * `undefined` and not an empty element: `Lightbox` renders `current.caption ? <div…> : null`, so an
 * empty node would still paint the caption box under the image. PUB-07's rule is that an absent
 * value produces NOTHING — no heading, no rule, no empty panel — and a caption container holding
 * nothing is that panel wearing a different hat.
 *
 * THE OMIT TEST IS "IS THERE ANYTHING TO SAY", which is a deliberate narrowing of the plan's
 * wording and is recorded rather than done quietly. The plan says an item whose `exifRows` is empty
 * gets no caption; that would also discard a reviewed `place` on a record with no EXIF. MEASURED on
 * the committed manifest: exactly one record yields zero rows (`product-peppers`) and it carries no
 * `place`, so the two readings are indistinguishable today — but dropping reviewed content because
 * a camera did not write an aperture is not what PUB-07 asks for.
 *
 * `exifRows` is the ONLY source of the rows. The omit-null rule has one implementation and this is
 * not a second one: no field is read here, and no value is formatted here.
 *
 * EXPORTED FOR A TEST, and the reason is the same one `PhotoEmpty.tsx` records: the branch that
 * matters is the one that renders NOTHING, and it cannot be reached through the component. While
 * `open` is false `Lightbox` returns `null`, so a server render of `<PhotoLightbox>` produces an
 * empty document whatever the items are — an assertion over it would pass on any implementation,
 * including one that built a caption for `product-peppers`. `test/public/lightbox.node.test.ts`
 * calls this directly and renders the result with `renderToStaticMarkup`, which is the same server
 * path the page takes.
 */
export function captionFor(record: PhotoLightboxRecord): LightboxItem['caption'] {
  const rows = exifRows(record.exif);
  const place = record.place;
  if (rows.length === 0 && !place) {
    return undefined;
  }

  return (
    <span className="ph-lb-caption">
      {place ? (
        <span className="ph-lb-place">
          {/* No `tone`: the always-dark caption owns the colour and photos.css hands it over. */}
          <Text as="span" size="sm">
            {place}
          </Text>
        </span>
      ) : null}
      {rows.length > 0 ? (
        <span className="ph-lb-exif">
          {rows.map((row) => (
            <span className="ph-lb-row" key={row.label}>
              {/* `color="inherit"` is Eyebrow's ONLY path to the always-dark surface — see header. */}
              <Eyebrow size="md" color="inherit">
                {row.label}
              </Eyebrow>
              <Text as="span" size="sm">
                {row.value}
              </Text>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

export function PhotoLightbox({ items, gridSelector }: PhotoLightboxProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  /**
   * Whether THIS component pushed the history entry that is currently on top. It is a ref and not
   * state because it is read inside a listener and must never re-run an effect: a `popstate` that
   * re-registered the listener would drop the entry it was about to consume.
   */
  const pushedRef = useRef(false);

  /**
   * The single close path. Every dismissal the design system offers — the close button, Escape via
   * `useDismiss`, the backdrop tap — arrives here through `onClose`, so the history entry is
   * unwound exactly once however the reader dismissed it.
   *
   * `pushedRef` is cleared BEFORE `history.back()`, so the `popstate` this triggers takes the
   * already-closed branch instead of trying to go back a second time.
   */
  const close = useCallback(() => {
    setOpen(false);
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
  }, []);

  /**
   * §9.2: "the island must push a history entry on open and close on `popstate`, so the Back button
   * dismisses the lightbox rather than leaving the page. Without it the Back-button guarantee holds
   * for the no-JS path and breaks for the JS path" — which is worse than not having it, because it
   * works until it does not.
   */
  useEffect(() => {
    const onPopState = () => {
      pushedRef.current = false;
      setOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  /**
   * ONE delegated listener on the grid, not forty on the tiles. The grid is static Astro HTML that
   * this component never renders, so there is no other way to reach it — and delegation is why a
   * forty-tile gallery costs one listener.
   */
  useEffect(() => {
    const grid = document.querySelector(gridSelector);
    if (!grid) return;

    const onClick = (event: Event) => {
      const mouse = event as MouseEvent;

      /*
       * THE MODIFIED-KEY GUARD AND THE ORDER OF `preventDefault`, WHICH IS THE WHOLE DESIGN.
       *
       * Every bail below happens BEFORE `preventDefault`, so anything this listener declines to
       * handle falls through to the anchor: cmd-click and ctrl-click still open the prerendered
       * page in a new tab, shift-click still opens a window, a middle click still works, and a
       * malformed or out-of-range `data-lb-index` navigates instead of opening the wrong
       * photograph (T-05-12-01).
       *
       * `preventDefault()` is the LAST statement, after the state updates have been applied
       * without throwing. If the open path throws or bails, the link still navigates. That
       * ordering is the difference between a progressive enhancement and a broken link.
       */
      if (mouse.defaultPrevented) return;
      if (mouse.button !== 0) return;
      if (mouse.metaKey || mouse.ctrlKey || mouse.shiftKey || mouse.altKey) return;
      if (items.length === 0) return;

      const target = mouse.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest(`a[${INDEX_ATTRIBUTE}]`);
      if (!anchor) return;

      // Parsed and bound-checked rather than trusted: the attribute is read from the DOM, which
      // anything on the page can have rewritten. `Number.parseInt` would accept "3abc" and "0x2";
      // the digits-only test is what makes the parse total.
      const raw = anchor.getAttribute(INDEX_ATTRIBUTE);
      if (raw === null || !/^\d+$/.test(raw)) return;
      const parsed = Number.parseInt(raw, 10);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed >= items.length) return;

      try {
        setIndex(parsed);
        setOpen(true);
        // Same URL, so nothing navigates and nothing reloads; the entry exists only so that Back
        // has something of ours to pop. Best-effort: a refused pushState must not cost the open.
        try {
          window.history.pushState({ phLightbox: true }, '', window.location.href);
          pushedRef.current = true;
        } catch {
          pushedRef.current = false;
        }
      } catch {
        return;
      }

      mouse.preventDefault();
    };

    grid.addEventListener('click', onClick);
    return () => grid.removeEventListener('click', onClick);
  }, [gridSelector, items]);

  /**
   * Built on the first open and not before — "renders nothing of its own until opened" is a claim
   * about work as well as about markup. While closed the design system is handed a frozen empty
   * array and `open: false`, and it returns `null`.
   */
  const lightboxItems = useMemo<LightboxItem[]>(() => {
    if (!open) return NO_ITEMS as LightboxItem[];
    return items.map((record) => ({
      src: record.src,
      alt: record.alt,
      srcSet: record.srcSet,
      caption: captionFor(record),
    }));
  }, [open, items]);

  /*
   * CONTROLLED, and it is not a preference. Uncontrolled, `activeIndex` only seeds the component's
   * own index through an effect keyed on `[activeIndex, isControlled]` — so opening tile 5,
   * navigating to 7, closing and opening tile 5 AGAIN passes an unchanged `activeIndex`, the effect
   * does not fire, and the reader is shown photograph 7. Owning the index makes that unrepresentable.
   */
  return (
    <Lightbox
      open={open}
      onClose={close}
      items={lightboxItems}
      activeIndex={index}
      onIndexChange={setIndex}
    />
  );
}
