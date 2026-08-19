// AdminShell — the one place AppShell is composed, so no admin route composes it
// twice and no admin route can forget a slot.
//
// WHY THE COMPOSITION LIVES IN REACT RATHER THAN IN Admin.astro. AppShell's
// `sidebar`, `topbar`, `main` and `footer` are React PROPS taking ReactNode /
// ReactElement. JSX passed as a named prop from an .astro file crashes the build
// — only the default slot converts to children. So Admin.astro passes plain
// serialisable values plus its default slot, and everything structural happens
// here. Plan 01 paid for this lesson.
//
// `main` IS THE ASTRO DEFAULT SLOT. Astro converts the default slot to React
// `children`, and children are just a ReactNode, so forwarding them into
// AppShell's `main` prop is legal and needs no directive.
//
// NO HYDRATION DIRECTIVE ANYWHERE — and the directive prefix is deliberately not
// spelled in this file either, so a source grep counting it stays honest across
// the admin tree. AppShell uses useState + useEffect, so under
// SSR it renders once at its initial collapse state and never hydrates — which
// is exactly what a static sketch wants. The hydration budget reserves all three
// permitted islands for plans 13 and 14 (the crop picker, Sortable reorder and
// RichText), and every island currently costs ~177 KB gzip because the barrel
// does not tree-shake (G-15).
//
// `storageKey={null}` DISABLES COLLAPSE PERSISTENCE, deliberately. With no
// hydration, localStorage is never touched either way, so this changes nothing
// today — it exists so that if plan 13 or 14 hydrates a route, a collapse state
// cannot leak across sketches and quietly change what a screenshot shows.

import { AppShell } from "@akhil-saxena/design-system";
import type { ReactNode } from "react";
import AdminSidebar, { type AdminNavEntry } from "./AdminSidebar";
import AdminTopbar, { type PipelineStrip } from "./AdminTopbar";

export interface AdminShellProps {
	entries: AdminNavEntry[];
	active: string;
	screenTitle: string;
	route: string;
	publishLabel: string;
	pendingCount: number;
	lastPublished: string;
	pipeline: PipelineStrip | null;
	/**
	 * UI-SPEC's compact target, 208px, against a measured DS default of 240.
	 *
	 * THIS PROP IS THE ONLY ROUTE TO THE SIDEBAR WIDTH, AND THAT IS A FINDING.
	 * AppShell writes `--ds-sidebar-w` as an INLINE STYLE on its own root, so no
	 * stylesheet reaches it at any specificity without `!important`. A prop is a
	 * constant, so the width cannot vary with a media query — meaning the
	 * sidebar is the one compact target that cannot participate in the density
	 * axis at all. 208 is correct at fine pointer and wrong at coarse, and there
	 * is no CSS-only way to say so. G-2 evidence; see density-compact.css.
	 *
	 * 208 is a DENSITY concern, not a charcoal one, which is why
	 * `--ds-sidebar-w` correctly sits on D-31's MUST-NOT-redefine list for a
	 * brand theme.
	 */
	sidebarWidth: number;
	children?: ReactNode;
}

export default function AdminShell({
	entries,
	active,
	screenTitle,
	route,
	publishLabel,
	pendingCount,
	lastPublished,
	pipeline,
	sidebarWidth,
	children,
}: AdminShellProps) {
	return (
		<AppShell
			storageKey={null}
			sidebarWidth={sidebarWidth}
			sidebar={
				<AdminSidebar entries={entries} active={active} pendingCount={pendingCount} />
			}
			topbar={
				<AdminTopbar
					screenTitle={screenTitle}
					route={route}
					publishLabel={publishLabel}
					pendingCount={pendingCount}
					lastPublished={lastPublished}
					pipeline={pipeline}
				/>
			}
			main={
				<div className="adm-main">
					<div className="adm-content">{children}</div>
				</div>
			}
		/>
	);
}
