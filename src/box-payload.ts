/**
 * Pure builder for the box-mode JSON payload. Mirrors the style of
 * `payload.ts` so the box page has the same shape of `videoUrl`,
 * `frameIndex`, `videoMeta`, plus a single `box` field — and so the
 * payload can be exercised by unit tests under `tests/unit/`.
 *
 * Box mode (see issue #7) is not a quality classification: the user
 * draws the rectangular bounding box that fully contains the subject.
 * The export is a simple JSON document, not a `.slp` training file.
 */
import type { VideoMeta } from "./payload.js";

/** Axis-aligned rectangle in original-video pixel space, top-left origin. */
export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface BoxPayload {
    video_url: string;
    frame_index: number;
    total_frames: number;
    fps: number;
    frame_width: number;
    frame_height: number;
    timestamp: string;
    /** `null` when the user has not drawn a box on this frame yet. */
    box: Box | null;
}

export interface BuildBoxPayloadOptions {
    videoUrl: string;
    frameIndex: number;
    videoMeta: VideoMeta | null;
    box: Box | null;
    /** Defaults to `new Date().toISOString()`. Injected for deterministic tests. */
    now?: () => string;
}

/**
 * Build the box-mode JSON payload. Box coords are clamped into the
 * frame's pixel bounds when `videoMeta` is provided so downstream
 * consumers never see a box that runs off the image.
 */
export function buildBoxPayload(opts: BuildBoxPayloadOptions): BoxPayload {
    const now = opts.now ?? (() => new Date().toISOString());
    return {
        video_url: opts.videoUrl,
        frame_index: opts.frameIndex,
        total_frames: opts.videoMeta?.totalFrames ?? 0,
        fps: opts.videoMeta?.fps ?? 0,
        frame_width: opts.videoMeta?.width ?? 0,
        frame_height: opts.videoMeta?.height ?? 0,
        timestamp: now(),
        box: opts.box ? clampBox(opts.box, opts.videoMeta) : null,
    };
}

/**
 * Normalise the two endpoints of a click-and-drag into a positive-area
 * rectangle. Either point may be the start of the drag.
 */
export function normaliseBox(a: { x: number; y: number }, b: { x: number; y: number }): Box {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const width = Math.abs(a.x - b.x);
    const height = Math.abs(a.y - b.y);
    return { x, y, width, height };
}

/**
 * Clamp a box to lie within `[0, width) × [0, height)`. Returns the
 * input unchanged if `meta` is null. Boxes with zero area are still
 * returned (so the JSON faithfully reports what the user drew); the
 * caller can guard against zero-area boxes if needed.
 */
export function clampBox(box: Box, meta: VideoMeta | null): Box {
    if (!meta) return { ...box };
    const x0 = Math.max(0, Math.min(meta.width, box.x));
    const y0 = Math.max(0, Math.min(meta.height, box.y));
    const x1 = Math.max(0, Math.min(meta.width, box.x + box.width));
    const y1 = Math.max(0, Math.min(meta.height, box.y + box.height));
    return {
        x: Math.min(x0, x1),
        y: Math.min(y0, y1),
        width: Math.abs(x1 - x0),
        height: Math.abs(y1 - y0),
    };
}
