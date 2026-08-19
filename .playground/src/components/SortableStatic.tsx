// SortableStatic — the design system's `Sortable`, rendered WITHOUT hydration.
//
// ═══ WHY THIS FILE EXISTS AT ALL ════════════════════════════════════════════
// UI-SPEC's component mapping puts `Sortable` on BOTH /admin/home (peek order)
// and /admin/resume (bullet order), and plan 14 spends the last two of exactly
// three sanctioned `client:*` directives on the focal-point control and the
// bullet editor. So both lists have to render from the real component with no
// hydration budget left. That is fine — Astro server-renders a React component
// that carries no directive and ships zero JS for it — but `Sortable`'s
// `renderItem` prop is a FUNCTION returning a ReactNode, and an `.astro`
// frontmatter block cannot author JSX. This component is the smallest thing
// that closes that gap, and it is shared rather than written twice.
//
// ═══ WHAT IT IS HONEST ABOUT ════════════════════════════════════════════════
// Without hydration the list draws and does not drag. That is the correct
// trade for a sketch whose reorder behaviour is already demonstrated, running
// and keyboard-driven, on /admin/photos — repeating it here would spend 243 KB
// gzip to show a second time what plan 13 measured once. Each host says so on
// screen rather than leaving a reviewer to discover a dead control.
//
// ═══ TWO THINGS MEASURED WHILE WRITING IT ═══════════════════════════════════
// 1. `SortableItem` spreads dnd-kit's attributes and listeners onto the item
//    WRAPPER (dist/index.js:9768-9769), so every row carries role="button" and
//    tabindex=0 even when nothing can drag it. A non-hydrated Sortable
//    therefore ships a keyboard stop per row that does nothing — visible in the
//    built HTML, and a second reason a `disabled` / `readOnly` prop belongs on
//    the component.
// 2. Nothing inside a row may be interactive, for the same reason: a button
//    nested inside role="button" is invalid ARIA and unreachable by keyboard.
//    Per-row actions live beside the list, never inside it.

import { Badge, Sortable, Text } from "@akhil-saxena/design-system";

export interface StaticSortItem {
	id: string;
	/** Rendered in mono at the row's leading edge — the position number. */
	index?: string;
	primary: string;
	secondary?: string;
	/** Mono metadata at the trailing edge — a stored key, a crop value. */
	meta?: string;
	/** Optional tone-carrying pill at the trailing edge. */
	badge?: { label: string; tone: "info" | "success" | "warning" | "error" | "neutral" | "pending" } | null;
	thumb?: string | null;
	/**
	 * D-20 segments. When present these render INSTEAD of `primary`, as React
	 * elements — `{text}` plain and `{text, emphasis: true}` inside a <strong>.
	 * No markup string exists anywhere in the path, which is the whole point of
	 * the shape, and it has to hold on the list surface as well as in the editor.
	 */
	segments?: Array<{ text: string; emphasis?: boolean }> | null;
}

interface Props {
	items: StaticSortItem[];
	listId: string;
	className?: string;
}

export default function SortableStatic({ items, listId, className }: Props) {
	if (items.length === 0) return null;
	return (
		<Sortable
			id={listId}
			className={className}
			items={items as unknown as Array<{ id: string }>}
			// D-02 SCOPE FENCE: nothing is written anywhere. The list is static,
			// so this is never called; it is required by the type all the same,
			// which is itself worth recording — `onReorder` is mandatory even for
			// a list that cannot reorder.
			onReorder={() => {}}
			renderItem={(item) => {
				const it = item as unknown as StaticSortItem;
				return (
					<div className="sst-row">
						{it.index ? <span className="sst-index">{it.index}</span> : null}
						{it.thumb ? (
							<img className="sst-thumb" src={it.thumb} alt="" loading="lazy" decoding="async" />
						) : null}
						<span className="sst-body">
							{it.segments && it.segments.length > 0 ? (
								<span className="sst-segments">
									{it.segments.map((s, i) =>
										s.emphasis ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>,
									)}
								</span>
							) : (
								<Text size="sm" tone="secondary">{it.primary}</Text>
							)}
							{it.secondary ? (
								<Text size="sm" tone="muted">{it.secondary}</Text>
							) : null}
						</span>
						{it.badge ? <Badge tone={it.badge.tone}>{it.badge.label}</Badge> : null}
						{it.meta ? <code className="sst-meta">{it.meta}</code> : null}
					</div>
				);
			}}
		/>
	);
}
