// copy.mjs — the build-time loader for the committed Phase 0 copy corpus.
//
// IT READS THE DRAFTS IN PLACE AND WRITES NOTHING. The five case-study drafts
// live at .planning/phases/00-design-ideation/00-COPY/ and are COMMITTED; this
// playground is gitignored and is deleted at phase exit. Copying the Markdown in
// here would create a second copy that survives exactly as long as nobody edits
// either one, and the one that survives the playground is the committed draft.
// So: read in place, one file of truth, and editing a draft is a one-file change
// that this page picks up on the next build. T-00-25 is mitigated by construction
// rather than by discipline.
//
// IT FAILS LOUD. A study missing a required heading throws, naming the file, the
// heading and the headings that WERE found. The failure being guarded against is
// not a crash — it is a template that renders three sections instead of four,
// looks entirely deliberate, and gets approved. A silently-missing section is the
// one defect this loader exists to make impossible.
//
// ── ONE TIER. D-39 IS SUPERSEDED ────────────────────────────────────────────
// `00-RESPONSIVE-CONTRACT.md` §7 supersedes D-39: there is one tier, one
// template, one length band, and one route per study at /work/{id}. This module
// used to key REQUIRED_HEADINGS by tier and take the tier as an argument; both
// are gone. `tier:` survives in four of the five drafts' frontmatter and is
// INERT — nothing reads it, Phase 6 strips it.
//
// ── THE TRAP THAT SURVIVED THE COLLAPSE ─────────────────────────────────────
// The corpus does NOT guarantee one spelling of the middle heading:
//
//     ## Problem · ## Decisions (PLURAL) or ## Decision (SINGULAR) · ## Outcome · ## Assets
//
// The old two-tier drafts spelled it plural in the long form and singular in the
// short. Plan 00-18 normalised all five to the plural — which removes the drift
// and, in the same move, removes every exercise of the singular branch. So the
// branch is now load-bearing and unexercised at once: nothing in the corpus would
// notice if it broke, and a draft written to the other spelling would land on it
// with no warning.
//
// Hence MIDDLE_HEADINGS is a ONE-SLOT, TWO-SPELLING match rather than a fixed
// string, hence the failure message prints both spellings and the headings
// actually found, and hence plan 00-20 carries a POSITIVE control — flip one
// draft to the singular, confirm the build still succeeds — alongside the
// negative one. A negative control alone would prove the throw and leave the
// accept unproven, which is the half of this that has no other witness.
//
// The assertion also checks that each section actually PARSED. A heading present
// with nothing under it is the same failure wearing a passing check: `sections[h]`
// is `[]`, which is truthy.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// Where the corpus lives, relative to the repository root.
//
// WRITTEN AS ONE LITERAL RATHER THAN ASSEMBLED FROM SEGMENTS. join() with four
// arguments would produce the identical path and would be marginally more
// portable, and it would also mean the path this module actually reads appears
// nowhere in this module's source — so the only place a reader (or a grep) could
// find it would be a comment, which is not evidence of anything. Plans 01, 04,
// 07 and 09 each hit the inverse of this: a comment that satisfied a check the
// code did not. One literal, in the code, is the version that stays true.
export const CORPUS_REL = ".planning/phases/00-design-ideation/00-COPY";

/**
 * The middle slot's accepted spellings — ONE section, two ways of writing it.
 *
 * Exported so the failure message can print both without a second literal, and
 * so a caller can say which spelling a given draft used without re-deriving it.
 * Plural first because that is what plan 00-18 normalised the corpus to; the
 * order is presentation only, both are equally accepted.
 */
export const MIDDLE_HEADINGS = ["Decisions", "Decision"];

/**
 * The four required H2s, in document order, for every study.
 *
 * The middle entry is an ARRAY because it is one slot with two accepted
 * spellings, not two optional sections — the same shape
 * `scripts/check-case-length.mjs` uses, deliberately, so the build-time loader
 * and the standalone gate cannot disagree about what a required section is.
 *
 * No tier key. `00-RESPONSIVE-CONTRACT.md` §7 supersedes D-39; see the header.
 */
export const REQUIRED_HEADINGS = ["Problem", MIDDLE_HEADINGS, "Outcome", "Assets"];

