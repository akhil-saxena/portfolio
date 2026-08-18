#!/usr/bin/env bash
# check-no-ivory.sh — the DSGN-03 ivory guard.
#
# WHAT THIS PROVES, AND — MORE IMPORTANTLY — WHAT IT DOES NOT.
#
# It proves the ABSENCE OF IVORY. Nothing more. Work.dc.html and Photos.dc.html
# are the handoff's earlier ivory iteration, 103 and 69 lines of inline styles
# with hardcoded hex and not one class name, and the risk in porting them is not
# that someone forgets — it is that someone ports one value at a time and stops
# three quarters of the way through, leaving a page that is mostly charcoal with
# an ivory card border nobody notices on a laptop screen. This script catches
# exactly that.
#
# IT DOES NOT PROVE THE PRESENCE OF GOOD. A page that replaced every ivory value
# with #FF00FF passes this check. Nine of the substitutions are not straight
# swaps at all — the accent inverts its role AND splits into two tokens, the
# hued icon's ink is wrong in both themes, card boundaries move from fill to
# border, shadows do not port, photographs need an edge, the active filter pill
# flips to filled light, the family swap is not size-neutral, the measure needs
# capping, and the structure changes independently of colour. Every one of those
# is a judgement, and every one is reviewed BY EYE in plan 11. A green run here
# is a precondition for that review, not a substitute for it.
#
# The script says so in its own output, on every run, pass or fail. That is
# deliberate: a check whose name sounds like "the colours are right" will be
# quoted as though it means that, by someone reading a CI log six weeks from now.
#
# ── EDITING THIS FILE ────────────────────────────────────────────────────
# The seven values below are the search pattern. They must appear in this file
# EXACTLY ONCE EACH, in the array, and nowhere else — not in a comment, not in
# an example, not in the failure message. This script greps a directory tree,
# and if it ever grew to include its own directory it would find its own
# pattern and fail forever. It does not scan itself today, and the array is
# still the only place the literals live, so that stays true if someone widens
# the scan later. Describe the values in words, as this comment does: "the
# ivory page cream", "the card surface", "the placeholder grey".
#
# The same discipline applies to every file under src/. Prose describing an
# ivory value is indistinguishable from a rule using one, as far as grep is
# concerned, so the sketches name ivory hexes nowhere at all — they say what the
# value was FOR and what it became. Plans 04 and 07 each rediscovered this by
# breaking a check with a comment that explained the check, and the first draft
# of THIS script's own sketches did it in five places.
#
# ── THE ONE EXCLUSION, AND WHY IT IS NOT A LOOPHOLE ──────────────────────
# UI-SPEC's guard is specified as a grep over the whole of src/. Run literally,
# it fails — and not on a leak. TWO of the seven ivory values are also
# legitimate charcoal LIGHT-mode token values, declared in theme-charcoal.css
# and listed in UI-SPEC's own light-mode table: the ivory muted grey is
# charcoal's --ink-5 (decorative only, never text) and the ivory placeholder
# grey is charcoal's --rule-strong. The ivory iteration and charcoal light are
# both cream-family palettes, so a collision at two stops is unsurprising once
# stated — but it means the guard as written can never go green, and a guard
# that can never go green gets deleted rather than fixed.
#
# So the theme layer is excluded BY EXACT FILENAME, on the same terms
# check-no-js.sh excludes its hydrating fixtures: one named file, never a glob,
# with the reason written down. A glob over styles/ would stop checking
# manifest.css and fonts-charcoal.css, which are exactly the files a stray ivory
# value would hide in.
#
# The exclusion is then CLOSED by a positive assertion rather than trusted: the
# two colliding values must appear in the theme file only as those two specific
# token declarations, once each, in the light block. Any third occurrence, or a
# declaration under a different token name, fails. So the exclusion cannot be
# used to smuggle ivory in — it can only permit the two declarations that
# UI-SPEC itself specifies.

set -euo pipefail

cd "$(dirname "$0")"

SCAN_DIR="src"

# Excluded by exact name, never a glob. See the header for why, and for the
# assertion below that closes the hole this opens.
THEME="src/styles/theme-charcoal.css"

# The seven ivory values, in the order UI-SPEC's substitution table lists them:
# page cream, card surface, card border, muted text, control border, placeholder
# grey, primary ink.
IVORY=(
	'#F4F1EB'
	'#FFFEFB'
	'#E6E0D2'
	'#8D8779'
	'#DDD6C8'
	'#C4BDAD'
	'#26231E'
)

