import { describe, it, expect } from "vitest";
import { buildSkeleton, LABEL_DEFINITIONS, EDGE_DEFINITIONS } from "../../src/skeleton.ts";

describe("buildSkeleton", () => {
    it("creates a Skeleton with one Node per label definition", () => {
        const sk = buildSkeleton();
        expect(sk.nodes.map((n) => n.name)).toEqual(LABEL_DEFINITIONS.map((d) => d.id));
    });

    it("includes every declared edge", () => {
        const sk = buildSkeleton();
        const pairs = sk.edges.map((e) => [e.source.name, e.destination.name]);
        expect(pairs).toEqual(EDGE_DEFINITIONS.map((p) => [p[0], p[1]]));
    });

    it("exposes the six required pozoo labels", () => {
        const ids = new Set(LABEL_DEFINITIONS.map((d) => d.id));
        for (const required of [
            "left_front_paw",
            "right_front_paw",
            "left_hind_paw",
            "right_hind_paw",
            "nose",
            "tail_base",
        ]) {
            expect(ids.has(required)).toBe(true);
        }
    });
});
