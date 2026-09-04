/**
 * The one glyph the design system does not have.
 *
 * ================================================================================================
 * WHY THIS FILE EXISTS, AND WHY IT IS ONE ICON AND NOT TWO
 * ================================================================================================
 *
 * The mobile bar shows the two nav destinations as icons rather than words. `development` gets
 * `Code`, which the design system exports. `photography` gets nothing: the package ships 33 icons
 * and NONE of them is a camera, an image, an aperture or a frame —
 * `AlertTriangle Check CheckCircle2 ChevronDown ChevronLeft ChevronRight ChevronUp Clock Code Copy
 * Heading2 Heading3 Info Italic Link Link2 List ListOrdered Minus Moon MoreHorizontal Plus Quote
 * Search Star Strikethrough Sun Trash Trash2 Underline X XCircle` — on a site that is half
 * photographs. FILED as D-28.
 *
 * ================================================================================================
 * IT IS DRAWN TO MATCH, NOT TO APPROXIMATE
 * ================================================================================================
 *
 * The design system's icons are `lucide-react` re-exports, and MEASURED off the rendered theme
 * toggle its glyphs carry `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"` and
 * `stroke-width="1.5"` — not lucide's own default of 2. This is lucide's `camera` path at those
 * exact attributes, so it sits beside `Code` at the same weight rather than looking like a
 * different family.
 *
 * `lucide-react` is NOT imported directly. It is the design system's dependency, not this
 * repository's, and reaching past the package for a component it re-exports is what
 * `gate:ds` exists to refuse. Same reasoning as `SocialIcons.astro`, which carries brand marks the
 * design system also does not have.
 *
 * DELETE THIS FILE the day the design system ships a camera. The nav is the only caller.
 */

export function CameraGlyph({ size = 16 }: { readonly size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      /* The label lives on the anchor as visually-hidden text, so the glyph is decorative. */
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}
