// AdminTopbar — AppShell's `topbar` slot, carrying the global publish action AND
// D-15's photo-pipeline status strip.
//
// ═══ ARTEFACT O-pipeline-strip, AND IT IS G-8's EVIDENCE ═══════════════════
// D-15 requires pipeline status to SURVIVE NAVIGATION and to AGREE with the
// per-photo tile — "two places that must agree". A persistent region is the only
// shape that delivers that. AppShell's slots are exactly
// `sidebar | topbar | main | footer` and THERE IS NO `banner` SLOT, so the strip
// is composed into the topbar here.
//
// The consequence, stated plainly rather than buried: the strip does not survive
// as a DISTINCT REGION. It is welded to the topbar's own layout, it competes
// with the publish action for the same row of the shell, and it has no landmark
// of its own. Every alternative is worse — putting it in `main` means every one
// of the seven admin routes re-implements it, which is precisely the divergence
// D-15 forbids, and putting it in `footer` puts an active-process indicator
// below the fold. G-8 proposes an optional `banner` slot between topbar and
// main, and this composition is what that proposal is for.
//
// ═══ TWO THINGS THIS TOPBAR RENDERS THAT ARE NOT CHARCOAL ══════════════════
// 1. `Button variant="primary"` — the global CTA — resolves its fill to
//    `background: var(--amber)` and its border to `var(--amber-d)` as INLINE
//    STYLE, and the charcoal theme declares neither `--amber` nor `--amber-d`
//    (it introduces `--ochre*` as new names). So the admin's single most
//    prominent control renders the design system's yellow #f59e0b on a warm
//    charcoal-light field, and no stylesheet reaches it. Rendered as the design
//    system renders it and recorded as a finding — the Core Value forbids the
//    local fix, and UI-SPEC's accent-reserved list deliberately excludes
//    buttons ("nav links, buttons, badges ... use the ink ramp or a DS semantic
//    tone"), so there is no charcoal token this was supposed to reach either.
// 2. `ProgressBar`'s fill is `background: var(--amber)` in progressbar.css, and
//    the component exposes no colour prop. Same unmapped token, second surface.
//    It is in the stylesheet rather than inline, so CSS *could* reach it — the
//    refusal here is deliberate, not forced.
//
// ═══ RelativeTime's OUTPUT DOES NOT MATCH THE COPY CONTRACT ════════════════
// UI-SPEC's dashboard empty copy reads "Last published 3 days ago". RelativeTime
// formats a 3-day-old date as "3d ago" and has no verbosity or format prop, so
// the contract's phrasing is unreachable through the component. The empty state
// carries the contract's literal string as authored copy; the populated header
// uses the component and reads "Last published 3d ago". Both spellings are on
// the same page on purpose so the delta is visible in one glance.

import {
	AlertBanner,
	type AlertBannerTone,
	Button,
	Eyebrow,
	Heading,
	ProgressBar,
	RelativeTime,
	Text,
} from "@akhil-saxena/design-system";

export interface PipelineStrip {
	tone: AlertBannerTone;
	title: string;
	description: string;
	/** Photos processed so far. Omit both to render the indeterminate pulse. */
	value?: number;
	max?: number;
	label?: string;
}

export interface AdminTopbarProps {
	screenTitle: string;
	route: string;
	/** Exactly `Publish changes` — the global CTA in UI-SPEC's contract table. */
	publishLabel: string;
	pendingCount: number;
	/** ISO string. Rendered through RelativeTime; see the header note. */
	lastPublished: string;
	pipeline: PipelineStrip | null;
}

export default function AdminTopbar({
	screenTitle,
	route,
	publishLabel,
	pendingCount,
	lastPublished,
	pipeline,
}: AdminTopbarProps) {
	return (
		<div className="adm-topbar">
			<div className="adm-topbar-row">
				<div className="adm-topbar-title">
					<Eyebrow size="sm" tone="muted">
						{route}
					</Eyebrow>
					<Heading level={1} size="xl" weight="bold">
						{screenTitle}
					</Heading>
				</div>

				<div className="adm-topbar-actions">
					<Text size="sm" tone="muted">
						<RelativeTime
							date={lastPublished}
							prefix="Last published"
							updateInterval={0}
						/>
					</Text>
					<Button variant="secondary">Preview</Button>
					<Button variant="primary">
						{pendingCount > 0 ? `${publishLabel} (${pendingCount})` : publishLabel}
					</Button>
				</div>
			</div>

			{/* The D-15 strip. Kept inside the topbar because AppShell has no
			    `banner` slot — G-8. See the header for why every alternative is
			    worse. This is artefact O-pipeline-strip. */}
			{pipeline ? (
				<div className="adm-strip" data-tone={pipeline.tone}>
					<AlertBanner
						open
						tone={pipeline.tone}
						title={pipeline.title}
						dismissible={false}
						boldTitle={false}
					>
						<Text size="sm" tone="muted">
							{pipeline.description}
						</Text>
						{pipeline.value === undefined ? (
							<ProgressBar loading label={pipeline.label ?? "Processing"} />
						) : (
							<ProgressBar
								value={pipeline.value}
								max={pipeline.max ?? 100}
								label={pipeline.label}
							/>
						)}
					</AlertBanner>
				</div>
			) : null}
		</div>
	);
}
