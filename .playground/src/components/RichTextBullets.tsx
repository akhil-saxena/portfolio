// RichTextBullets — D-20/D-21's bullet editor, running, and G-3/G-4's evidence.
//
// ═══ WHY THIS ONE HYDRATES ══════════════════════════════════════════════════
// UI-SPEC's hydration budget permits exactly three islands in the whole phase
// and this is the third. The rule for all three is the same: THE INTERACTION IS
// THE THING UNDER REVIEW. Two of the three exist in order to file a finding
// rather than to prove a success, and this is the sharper of the two — because
// what it demonstrates is DATA LOSS on save, and a type definition cannot
// demonstrate that.
//
// ═══ THE POINT IS TO SHOW THE FAILURE, NOT TO ROUTE AROUND IT ═══════════════
// D-21 wants bold as the only mark. D-20 wants bullets stored as
// `{text}` / `{text, emphasis: true}` segments, because a shape that cannot
// express markup cannot carry an injection — the legacy stored-XSS class is
// designed OUT rather than filtered (threat T-00-02). Against today's RichText
// both requirements are unreachable:
//
//   G-3 — THE MARKS CANNOT BE RESTRICTED. There is no `marks` prop and no
//   `extensions` prop. The extension list is a literal inside the component
//   (dist/index.js:8686-8698): StarterKit with link and underline opted out,
//   then CodeBlockLowlight, a configured Link with `autolink: true`, Placeholder,
//   Underline and Highlight added back. `toolbar` is a RENDERING prop — passing
//   null removes the buttons and touches no extension — so italic, underline,
//   highlight, link, headings, lists, blockquote and code all stay live on their
//   keyboard shortcuts. The component even ships the shortcut list it cannot
//   disable (dist/index.js:8640-8648).
//
//   G-4 — THERE IS NO SEGMENT OUTPUT. `outputFormat` accepts two values. One
//   emits a string of markup, which D-20 rules out ON PRINCIPLE rather than on
//   convenience: if that string exists anywhere, the class D-20 designs away is
//   back. The other emits a TipTap document, so this file uses that one and
//   adapts it. The adapter below is the thing that should be a prop.
//
// NO LOCAL MARK SUPPRESSION IS ADDED, and that is deliberate rather than lazy.
// A key handler that swallowed the italic shortcut would hide exactly the
// evidence Phase 1 is being asked to fund a fix with, and forking RichText would
// be the local component Core Value forbids (threat T-00-33). The fix belongs
// upstream as `marks?: Array<"bold" | "italic" | ...>` on RichTextProps.
//
// ═══ WHAT THE PAGE SHOWS BECAUSE OF THAT DECISION ═══════════════════════════
// Two readouts, both produced by the SAME serializer the live editor uses:
//   1. LIVE — the segment array for whatever is currently in the editor, plus a
//      list of marks the shape could not carry. Apply italic and the readout
//      names it as dropped, in place, while the editor still shows it.
//   2. RECORDED — a document that already carries one bold run and one italic
//      run, serialized at render time, printed before and after. This one is in
//      the BUILT HTML, so the loss is reviewable without anyone typing.
//
// ═══ NO PERSISTENCE — THE D-02 SCOPE FENCE ══════════════════════════════════
// No network request, no storage of any kind, no endpoint. Serialized segments
// are printed and thrown away. Asserted by grep rather than promised here.

import { useMemo, useState } from "react";
import { Badge, Eyebrow, Field, RichText, Text } from "@akhil-saxena/design-system";

/** D-20's stored shape. One optional flag, and no way to express anything else. */
export interface Segment {
	text: string;
	emphasis?: boolean;
}

interface TipTapMark {
	type: string;
}
interface TipTapNode {
	type: string;
	text?: string;
	marks?: TipTapMark[];
	content?: TipTapNode[];
}

interface Props {
	entryId: string;
	entryLabel: string;
	/** Every bullet on the entry, already in D-20 segment form. */
	bullets: Segment[][];
	/** Which bullet gets the live editor. The rest render as static segments. */
	editIndex?: number;
	/** A recorded document carrying an italic run — G-4's evidence. */
	lossDoc?: TipTapNode | null;
}