if [ ! -d "$SCAN_DIR" ]; then
	echo "FAIL: $SCAN_DIR/ does not exist — nothing to check, so this would pass vacuously." >&2
	exit 2
fi

SCAN_LIST=$(mktemp)
trap 'rm -f "$SCAN_LIST"' EXIT

find "$SCAN_DIR" -type f \( -name '*.astro' -o -name '*.tsx' -o -name '*.ts' -o -name '*.css' \) \
	! -path "$THEME" >"$SCAN_LIST"

files_scanned=$(wc -l <"$SCAN_LIST" | tr -d ' ')

if [ "$files_scanned" -eq 0 ]; then
	echo "FAIL: no source files found under $SCAN_DIR/ — the check would pass vacuously." >&2
	exit 2
fi

pattern=$(
	IFS='|'
	echo "${IVORY[*]}"
)

found=0

for value in "${IVORY[@]}"; do
	# -i because a hex is case-insensitive to a browser and must be to this check
	# too: the lower-case spelling renders identically and would otherwise walk
	# straight through.
	if hits=$(grep -niF -- "$value" $(cat "$SCAN_LIST") 2>/dev/null); then
		found=1
		echo "FAIL: ivory value $value is still present:" >&2
		echo "$hits" | sed 's/^/      /' >&2
	fi
done

# ── CLOSING THE EXCLUSION ────────────────────────────────────────────────
# The theme file is skipped above, so this asserts what it is allowed to
# contain: the two colliding values, once each, as the two token declarations
# UI-SPEC's light-mode table specifies — and nothing else. A third occurrence,
# or either value bound to a different token name, fails here.
if [ ! -f "$THEME" ]; then
	echo "FAIL: $THEME is missing — the exclusion above would silently widen to nothing." >&2
	exit 2
fi

theme_expect() {
	local token="$1" value="$2"
	local total exact
	total=$(grep -ciF -- "$value" "$THEME" || true)
	exact=$(grep -cE "^[[:space:]]*${token}:[[:space:]]*${value};" "$THEME" || true)
	if [ "$total" -ne 1 ] || [ "$exact" -ne 1 ]; then
		found=1
		echo "FAIL: in $THEME, $value must appear exactly once, as \`$token\`." >&2
		echo "      Found $total occurrence(s), of which $exact match that declaration." >&2
		echo "      This value is BOTH an ivory value and a charcoal light-mode token," >&2
		echo "      which is the only reason the file is excluded from the scan above." >&2
	fi
}

# The ivory muted grey is charcoal's decorative-only ink step; the ivory
# placeholder grey is charcoal's strong hairline. Both light-mode only.
theme_expect "--ink-5" "#8D8779"
theme_expect "--rule-strong" "#C4BDAD"

echo
echo "Scanned $files_scanned source file(s) under $SCAN_DIR/ for ${#IVORY[@]} ivory values."
echo "Excluded by name: $THEME (2 values are also charcoal light-mode tokens; asserted separately)."
echo "Pattern: $pattern"
echo

if [ "$found" -ne 0 ]; then
	cat >&2 <<-'MSG'
		The ivory iteration has not been fully resolved onto charcoal. Replace the
		value above with the charcoal token for its ROLE, not with the nearest
		matching colour — the substitution table in 00-UI-SPEC.md gives the role for
		each of the seven, and 00-PUBLIC-DESIGN-NOTES.md records the nine cases where
		the substitution is not a straight swap.

		One value is not replaced at all: the placeholder grey is DELETED along with
		the bracketed markers it painted, and the real copy from 00-COPY/ takes their
		place. A recoloured placeholder is a placeholder that survived the port.
	MSG
	exit 1
fi

cat <<-'MSG'
	PASS: no ivory token value remains in the sketch sources.

	READ THIS BEFORE QUOTING THE PASS. This check proves the ABSENCE of ivory and
	nothing else. It cannot tell whether the charcoal that replaced it is right:
	nine of the substitutions are not straight swaps, every one of them is a
	judgement, and all nine are reviewed BY EYE in plan 11 against
	00-PUBLIC-DESIGN-NOTES.md. Green here is a precondition for that review, not a
	design review.
MSG