/**
 * R-1's length band, measured over the four required sections.
 *
 * ENFORCED HERE, INSIDE THE BUILD, OVER ALL FIVE STUDIES. `check-case-length.mjs`
 * enforces the same band from the command line and is the gate a human runs;
 * this one runs whether or not anybody remembers to. The two exist for different
 * reasons rather than by duplication: the standalone script still reports when
 * the build cannot complete at all, and this assertion still fires when nobody
 * runs the script.
 *
 * Plan 00-18 enforced the band on four of the five slugs and REPORTED the fifth,
 * because a parallel run held `case-design-system.md` open. That exclusion was a
 * schedule, not a hole, and plan 00-20 closed it from both ends: the superseded
 * 1,943-word draft is retired, the compressed one carries its name, the script's
 * OWNED array is all five, and this assertion covers all five at render time
 * regardless of which plan wrote them.
 */
export const BAND_MIN_WORDS = 500;
export const BAND_MAX_WORDS = 700;

/** The D-40 gap marker. Rendered visibly; never stripped. */
export const GAP_MARKER = "[NEEDS AKHIL]";

/** The provenance marker opener. Rendered visibly; stripped in Phase 6. */
const SOURCE_OPEN = "[source:";

// ── Locating the corpus ──────────────────────────────────────────────────────
//
// Anchored on process.cwd() and walked UPWARD, rather than derived from
// import.meta.url. Under `astro build` this module is transformed and bundled,
// so the URL it sees is not necessarily the URL it was authored at, and a path
// derived from it can resolve into .astro/ or dist/. cwd is the Astro project
// root for `npx astro build` run from .playground, one level under the repo
// root, and the walk makes it work from the repo root too.
//
// The failure lists every directory tried, because "ENOENT" naming a path
// nobody chose is the least useful build error there is.

