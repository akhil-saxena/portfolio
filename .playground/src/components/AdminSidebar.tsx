// AdminSidebar — the seven-route rail that fills AppShell's `sidebar` slot.
//
// WHY THIS IS A .tsx AND NOT WRITTEN INLINE IN Admin.astro. AppShell takes
// `sidebar`, `topbar`, `main` and `footer` as React PROPS, and JSX cannot be
// passed as a React prop from an .astro file — only the default slot converts.
// Plan 01 crashed the build on exactly that. So the whole shell is composed
// inside React and Admin.astro passes plain values plus its default slot.
//
// THE PROP CONTRACT, AND WHAT THE CONSUMER CANNOT REACH THROUGH IT.
// AppShell injects `collapsed` and `onToggleCollapse` into this element via
// React.cloneElement. Both are honoured below. But cloneElement MERGES THE NEW
// PROPS OVER THE ORIGINAL ELEMENT'S, so a `collapsed` the consumer writes on
// this element is overwritten by AppShell's own state — and AppShell has no
// `collapsed` or `defaultCollapsed` prop of its own, its collapse state being a
// private useState seeded only from localStorage. Under SSR readStorage()
// returns false, so `collapsed` is ALWAYS false in these sketches and the
// icon-rail posture the responsive contract requires at device classes 3 and 4
// cannot be selected through AppShell's API at all. That is recorded in the
// SUMMARY as a finding; the rail below is therefore driven by a media query in
// Admin.astro, which is the route a consumer is forced into.
//
// THE RAIL IS A MONO MONOGRAM, NOT AN ICON, AND THAT IS A FINDING TOO.
// UI-SPEC names the icon library as "lucide-react, re-exported via
// @akhil-saxena/design-system/icons". That export ships 32 icons and every one
// of them is editor-toolbar or dialog chrome — Bold, Italic, Quote, ChevronX,
// Trash, Search. There is no Home, no Image, no FileText, no Folder, no
// Settings, no LayoutDashboard. So an admin navigation rail cannot be built
// from the design system's own icon surface. `Icon` does accept any
// `LucideIcon` through its `icon` prop, but obtaining one means importing
// lucide-react directly, which is neither a declared dependency of this
// playground nor installable here (this plan installs no package, T-00-SC).
// The rail therefore uses a two-character IBM Plex Mono monogram, which is a
// deliberate typographic treatment in the identity's own labels face rather
// than a stand-in for a missing glyph — seven routes read faster as DB/HM/PH
// than as seven ambiguous pictograms. Recorded either way.

import { Badge } from "@akhil-saxena/design-system";

/** D-13's three-state model. The names are the domain's, not the design system's. */
export type EntityState = "draft" | "ready" | "published";

export interface AdminNavEntry {
	/** Matches a CANONICAL_SCREENS id. */
	id: string;
	label: string;
	/** Two-character mono monogram shown in the collapsed rail. */
	monogram: string;
	href: string;
	/** A child route, indented and rendered under its parent. */
	child?: boolean;
	state: EntityState;
}

export interface AdminSidebarProps {
	entries: AdminNavEntry[];
	active: string;
	/** Number of entities carrying pending changes; drives the dashboard count. */
	pendingCount: number;
	/** Injected by AppShell via cloneElement. Always false under SSR. */
	collapsed?: boolean;
	/** Injected by AppShell via cloneElement. Unused: these sketches never hydrate. */
	onToggleCollapse?: () => void;
}

// D-13 mapped onto Badge's tones, exactly as UI-SPEC §Component Mapping
// specifies: `pending` -> draft, `upcoming` -> ready, `done` -> published.
//
// WHAT THAT MAPPING ACTUALLY RENDERS ON CHARCOAL LIGHT, measured from
// ../design-system/src/inputs/Badge/index.tsx (every tone is an inline style
// object, so no stylesheet reaches any of it):
//   draft     `pending`  -> background var(--cream-2) #FBF9F4, color var(--ink-3)
//                          #4F4C42. The pill sits at a 1.07:1 fill delta against
//                          the #F4F1EA page, so the BADGE IS INVISIBLE and only
//                          its text reads. `dot` is added below to give it a
//                          visible mark, which is a real Badge prop rather than
//                          a style override.
//   ready     `upcoming` -> blue tint + var(--blue). Charcoal declares no --blue.
//   published `done`     -> purple tint + var(--purple). Charcoal declares no
//                          --purple.
// So D-13's three states render as one invisible pill, one design-system blue
// and one design-system purple, from three unrelated hue families, none of them
// charcoal, on a warm charcoal-light admin. Rendered as specified and recorded
// as a finding rather than corrected with a `style` escape hatch.
const TONE: Record<EntityState, "pending" | "upcoming" | "done"> = {
	draft: "pending",
	ready: "upcoming",
	published: "done",
};

const STATE_LABEL: Record<EntityState, string> = {
	draft: "Draft",
	ready: "Ready",
	published: "Published",
};

export default function AdminSidebar({
	entries,
	active,
	pendingCount,
	collapsed = false,
}: AdminSidebarProps) {
	return (
		<nav className="adm-nav" aria-label="Admin sections" data-collapsed={collapsed}>
			<p className="adm-nav-brand">
				<span className="adm-nav-mono">AS</span>
				<span className="adm-nav-label">akhilsaxena.com</span>
			</p>

			<ul className="adm-nav-list">
				{entries.map((e) => {
					const isDashboard = e.id === "dashboard";
					return (
						<li key={e.id}>
							<a
								className="adm-nav-link"
								href={e.href}
								data-active={e.id === active ? "true" : undefined}
								data-child={e.child ? "true" : undefined}
								aria-current={e.id === active ? "page" : undefined}
							>
								<span className="adm-nav-mono" aria-hidden="true">
									{e.monogram}
								</span>
								<span className="adm-nav-label">{e.label}</span>
								{isDashboard ? (
									<Badge tone="count" aria-label={`${pendingCount} entities pending`}>
										<span className="adm-nav-badge-text">{pendingCount} pending</span>
										<span className="adm-nav-badge-short" aria-hidden="true">
											{pendingCount}
										</span>
									</Badge>
								) : (
									<Badge tone={TONE[e.state]} dot aria-label={STATE_LABEL[e.state]}>
										<span className="adm-nav-badge-text">{STATE_LABEL[e.state]}</span>
									</Badge>
								)}
							</a>
						</li>
					);
				})}
			</ul>

			{/* At device classes 1 and 2 (344-672, coarse pointer) AppShell's own
			    stylesheet hides this whole region — appshell.css carries
			    `@media (max-width: 767px) { .ds-atom-appshell-sidebar { display: none } }`.
			    D-09 assigns that posture to `Sheet side="left"`, and there is no
			    AppShell slot to hang one from. That surface is artefact
			    O-phone-sidebar and belongs to plans 15 and 16; naming the owner
			    here so the absence is a scheduled gap rather than an oversight. */}
			<p className="adm-nav-foot">
				<span className="adm-nav-label">Seven routes, one entity each</span>
			</p>
		</nav>
	);
}
