// DS-09 tree-shaking fixture (MEASURE-1).
//
// The regression this measures: `@akhil-saxena/design-system` ships a single
// 334 KB barrel (`dist/index.js`) with NO per-component JS subpath exports.
// It statically imports @tiptap/*, lowlight, @dnd-kit/* and lucide-react at
// top level, so the open question is whether Rolldown can shake ProseMirror
// out when a consumer imports exactly one hook-free atom.
//
// This file is deliberately the smallest possible consumer: ONE named import
// from the barrel, one element rendered, no hooks, no state. Anything the
// bundle contains beyond `Chip` came from the barrel, not from this file.
//
// It is paired with `src/pages/probe/island.astro`, which renders it
// `client:load`. The directive is load-bearing: DS-09 is observable ONLY on a
// hydrated island. The sibling fixture `probe/static.astro` renders eight DS
// components with no directive and ships zero JS — that is a DIFFERENT claim
// (Claim 2), and conflating the two is Pitfall 2.

import { Chip } from "@akhil-saxena/design-system";

export default function ChipIsland() {
	return <Chip tone="default">Chip</Chip>;
}
