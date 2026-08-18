#!/usr/bin/env bash
# check-no-js.sh — the zero-JS static-render assertion (MEASURE-2), and from
# plan 12 onward the HYDRATION BUDGET GATE. Run after `astro build`.
#
# ═══ WHAT IT PROVES, IN BOTH DIRECTIONS ═════════════════════════════════════
# Composing the design system on a non-interactive page is free. PROJECT.md's
# whole "DS components everywhere AND Lighthouse 95+" strategy rests on it — if
# importing Heading/Text/Card/Chip/Timeline/StatCard/AppBar/Footer cost a
# framework bundle, the Core Value and the performance constraint would be in
# direct conflict.
#
# Astro emits a tiny `<style>astro-island,astro-slot{display:contents}</style>`
# and an `astro-island` custom element ONLY on pages that hydrate. A page with no
# `client:*` directive gets neither, so a single grep for `<script` is a
# sufficient assertion.
#
# THIS SCRIPT NOW FAILS IN TWO DIRECTIONS, WHICH IS THE PLAN-12 CHANGE:
#
#   1. A page NOT on the allowlist that ships a script tag is a FAILURE. That is
#      the original assertion, unchanged.
#   2. A page that IS on the allowlist and ships ZERO script tags is ALSO a
#      FAILURE. A sanctioned island that silently stopped hydrating makes the
#      DS-09 measurement meaningless in the other direction: the check would go
#      green while measuring nothing. This is RESEARCH.md's pitfall 2 — "a pass
#      on a page with no client:* directive is meaningless" — turned into a
#      failing condition rather than a warning in a comment.
#
# An allowlisted route that does not exist in `dist/` yet is SKIPPED, so plan 12
# (which writes no island) and plans 13 and 14 (which write three) can each leave
# this green as the sanctioned hosts arrive one at a time. The readout names which
# entries are still absent, so their arrival is visible rather than assumed.
#
# ═══ THE ALLOWLIST IS NAMED, EXPLICIT, AND SMALL ════════════════════════════
# Plan 12 replaced three hard-coded `case` clauses with the list below. It is a
# list rather than a pattern for the reason the previous version already gave:
# `*/probe/*` would be the wrong fix, because probe/static and probe/tokens are
# the pages this check exists to DEFEND, and a glob would stop checking them.
#
# THE RULE FOR ADDING TO THIS LIST. Every entry must be a route whose ENTIRE
# PURPOSE is to hydrate, named individually. Six entries, two groups:
#
#   MEASUREMENT FIXTURES (3) — these hydrate so that something can be measured.
#     probe/island   the DS-09 fixture. Shipping JS is its entire job; its chunk
#                    is what check-bundle.mjs weighs (G-15).
#     probe/casc-c   the island half of the cascade matrix (MEASURE-3): variant C
#     probe/casc-d   carries theme-charcoal.css into the page from a hydrated
#                    island and variant D carries tokens.css the same way, which
#                    is what proves Astro hoists island CSS into the page-level
#                    cascade rather than isolating it. Drop their `client:load`
#                    directives and both variants silently collapse into
#                    duplicates of casc-a — the probe would still exit 0 while
#                    measuring half of what it claims. Direction 2 above now
#                    catches exactly that.
#
#   SANCTIONED ISLAND HOSTS (3) — UI-SPEC §Hydration Budget permits `client:load`
#   on precisely three sketches, because in each case THE INTERACTION IS THE
#   THING UNDER REVIEW and two of the three are being reviewed in order to file a
#   finding. They are written down here BEFORE they exist so the budget is
#   machine-enforced ahead of the first island rather than after it.
#     admin/home     the focal-point crop picker (D-23 / G-1)
#     admin/photos   Sortable reorder (D-22 / G-13)
#     admin/resume   RichText bullets (D-21 / G-3 / G-4)
#
# Every hydrated island currently costs ~177 KB gzip because the design-system
# barrel does not tree-shake, so a fourth entry is a real regression and not a
# bookkeeping change. Adding one requires a decision recorded in UI-SPEC, not an
# edit here.
#
# ═══ MATCHING, AND WHY IT ALLOWS EXACTLY ONE EXTRA SEGMENT ══════════════════
# An entry matches `dist/<entry>/index.html` AND `dist/<entry>/<one-segment>/
# index.html`. The single extra segment is the STATE AXIS: each admin screen is
# one file at `admin/<screen>/[...state].astro` emitting `/admin/<screen>/` plus
# one route per canonical state, and every state of a hydrating screen hydrates.
# The depth is capped at one on purpose — it is the set of states of one named
# screen, not a glob over a subtree, so it cannot quietly acquire pages nobody
# listed.