// ── segments -> TipTap document ─────────────────────────────────────────────
// The mapping is total in this direction: `emphasis` becomes a bold mark and
// there is nothing else to carry. It is the OTHER direction that loses.
function segmentsToDoc(segments: Segment[]): TipTapNode {
	const content = segments
		.filter((s) => s.text.length > 0)
		.map((s) => ({
			type: "text",
			text: s.text,
			...(s.emphasis ? { marks: [{ type: "bold" }] } : {}),
		}));
	return {
		type: "doc",
		content: [content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" }],
	};
}

// ── TipTap document -> segments. THIS IS WHERE THE DATA IS LOST ─────────────
// `bold` maps to `emphasis`. EVERY OTHER MARK IS DROPPED, because D-20's shape
// has nowhere to put it — italic, underline, highlight and link all arrive as a
// mark on a text node and leave as plain text. The serializer reports what it
// dropped instead of dropping it silently, which is the one thing a real
// implementation could not do either: reporting it does not make the loss stop,
// it only makes it visible. That is the difference between a finding and a fix.
function docToSegments(doc: TipTapNode | null | undefined): {
	segments: Segment[];
	dropped: string[];
	nodesDropped: string[];
} {
	const segments: Segment[] = [];
	const dropped = new Set<string>();
	const nodesDropped = new Set<string>();

	const walk = (node: TipTapNode | undefined) => {
		if (!node) return;
		if (node.type === "text") {
			const marks = (node.marks ?? []).map((m) => m.type);
			for (const m of marks) if (m !== "bold") dropped.add(m);
			segments.push({ text: node.text ?? "", ...(marks.includes("bold") ? { emphasis: true } : {}) });
			return;
		}
		// A bullet is one paragraph of runs. Anything structural — a heading, a
		// list, a blockquote, a code block — is a node type the shape cannot
		// express at all, and all of them are reachable by keyboard.
		if (!["doc", "paragraph"].includes(node.type)) nodesDropped.add(node.type);
		for (const child of node.content ?? []) walk(child);
	};
	walk(doc ?? undefined);

	// Adjacent runs with the same flag are merged, so the shape stays canonical
	// and a reviewer is not reading serializer noise.
	const merged: Segment[] = [];
	for (const s of segments) {
		const prev = merged[merged.length - 1];
		if (prev && !!prev.emphasis === !!s.emphasis) prev.text += s.text;
		else merged.push({ ...s });
	}
	return {
		segments: merged.filter((s) => s.text.length > 0),
		dropped: [...dropped].sort(),
		nodesDropped: [...nodesDropped].sort(),
	};
}

/** Renders a bullet from segments as React elements. No markup string exists. */
function SegmentRun({ segments }: { segments: Segment[] }) {
	return (
		<>
			{segments.map((s, i) =>
				s.emphasis ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>,
			)}
		</>
	);
}

const pretty = (segments: Segment[]) =>
	`[\n${segments
		.map((s) => `  { text: ${JSON.stringify(s.text)}${s.emphasis ? ", emphasis: true" : ""} }`)
		.join(",\n")}\n]`;

/** Names each run and the marks on it, so the "before" side is legible. */
function runSummary(doc: TipTapNode | null | undefined): string {
	const rows: string[] = [];
	const walk = (n: TipTapNode | undefined) => {
		if (!n) return;
		if (n.type === "text") {
			const marks = (n.marks ?? []).map((m) => m.type);
			rows.push(`${marks.length ? marks.join("+") : "plain"}: ${JSON.stringify(n.text ?? "")}`);
			return;
		}
		for (const c of n.content ?? []) walk(c);
	};
	walk(doc ?? undefined);
	return rows.join("\n");
}

export default function RichTextBullets({
	entryId,
	entryLabel,
	bullets,
	editIndex = 0,
	lossDoc = null,
}: Props) {
	const initialDoc = useMemo(
		() => segmentsToDoc(bullets[editIndex] ?? []),
		[bullets, editIndex],
	);
	const [doc, setDoc] = useState<TipTapNode>(initialDoc);

	const live = docToSegments(doc);
	const recorded = useMemo(() => docToSegments(lossDoc), [lossDoc]);

	// ── UNCONDITIONAL RENDER, NULL RETURN ──────────────────────────────────
	// check-no-js.sh fails an allowlisted route that ships zero script tags, and
	// every state route of an allowlisted screen is allowlisted. So the host page
	// mounts this on every state and passes an empty list where there is nothing
	// to author. Astro still emits the island element and the hydration script.
	if (bullets.length === 0) return null;

	return (
		<div className="rtb-root">
			{/* ── The live editor ───────────────────────────────────────────────
			    `toolbar={null}` removes the buttons. It does NOT remove the
			    extensions, and the three shortcut answers are recorded in the
			    plan's SUMMARY after being driven by hand in a browser. */}
			<Field
				label={`Bullets — bullet ${editIndex + 1} of ${bullets.length}`}
				wiring={{
					controlId: `f-${entryId}-bullet-${editIndex}`,
					hintId: undefined,
					errorId: undefined,
					describedBy: undefined,
					invalid: false,
				}}
				hint="Bold is the only mark the stored shape can carry. The editor does not know that."
			>
				<div className="rtb-editor">
					<RichText
						value={doc}
						onChange={(v) => setDoc(v as TipTapNode)}
						outputFormat="json"
						toolbar={null}
						placeholder="One achievement per bullet."
						ariaLabel={`Bullet ${editIndex + 1} of ${bullets.length} for ${entryLabel}`}
					/>
				</div>
			</Field>

			{/* ── LIVE: what the serializer would store, right now ───────────── */}
			<div className="rtb-panel">
				<Eyebrow size="sm" tone="muted">SERIALIZED SEGMENTS — LIVE</Eyebrow>
				<pre className="rtb-code">{pretty(live.segments)}</pre>
				{live.dropped.length > 0 || live.nodesDropped.length > 0 ? (
					<div className="rtb-loss">
						<Badge tone="error">
							{live.dropped.length + live.nodesDropped.length} thing(s) dropped on serialize
						</Badge>
						<Text size="sm" tone="muted">
							{live.dropped.length > 0
								? `Marks the shape cannot carry: ${live.dropped.join(", ")}. `
								: ""}
							{live.nodesDropped.length > 0
								? `Node types the shape cannot carry: ${live.nodesDropped.join(", ")}. `
								: ""}
							The editor still shows them. The stored value above does not.
						</Text>
					</div>
				) : (
					<Text size="sm" tone="muted">
						Nothing dropped yet. Put the caret in the editor and press the italic shortcut —
						the editor will apply it and this panel will name it as lost.
					</Text>
				)}
			</div>

			{/* ── RECORDED: the same serializer, on a document that already has an
			    italic run. This is the half that survives into the built HTML, so
			    the evidence is reviewable without hydration and without typing. */}
			{lossDoc && (
				<div className="rtb-panel" data-evidence="g-4">
					<Eyebrow size="sm" tone="muted">
						RECORDED — ONE BOLD RUN AND ONE ITALIC RUN, SERIALIZED
					</Eyebrow>
					<div className="rtb-two">
						<div className="rtb-half">
							<Text size="sm" tone="secondary">Before — what was authored</Text>
							<pre className="rtb-code">{runSummary(lossDoc)}</pre>
						</div>
						<div className="rtb-half">
							<Text size="sm" tone="secondary">After — what would be stored</Text>
							<pre className="rtb-code">{pretty(recorded.segments)}</pre>
						</div>
					</div>
					<Text size="sm" tone="muted">
						The bold run survives as <code>emphasis: true</code>. The italic run comes back as
						plain text and the two neighbouring plain runs merge around it, so nothing in the
						stored value records that a mark was ever there. Dropped:{" "}
						<strong>{recorded.dropped.join(", ") || "nothing"}</strong>. That is a silent save,
						which is why G-4 is data loss rather than a styling miss.
					</Text>
				</div>
			)}

			{/* ── The editor's own context: which bullet, out of how many ───────
			    Not the whole list. The full ordered list of every bullet is
			    rendered ONCE on the page, in the Sortable below this island, from
			    the same segments and as React elements. Rendering all eleven twice
			    on one 960px column would put 22 rows on screen for one entry. */}
			<Text size="sm" tone="muted">
				Bullet {editIndex + 1} of {bullets.length} on {entryLabel}. The remaining{" "}
				{bullets.length - 1} are in the ordered list below, rendered from segments as React
				elements — no markup string exists anywhere in the shape, which is the whole of D-20.
				One editor at a time, because the budget is one island per route.
			</Text>
			<div className="rtb-panel">
				<Eyebrow size="sm" tone="muted">THE SAME BULLET, RENDERED FROM ITS STORED SEGMENTS</Eyebrow>
				<p className="rtb-rendered">
					<SegmentRun segments={bullets[editIndex] ?? []} />
				</p>
			</div>
		</div>
	);
}