function findCorpus() {
	const tried = [];
	let dir = resolve(process.cwd());
	for (let depth = 0; depth < 8; depth++) {
		const candidate = join(dir, CORPUS_REL);
		tried.push(candidate);
		if (existsSync(candidate)) return candidate;
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error(
		`copy.mjs: could not find the committed copy corpus "${CORPUS_REL}".\n` +
			`  Started at ${resolve(process.cwd())} and walked up. Tried:\n` +
			tried.map((t) => `    ${t}`).join("\n") +
			"\n  The sketches read the drafts IN PLACE from the committed phase directory —\n" +
			"  they are never copied into .playground/. Run the build from the repository\n" +
			"  root or from .playground/.",
	);
}

const CORPUS_DIR = findCorpus();

// ── Frontmatter ──────────────────────────────────────────────────────────────

function splitFrontmatter(text, rel) {
	if (!text.startsWith("---\n")) {
		throw new Error(`copy.mjs: ${rel} does not open with a YAML frontmatter block.`);
	}
	const end = text.indexOf("\n---\n", 3);
	if (end === -1) {
		throw new Error(`copy.mjs: ${rel} opens a frontmatter block that is never closed.`);
	}
	const raw = text.slice(4, end + 1);
	const frontmatter = {};
	for (const line of raw.split("\n")) {
		const at = line.indexOf(":");
		if (at === -1) continue;
		frontmatter[line.slice(0, at).trim()] = line.slice(at + 1).trim();
	}
	return { frontmatter, body: text.slice(end + 5) };
}

// ── Inline tokenizer ─────────────────────────────────────────────────────────
//
// Deliberately small, and deliberately NOT a Markdown library: the corpus is six
// files written by two plans against a stated contract, and the whole surface it
// uses is code spans, bold, italic, the two bracketed markers, and lists. A
// parser generous enough to accept arbitrary Markdown would also accept a draft
// that had drifted off the contract, which is the opposite of what plans 05 and
// 06 asserted.
//
// PRECEDENCE IS LOAD-BEARING. Code spans bind first, which is what protects the
// asterisks the corpus genuinely contains: `android.*`, `androidx.*`,
// `test/*.test.js`, `engine/*.kt`. Every one of those sits inside backticks, so
// the code branch consumes it before the emphasis branch can see it. Every
// remaining asterisk in the corpus is a matched emphasis pair — measured, not
// assumed.
//
// UNDERSCORE IS NOT AN EMPHASIS DELIMITER HERE. The corpus uses `user_id`,
// `since_last`, `cohort_compare` and `color_names.json`; treating _ as emphasis
// would italicise across two of them. The corpus never uses _ for emphasis, so
// the rule costs nothing and removes a whole class of false positive.

function matchBracket(text, from) {
	// The markers do not nest brackets. One bracketed run inside a source marker
	// does exist — `Eastern [US & Canada]` — and it lives inside a code span, so
	// it is consumed before this is ever reached.
	return text.indexOf("]", from);
}

function inline(text) {
	const out = [];
	let buf = "";
	let i = 0;
	const flush = () => {
		if (buf) out.push({ t: "text", v: buf });
		buf = "";
	};

	while (i < text.length) {
		const c = text[i];

		if (c === "`") {
			const end = text.indexOf("`", i + 1);
			if (end !== -1) {
				flush();
				out.push({ t: "code", v: text.slice(i + 1, end) });
				i = end + 1;
				continue;
			}
		}

		if (c === "*" && text[i + 1] === "*") {
			const end = text.indexOf("**", i + 2);
			if (end !== -1) {
				flush();
				out.push({ t: "strong", spans: inline(text.slice(i + 2, end)) });
				i = end + 2;
				continue;
			}
		}

		if (c === "*") {
			const end = text.indexOf("*", i + 1);
			if (end !== -1) {
				flush();
				out.push({ t: "em", spans: inline(text.slice(i + 1, end)) });
				i = end + 1;
				continue;
			}
		}

		if (text.startsWith(GAP_MARKER, i)) {
			flush();
			out.push({ t: "gapmarker", v: GAP_MARKER });
			i += GAP_MARKER.length;
			continue;
		}

		if (text.startsWith(SOURCE_OPEN, i)) {
			const end = matchBracket(text, i + SOURCE_OPEN.length);
			if (end !== -1) {
				flush();
				out.push({ t: "source", spans: inline(text.slice(i + SOURCE_OPEN.length, end).trim()) });
				i = end + 1;
				continue;
			}
		}

		buf += c;
		i++;
	}

	flush();
	return out;
}

/**
 * The same flatten, with `[source: ...]` markers dropped rather than rendered.
 *
 * TWO WORD COUNTS ARE IN CIRCULATION FOR EVERY STUDY AND THAT IS DELIBERATE.
 * `counts.words` includes provenance markers, because that is what a reviewer
 * sees on the page and the templates are being laid out against what is on the
 * page. `counts.bandWords` excludes them, because R-1's band is about PROSE and a
 * compression pass that reached 500 by keeping its citations and cutting its
 * sentences would have satisfied the letter of the band and nothing else.
 *
 * `check-case-length.mjs` strips the markers with a regex over raw Markdown; this
 * drops them structurally, after tokenizing. Plan 00-20 reconciled the two slug
 * by slug and they now agree EXACTLY on all five — 692 · 597 · 619 · 682 · 647.
 * Getting there took one fix, recorded at the `h3` ordinal in `countIn`; a
 * remaining disagreement would be a tokenizer bug worth knowing about rather than
 * a number to reconcile.
 */
export function spansTextExSources(spans) {
	return spans
		.map((s) => {
			if (s.t === "source") return " ";
			if (s.t === "text" || s.t === "code" || s.t === "gapmarker") return s.v;
			return spansTextExSources(s.spans);
		})
		.join("");
}

/** Anything carrying a letter or digit is a word. Shared by both counts. */
function wordsIn(text) {
	return text.split(/\s+/).filter((t) => /[A-Za-z0-9]/.test(t)).length;
}

/** Flatten spans back to plain text — used for marker detection and word counts. */
export function spansText(spans) {
	return spans
		.map((s) => {
			if (s.t === "text" || s.t === "code" || s.t === "gapmarker") return s.v;
			if (s.t === "source") return `${SOURCE_OPEN} ${spansText(s.spans)}]`;
			return spansText(s.spans);
		})
		.join("");
}

// ── Block parser ─────────────────────────────────────────────────────────────

function parseBlocks(lines) {
	const blocks = [];
	let para = [];

	const flushPara = () => {
		if (para.length === 0) return;
		// Lines inside one paragraph are joined with a space BEFORE tokenizing,
		// because the corpus wraps at ~95 columns and both markers routinely
		// straddle a wrap: `*different subset of raw token\nnames*` and
		// `[source:\n\`.../engine/\`, checked this session]` are both real.
		// Tokenizing line by line would leave those unmatched and render the
		// delimiters as literal text.
		blocks.push({ kind: "p", spans: inline(para.join(" ").trim()) });
		para = [];
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// HTML comment — a drafting note. Consumed whole, including a multi-line
		// one, and never inline-parsed: the notes contain `engine/*.kt` and
		// `test/*.test.js`, and they are raw drafting meta rather than prose.
		if (line.trimStart().startsWith("<!--")) {
			flushPara();
			const collected = [];
			let j = i;
			for (; j < lines.length; j++) {
				collected.push(lines[j]);
				if (lines[j].includes("-->")) break;
			}
			const raw = collected
				.join("\n")
				.replace(/^\s*<!--/, "")
				.replace(/-->\s*$/, "");
			const paragraphs = raw
				.split(/\n\s*\n/)
				.map((p) =>
					p
						.split("\n")
						.map((l) => l.trim())
						.filter(Boolean)
						.join(" "),
				)
				.filter(Boolean);
			if (paragraphs.length > 0) blocks.push({ kind: "note", paragraphs });
			i = j;
			continue;
		}

		if (line.startsWith("### ")) {
			flushPara();
			const title = line.slice(4).trim();
			// A register entry numbered "3. Contrast is a test" is split into its
			// ordinal and its title, so the decisions register can render AS a
			// register. cairn's "### Provenance note" carries no ordinal and falls
			// through with ordinal = null, which is the correct rendering for it.
			const m = /^(\d+)\.\s+(.*)$/.exec(title);
			blocks.push({
				kind: "h3",
				ordinal: m ? m[1] : null,
				spans: inline(m ? m[2] : title),
			});
			continue;
		}

		if (line.startsWith("> ")) {
			flushPara();
			const quoted = [];
			let j = i;
			for (; j < lines.length; j++) {
				if (!lines[j].startsWith(">")) break;
				quoted.push(lines[j].replace(/^>\s?/, ""));
			}
			blocks.push({ kind: "quote", blocks: parseBlocks(quoted) });
			i = j - 1;
			continue;
		}

		if (/^[-*]\s+/.test(line)) {
			flushPara();
			const items = [];
			let j = i;
			for (; j < lines.length; j++) {
				const l = lines[j];
				if (/^[-*]\s+/.test(l)) items.push(l.replace(/^[-*]\s+/, ""));
				else if (/^\s+\S/.test(l) && items.length > 0) items[items.length - 1] += ` ${l.trim()}`;
				else break;
			}
			blocks.push({ kind: "list", items: items.map((t) => inline(t)) });
			i = j - 1;
			continue;
		}

		if (line.trim() === "") {
			flushPara();
			continue;
		}

		para.push(line.trim());
	}

	flushPara();
	return blocks;
}

// ── Gap blocks ───────────────────────────────────────────────────────────────
//
// THE BOUNDARY RULE, AND WHY IT IS NOT THE COUNTER'S BOUNDARY RULE.
//
// check-copy-length.mjs measures a `[NEEDS AKHIL]` block as everything from the
// marker to the next heading, rule, or further marker. That is the right rule
// for a LENGTH FLOOR — it is generous, and being generous is safe when the thing
// you are enforcing is a minimum.
//
// It is the wrong rule for RENDERING, in exactly one file. In
// case-design-system.md the marker sits inside a blockquote, the blockquote
// closes, and then a finished paragraph follows before `## Assets` — the
// page-pointing closing sentence, the one outcome that needs no interview
// because the reader is looking at it. Rendered under the counter's rule that
// paragraph would come out muted, hairlined and labelled provisional, which
// would be a false statement about the only claim in the corpus that is already
// true.
//
// So the render boundary is: a marker inside a blockquote owns the BLOCKQUOTE;
// a marker outside one owns everything to the end of its section. For four of
// the five studies the two rules agree exactly. For the fifth the difference is
// one paragraph, and it is the most important paragraph on the page.
//
// Drafting notes are never absorbed into a gap; they are hoisted out and emitted
// after it, so scaffolding and provisional prose stay separately labelled.

function blockText(block) {
	if (block.kind === "p" || block.kind === "h3") return spansText(block.spans);
	if (block.kind === "list") return block.items.map(spansText).join(" ");
	if (block.kind === "quote") return block.blocks.map(blockText).join(" ");
	if (block.kind === "note") return "";
	return "";
}

function markGaps(blocks) {
	const out = [];
	for (let i = 0; i < blocks.length; i++) {
		const b = blocks[i];
		if (!blockText(b).includes(GAP_MARKER)) {
			out.push(b);
			continue;
		}

		if (b.kind === "quote") {
			out.push({ kind: "gap", scope: "blockquote", blocks: b.blocks });
			continue;
		}

		const rest = blocks.slice(i);
		out.push({ kind: "gap", scope: "to-next-heading", blocks: rest.filter((x) => x.kind !== "note") });
		for (const n of rest.filter((x) => x.kind === "note")) out.push(n);
		break;
	}
	return out;
}

// ── Counting ─────────────────────────────────────────────────────────────────

function countIn(blocks, acc) {
	for (const b of blocks) {
		if (b.kind === "note") {
			acc.notes++;
			continue;
		}
		if (b.kind === "gap") {
			acc.gaps++;
			countIn(b.blocks, acc);
			continue;
		}
		if (b.kind === "quote") {
			countIn(b.blocks, acc);
			continue;
		}
		// THE REGISTER ORDINAL IS A WORD, BECAUSE THE OTHER COUNTER SAYS IT IS.
		//
		// `### 3. Multi-tenancy is structural` is parsed into ordinal "3" and a
		// title, so the ordinal never reaches `b.spans` and would otherwise not be
		// counted. `check-case-length.mjs` counts raw Markdown and does count it.
		// That difference was measured, not assumed: before this line the two
		// counters disagreed by exactly one word per numbered `###` — cairn 689 vs
		// 692 and design-system 594 vs 597, both with three register entries, and
		// exact agreement on the three studies with none.
		//
		// Three words is nothing until a draft sits within three of a band edge,
		// and then it is a build that fails against a gate that passes. Two numbers
		// for one contract is the defect; which of them was "right" is not the
		// interesting question. They are now the same number.
		if (b.kind === "h3" && b.ordinal) {
			acc.words++;
			acc.bandWords++;
		}

		const spanLists = b.kind === "list" ? b.items : [b.spans];
		for (const spans of spanLists) {
			const walk = (list) => {
				for (const s of list) {
					if (s.t === "source") {
						acc.sources++;
						walk(s.spans);
					} else if (s.spans) walk(s.spans);
				}
			};
			walk(spans);
			acc.words += wordsIn(spansText(spans));
			acc.bandWords += wordsIn(spansTextExSources(spans));
		}
	}
	return acc;
}

/** A zero accumulator. One literal, so a new field cannot be added to half of them. */
function emptyCounts() {
	return { sources: 0, gaps: 0, notes: 0, words: 0, bandWords: 0 };
}

/**
 * Words, provenance markers, gap blocks and drafting notes in a block list.
 *
 * Exported because the templates print it BESIDE the layout. DSGN-02 is
 * satisfied by a template laid out against real text lengths rather than lorem,
 * and the cheapest way to make that checkable by eye is to put the length on the
 * page next to the thing it is testing — the same argument the contact sheet's
 * Part 4 makes for the byte counts.
 */
export function countBlocks(blocks) {
	return countIn(blocks, emptyCounts());
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Read one drafted study out of the committed corpus.
 *
 * ONE ARGUMENT. It used to take a tier as its second, and throw when the draft's
 * `frontmatter.tier` disagreed with the template rendering it. Both are gone:
 * `00-RESPONSIVE-CONTRACT.md` §7 supersedes D-39, there is one template, and a
 * check that a draft's tier matches the only tier there is cannot fail.
 *
 * `tier:` IS NOW INERT. It survives in four of the five drafts' frontmatter and
 * nothing reads it — not this loader, not `check-case-length.mjs`, not the route.
 * It is deliberately NOT deleted here: plan 00-18 recorded it as inert, and Phase
 * 6 strips it along with the `[source: ...]` markers and the drafting notes, as
 * one pass over the corpus rather than three. The fifth draft never had the key,
 * so the corpus already carries two frontmatter shapes and nothing cares, which
 * is the practical proof the key is dead.
 *
 * @param {string} slug file stem under 00-COPY/, e.g. "case-cairn"
 */
export function loadStudy(slug) {
	const file = join(CORPUS_DIR, `${slug}.md`);
	const rel = join(CORPUS_REL, `${slug}.md`);
	if (!existsSync(file)) {
		throw new Error(`copy.mjs: ${rel} does not exist. The corpus is at ${CORPUS_DIR}.`);
	}

	const { frontmatter, body } = splitFrontmatter(readFileSync(file, "utf8"), rel);

	// Split the body on H2s, keeping the H1 and anything before the first H2 as
	// the lead.
	const lines = body.split("\n");
	let title = "";
	const found = [];
	const buckets = new Map();
	let current = null;
	const lead = [];

	for (const line of lines) {
		if (line.startsWith("# ")) {
			title = line.slice(2).trim();
			continue;
		}
		if (line.startsWith("## ")) {
			current = line.slice(3).trim();
			found.push(current);
			buckets.set(current, []);
			continue;
		}
		(current === null ? lead : buckets.get(current)).push(line);
	}

	const sections = {};
	for (const [heading, raw] of buckets) sections[heading] = markGaps(parseBlocks(raw));

	// THE ASSERTION. Three failure modes, one message each.
	//
	// The middle slot is resolved rather than assumed: whichever of
	// MIDDLE_HEADINGS this draft actually used becomes the heading the template
	// iterates, so a study written to the singular renders identically to one
	// written to the plural. That resolution IS the either-branch — it is the
	// thing plan 00-20's positive control exercises, and the reason the control
	// is a build that must SUCCEED rather than one that must fail.
	const required = [];
	for (const slot of REQUIRED_HEADINGS) {
		const accepted = Array.isArray(slot) ? slot : [slot];
		const present = accepted.filter((h) => h in sections);

		if (present.length === 0) {
			throw new Error(
				`copy.mjs: ${rel} must carry ${
					accepted.length > 1
						? `ONE of the headings ${accepted.map((h) => `"## ${h}"`).join(" or ")}`
						: `the heading "## ${accepted[0]}"`
				}, and carries neither.\n` +
					`  H2 headings found, in order: ${found.map((h) => `## ${h}`).join(" | ") || "(none)"}\n` +
					`  Required, in order: ${REQUIRED_HEADINGS.map((s) =>
						Array.isArray(s) ? `(## ${s.join(" | ## ")})` : `## ${s}`,
					).join(" | ")}\n` +
					`  The middle slot is ONE section with ${MIDDLE_HEADINGS.length} accepted spellings — ` +
					`${MIDDLE_HEADINGS.map((h) => `"## ${h}"`).join(" and ")}. It is not optional and it is\n` +
					"  not two sections. A template that assumed one spelling would render this draft\n" +
					"  with its middle section missing, look entirely deliberate, and still build.",
			);
		}

		// Both spellings in one document is not a stricter version of the same
		// failure, it is a different one: the template would render whichever the
		// resolver picked and silently drop the other section's prose.
		if (present.length > 1) {
			throw new Error(
				`copy.mjs: ${rel} carries ${present.map((h) => `"## ${h}"`).join(" AND ")} — both spellings\n` +
					"  of the same required slot. One of them is a typo and the other is the section; this\n" +
					"  loader cannot tell which, and rendering either would drop the other's prose without\n" +
					"  a warning. Pick one.",
			);
		}

		const heading = present[0];
		const prose = sections[heading].filter((b) => b.kind !== "note");
		if (prose.length === 0) {
			throw new Error(
				`copy.mjs: ${rel} carries the heading "## ${heading}" but nothing parsed under it — ` +
					`${sections[heading].length} block(s), all drafting notes.\n` +
					"  An empty section renders as a deliberate-looking gap, which is the failure this\n" +
					"  loader exists to make impossible. Presence of the heading is not the check.",
			);
		}
		required.push(heading);
	}

	// DOCUMENT ORDER, asserted rather than implied. The template iterates
	// `required`, so an out-of-order draft would still render in the right
	// sequence — and the draft and the page would then disagree about the shape
	// of the argument, with the page winning silently. The contract says "in
	// document order"; this is what makes that sentence true.
	const positions = required.map((h) => found.indexOf(h));
	for (let i = 1; i < positions.length; i++) {
		if (positions[i] < positions[i - 1]) {
			throw new Error(
				`copy.mjs: ${rel} carries its required sections out of order.\n` +
					`  found, in document order: ${found.map((h) => `## ${h}`).join(" | ")}\n` +
					`  required, in order:       ${required.map((h) => `## ${h}`).join(" | ")}\n` +
					`  "## ${required[i]}" appears before "## ${required[i - 1]}". The template renders the\n` +
					"  required order, so the page would silently disagree with the draft about the\n" +
					"  shape of the argument.",
			);
		}
	}

	// Counted over the four required sections only. The lead is drafting meta
	// about the study rather than the study, so folding it in would inflate the
	// word count the templates are being laid out against.
	const counts = countIn(
		required.flatMap((h) => sections[h]),
		emptyCounts(),
	);

	// R-1's BAND, ENFORCED AT BUILD TIME OVER EVERY STUDY.
	//
	// Measured on bandWords — prose with `[source: ...]` stripped — because that
	// is what R-1 specifies and what `check-case-length.mjs` measures. Asserting
	// on `counts.words` instead would silently run a different band, higher by
	// however much provenance a study happens to carry, which is the one number
	// that has nothing to do with how long the study reads.
	if (counts.bandWords < BAND_MIN_WORDS || counts.bandWords > BAND_MAX_WORDS) {
		const bound = counts.bandWords < BAND_MIN_WORDS ? "UNDER" : "OVER";
		throw new Error(
			`copy.mjs: ${rel} is ${counts.bandWords} words over its four required sections, ` +
				`${bound} R-1's ${BAND_MIN_WORDS}-${BAND_MAX_WORDS} band.\n` +
				`  per section: ${required.map((h) => `${h} ${countIn(sections[h], emptyCounts()).bandWords}`).join(" · ")}\n` +
				`  (${counts.words} including the ${counts.sources} [source: ...] markers, which R-1 excludes —\n` +
				"   two totals are in circulation for every draft and quoting one against the other reads\n" +
				"   as an arithmetic error. The band is the stripped one.)\n" +
				"  Do not widen the band to make a draft fit. R-1 is the contract the single case\n" +
				"  template was laid out against; a study outside it is a copy problem, not a gate problem.",
		);
	}

	return {
		slug,
		file: rel,
		frontmatter,
		title,
		lead: parseBlocks(lead),
		sections,
		order: found,
		required,
		/** Which of MIDDLE_HEADINGS this draft used. The either-branch, observable. */
		middleHeading: required[1],
		counts,
	};
}

/**
 * The study's lead — everything between the H1 and the first H2 — turned into
 * drafting notes.
 *
 * NOTHING IN A COMMITTED DRAFT IS SILENTLY DROPPED, AND NOTHING DRAFTING META IS
 * RENDERED AS PROSE. The long-form leads are instructions to this template
 * rather than copy for the page: they state that the study opens with the
 * canonical one-liner, and that every factual claim carries a provenance marker.
 * The header carries the first instruction out, so rendering the sentence
 * describing it as body prose would put the instruction and its result on the
 * page twice, in different registers, at the top of a page whose whole job is to
 * show real lengths. Rendering it as a note keeps it visible and keeps it
 * labelled. The short-form leads are already HTML comments and pass through
 * unchanged.
 */
export function leadNotes(study) {
	const out = [];
	const prose = study.lead.filter((b) => b.kind === "p");
	if (prose.length > 0) {
		out.push({
			kind: "note",
			label: "Draft preamble",
			paragraphs: prose.map((b) => spansText(b.spans)),
		});
	}
	for (const n of study.lead.filter((b) => b.kind === "note")) out.push(n);
	return out;
}

/**
 * The canonical one-liner, card description and D-45 badge per project.
 *
 * one-liners.md is canonical for all three because it is the only file in the
 * corpus with a MEASURED character budget (check-copy-length.mjs enforces
 * 60-110 and 120-200) and because the Home Act-2 grid and the Work card were
 * both laid out against it in plan 09. A case-study header that paraphrased it
 * would silently change a length that two other artefacts depend on.
 */
export function loadOneLiners() {
	const file = join(CORPUS_DIR, "one-liners.md");
	if (!existsSync(file)) {
		throw new Error(`copy.mjs: ${join(CORPUS_REL, "one-liners.md")} does not exist.`);
	}
	const text = readFileSync(file, "utf8");
	const out = {};
	let key = null;
	for (const line of text.split("\n")) {
		if (line.startsWith("## ")) {
			key = line.slice(3).trim();
			out[key] = {};
			continue;
		}
		if (!key) continue;
		for (const [prefix, field] of [
			["- one-liner:", "oneLiner"],
			["- card:", "card"],
			["- badge:", "badge"],
		]) {
			if (line.startsWith(prefix)) out[key][field] = line.slice(prefix.length).trim();
		}
	}
	return out;
}
