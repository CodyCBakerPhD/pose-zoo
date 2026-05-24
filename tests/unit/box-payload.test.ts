import { describe, it, expect } from "vitest";
import { buildBoxPayload, normaliseBox, clampBox } from "../../src/box-payload.ts";

const VIDEO_URL = "https://example.com/video.mp4";
const META = { fps: 30, totalFrames: 100, width: 640, height: 480 };

describe("buildBoxPayload", () => {
    it("emits a null box and zeroes when nothing is drawn / no meta", () => {
        const payload = buildBoxPayload({
            videoUrl: VIDEO_URL,
            frameIndex: 0,
            videoMeta: null,
            box: null,
            now: () => "2024-01-02T03:04:05.000Z",
        });
        expect(payload).toEqual({
            video_url: VIDEO_URL,
            frame_index: 0,
            total_frames: 0,
            fps: 0,
            frame_width: 0,
            frame_height: 0,
            timestamp: "2024-01-02T03:04:05.000Z",
            box: null,
        });
    });

    it("includes the drawn box and copies meta fields", () => {
        const payload = buildBoxPayload({
            videoUrl: VIDEO_URL,
            frameIndex: 7,
            videoMeta: META,
            box: { x: 10, y: 20, width: 100, height: 50 },
            now: () => "2024-01-02T03:04:05.000Z",
        });
        expect(payload).toMatchObject({
            video_url: VIDEO_URL,
            frame_index: 7,
            total_frames: 100,
            fps: 30,
            frame_width: 640,
            frame_height: 480,
            box: { x: 10, y: 20, width: 100, height: 50 },
        });
    });

    it("clamps a box that runs off the right/bottom edges to the frame bounds", () => {
        const payload = buildBoxPayload({
            videoUrl: VIDEO_URL,
            frameIndex: 0,
            videoMeta: META,
            // Starts inside, extends past the right & bottom edges.
            box: { x: 600, y: 400, width: 200, height: 200 },
            now: () => "2024-01-02T03:04:05.000Z",
        });
        // Width is clipped to 640 - 600 = 40; height to 480 - 400 = 80.
        expect(payload.box).toEqual({ x: 600, y: 400, width: 40, height: 80 });
    });
});

describe("normaliseBox", () => {
    it("handles a drag from top-left to bottom-right", () => {
        expect(normaliseBox({ x: 10, y: 20 }, { x: 50, y: 80 })).toEqual({
            x: 10,
            y: 20,
            width: 40,
            height: 60,
        });
    });

    it("handles a drag from bottom-right back to top-left (swap)", () => {
        expect(normaliseBox({ x: 50, y: 80 }, { x: 10, y: 20 })).toEqual({
            x: 10,
            y: 20,
            width: 40,
            height: 60,
        });
    });

    it("produces a zero-area rectangle for a stationary click", () => {
        expect(normaliseBox({ x: 10, y: 10 }, { x: 10, y: 10 })).toEqual({
            x: 10,
            y: 10,
            width: 0,
            height: 0,
        });
    });
});

describe("clampBox", () => {
    it("is a no-op when the box is inside the frame", () => {
        expect(clampBox({ x: 10, y: 20, width: 100, height: 50 }, META)).toEqual({
            x: 10,
            y: 20,
            width: 100,
            height: 50,
        });
    });

    it("clamps negative origins to zero", () => {
        // Starts at -5 with width 50 → inside-frame portion is (0, 0, 45, 45).
        expect(clampBox({ x: -5, y: -5, width: 50, height: 50 }, META)).toEqual({
            x: 0,
            y: 0,
            width: 45,
            height: 45,
        });
    });

    it("returns a copy unchanged when meta is null", () => {
        const input = { x: -10, y: -10, width: 50, height: 50 };
        const out = clampBox(input, null);
        expect(out).toEqual(input);
        expect(out).not.toBe(input);
    });
});