set -euo pipefail

cd "$(dirname "$0")"

ALLOWLIST=(
	"probe/island"
	"probe/casc-c"
	"probe/casc-d"
	"admin/home"
	"admin/photos"
	"admin/resume"
)

if [ ! -d dist ]; then
	echo "FAIL: dist/ does not exist — run \`npx astro build\` first." >&2
	exit 2
fi

# Returns 0 when $1 is the allowlist entry itself or one of its state routes.
is_allowed() {
	local route="$1" entry rest
	for entry in "${ALLOWLIST[@]}"; do
		if [ "$route" = "$entry" ]; then
			return 0
		fi
		case "$route" in
			"$entry"/*)
				rest="${route#"$entry"/}"
				# Exactly one further segment — the state axis, nothing deeper.
				case "$rest" in
					*/*) ;;
					*) return 0 ;;
				esac
				;;
		esac
	done
	return 1
}

static_checked=0
island_checked=0
failed=0
seen_allowlisted=""

while IFS= read -r f; do
	# dist/admin/empty/index.html -> admin/empty ; dist/index.html -> ""
	route="${f#dist/}"
	route="${route%/index.html}"
	route="${route%index.html}"
	route="${route%/}"

	n=$(grep -c '<script' "$f" || true)

	if is_allowed "$route"; then
		island_checked=$((island_checked + 1))
		seen_allowlisted="${seen_allowlisted} ${route}"
		if [ "$n" -eq 0 ]; then
			failed=1
			echo "FAIL: $f is on the hydration allowlist but ships ZERO script tags." >&2
			echo "      A sanctioned island that stopped hydrating makes the DS-09 measurement" >&2
			echo "      meaningless in the other direction — this check would go green while" >&2
			echo "      measuring nothing. Either the client:* directive was removed, or the" >&2
			echo "      route no longer needs to be on the allowlist and should be taken off it." >&2
		fi
		continue
	fi

	static_checked=$((static_checked + 1))

	if [ "$n" -ne 0 ]; then
		failed=1
		echo "FAIL: $f has $n script tag(s) and is NOT on the hydration allowlist." >&2
		echo "      A page with no client:* directive must ship zero framework JS." >&2
		echo "      Either a directive was added, or a component was imported in a way" >&2
		echo "      that forced hydration. Every island costs ~177 KB gzip because the" >&2
		echo "      design-system barrel does not tree-shake (G-15), so this is a budget" >&2
		echo "      regression rather than a tidiness one." >&2
		echo "      Widening the allowlist is NOT the fix — see this script's header." >&2
	fi
done < <(find dist -name '*.html' | sort)

if [ "$static_checked" -eq 0 ]; then
	echo "FAIL: no non-allowlisted HTML pages found under dist/." >&2
	echo "      The check would otherwise pass vacuously." >&2
	exit 2
fi

if [ "$failed" -ne 0 ]; then
	exit 1
fi

absent=""
for entry in "${ALLOWLIST[@]}"; do
	case " ${seen_allowlisted} " in
		*" ${entry} "*) ;;
		*) absent="${absent} ${entry}" ;;
	esac
done

echo "PASS: zero framework JS on all $static_checked static route(s)."
echo "      $island_checked allowlisted island route(s) verified to actually hydrate."
if [ -n "$absent" ]; then
	echo "      Allowlisted but not yet built (skipped):${absent}"
fi
