// The public nav, composed from the design system's AppBar.
//
// WHY THIS IS A .tsx FILE AND NOT INLINE IN Public.astro. AppBar's `logo`, `nav`
// and `actions` are ReactNode props, and an .astro file cannot supply one. Astro
// markup written in a prop position compiles to a RenderTemplateResult
// ({htmlParts, expressions, error}), which React cannot render — the build dies
// with "Objects are not valid as a React child". Only the default slot is
// converted for you. probe/static.astro documents the same trap and works around
// it by passing a plain STRING to `nav`, which is fine for a fixture and is not
// fine here: the active route needs its own element with an underline, and the
// theme toggle needs to be a circle rather than a word. So the JSX lives in a
// React module and .astro renders that module instead.
//
// It carries NO hydration directive at its call site, so Astro server-renders it
// to plain HTML and the route still ships zero framework JS. Being a .tsx file
// does not cost anything; being a hydrated one would.
//
// NOTE TO ANYONE EDITING: never write the hydration directive's own name here,
// in code OR in a comment — not even to say it is absent. The acceptance check
// is a plain grep for that token and it cannot tell a directive from prose, so a
// comment naming it turns this file's own tripwire red. Say "hydration
// directive" and let the reader infer the spelling. Plans 01, 04 and 07 each hit
// this once, and the first draft of this very paragraph hit it again.

import { AppBar } from "@akhil-saxena/design-system";

export type PublicRoute = "work" | "photos" | "home" | "none";

const linkBase: React.CSSProperties = {
	fontFamily: "var(--font-body)",
	fontSize: "var(--text-base)",
	fontWeight: 500,
	color: "var(--ink-3)",
	textDecoration: "none",
	paddingBottom: 2,
	borderBottom: "1.5px solid transparent",
};

// The ivory nav marked the active route with its primary-ink value plus a 1.5px
// underline in the same colour. On charcoal the ink flips to --ink and the
// underline goes with it; the inactive links are --ink-3, the AAA muted step,
// rather than the ivory muted grey — which measured 3.17:1 against its own page
// and was decorative grey doing a text job.
//
// No ivory hex is spelled anywhere in this file, and none should be. The guard
// is a grep and cannot tell a rule from prose quoting one, so the convention is
// to name the ROLE the value had and the ratio it achieved.
const linkActive: React.CSSProperties = {
	...linkBase,
	color: "var(--ink)",
	borderBottomColor: "var(--ink)",
};

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
	return (
		<a href={href} style={active ? linkActive : linkBase} aria-current={active ? "page" : undefined}>
			{label}
		</a>
	);
}

export default function PublicNav({ active = "none" }: { active?: PublicRoute }) {
	return (
		<AppBar
			className="pub-appbar"
			logo={
				<a
					href="/"
					style={{
						fontFamily: "var(--font-body)",
						fontWeight: 700,
						fontSize: "var(--text-md)",
						color: "var(--ink)",
						textDecoration: "none",
					}}
				>
					akhil saxena
				</a>
			}
			nav={
				<>
					<NavLink href="/work" label="work" active={active === "work"} />
					<NavLink href="/photos" label="photographs" active={active === "photos"} />
				</>
			}
			actions={
				// The handoff's theme toggle. Sketched as a static, non-operative
				// affordance: the toggle's behaviour is PUB-09's in Phase 5, and wiring
				// it here would cost a hydrated island — about 177 KB gzip while DS-09
				// tree-shaking fails — to review a glyph. Its border is --wire and not
				// --rule: it is an interactive control whose border is its only
				// boundary, so WCAG 1.4.11's 3:1 applies (Rule C-3). The ivory original
				// used its single control-border grey at about 1.4:1 for the same job.
				<span
					aria-hidden="true"
					style={{
						width: 36,
						height: 36,
						border: "1px solid var(--wire)",
						borderRadius: "50%",
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "var(--text-base)",
						color: "var(--ink-3)",
					}}
				>
					☾
				</span>
			}
		/>
	);
}
