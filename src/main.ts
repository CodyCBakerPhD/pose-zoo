/**
 * Boot script for the labeling page. Wires together the DOM, the
 * labeler module, and the sleap-io.js-backed video loader.
 */
import "./styles.css";
import { createLabeler } from "./labeler.js";
import { loadVideoModel, refreshTotalFrames, VIDEO_URL, type VideoModel } from "./video.js";
import { buildPayload, buildLabelsObject, pickRandomFrame, type VideoMeta } from "./payload.js";

// ---- DOM ----
const canvas = document.getElementById("frameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const canvasContainer = document.getElementById("canvasContainer") as HTMLElement;
const initialLoading = document.getElementById("initialLoading") as HTMLElement;
const labelPalette = document.getElementById("labelPalette") as HTMLElement;
const jsonOutput = document.getElementById("jsonOutput") as HTMLElement;
const frameInfo = document.getElementById("frameInfo") as HTMLElement;
const statusMsg = document.getElementById("statusMsg") as HTMLElement;
const newFrameBtn = document.getElementById("newFrameBtn") as HTMLButtonElement;
const resetBtn = document.getElementById("resetBtn") as HTMLButtonElement;
const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
const serverUrlInput = document.getElementById("serverUrl") as HTMLInputElement;
const apiSecretInput = document.getElementById("apiSecret") as HTMLInputElement;

// ---- App state ----
let videoModel: VideoModel | null = null;
let frameIndex = 0;
let displayScale = 1;

const getVideoMeta = (): VideoMeta | null => videoModel?.meta ?? null;

const labeler = createLabeler({
    canvas,
    canvasContainer,
    labelPalette,
    getDisplayScale: () => displayScale,
    getVideoMeta,
});

labeler.onChange(updateJSON);

function setControlsEnabled(enabled: boolean) {
    newFrameBtn.disabled = !enabled;
    resetBtn.disabled = !enabled;
    submitBtn.disabled = !enabled;
}

function updateJSON() {
    jsonOutput.textContent = JSON.stringify(
        buildPayload({
            videoUrl: VIDEO_URL,
            frameIndex,
            videoMeta: getVideoMeta(),
            placed: labeler.placed,
        }),
        null,
        2
    );
}

function showStatus(type: "info" | "success" | "error", message: string) {
    statusMsg.className = type;
    statusMsg.textContent = message;
    statusMsg.style.display = "block";
    if (type !== "error") {
        setTimeout(() => {
            if (statusMsg.textContent === message) {
                statusMsg.style.display = "none";
            }
        }, 5000);
    }
}

async function showFrame(idx: number) {
    if (!videoModel) return;
    setControlsEnabled(false);
    frameInfo.textContent = `Decoding frame ${idx}…`;

    const bitmap = await videoModel.video.getFrame(idx);
    if (bitmap == null) {
        showStatus("error", `Backend returned no data for frame ${idx}.`);
        initialLoading.style.display = "none";
        setControlsEnabled(true);
        return;
    }

    const meta = videoModel.meta;
    const w = (bitmap as ImageData | ImageBitmap).width ?? meta.width;
    const h = (bitmap as ImageData | ImageBitmap).height ?? meta.height;
    canvas.width = w;
    canvas.height = h;
    meta.width = w;
    meta.height = h;

    ctx.clearRect(0, 0, w, h);
    if (typeof ImageBitmap !== "undefined" && bitmap instanceof ImageBitmap) {
        ctx.drawImage(bitmap, 0, 0, w, h);
    } else if (bitmap instanceof ImageData) {
        ctx.putImageData(bitmap, 0, 0);
    }

    const maxDisplayWidth = 720;
    const scale = Math.min(maxDisplayWidth / w, 1);
    displayScale = scale;
    canvas.style.width = `${w * scale}px`;
    canvas.style.height = `${h * scale}px`;

    frameIndex = idx;
    labeler.clearAll();
    canvasContainer.style.display = "inline-block";
    initialLoading.style.display = "none";

    frameInfo.textContent =
        `Frame ${idx} / ${meta.totalFrames}  ` + `(${w}×${h} @ ${meta.fps.toFixed(2)} fps)`;
    updateJSON();
    setControlsEnabled(true);
}

async function loadRandomFrame() {
    if (!videoModel) return;
    const total = await refreshTotalFrames(videoModel);
    if (total < 2) {
        console.warn(`Backend reports ${total} frame(s); falling back to frame 0.`);
        await showFrame(0);
        return;
    }
    await showFrame(pickRandomFrame(total, frameIndex));
}

// ---- Buttons ----
newFrameBtn.addEventListener("click", () => {
    loadRandomFrame().catch((err: Error) => {
        console.error(err);
        showStatus("error", `Failed to decode frame: ${err.message}`);
        setControlsEnabled(true);
    });
});

resetBtn.addEventListener("click", () => {
    labeler.clearAll();
    updateJSON();
});

submitBtn.addEventListener("click", async () => {
    if (labeler.placed.size === 0) {
        showStatus("error", "No labels placed yet.");
        return;
    }
    const url = serverUrlInput.value.trim();
    if (!url) {
        showStatus("error", "Please enter a server endpoint.");
        return;
    }

    // Materialise a sleap-io.js Labels object too — even though we
    // only POST JSON for now, this confirms the data is serialisable
    // through the v2 model.
    const meta = getVideoMeta();
    if (meta) {
        try {
            buildLabelsObject({
                videoUrl: VIDEO_URL,
                frameIndex,
                videoMeta: meta,
                placed: labeler.placed,
                skeleton: labeler.skeleton,
            });
        } catch (err) {
            console.error("Labels build failed:", err);
        }
    }

    showStatus("info", "Sending…");
    try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const secret = apiSecretInput.value.trim();
        if (secret) headers["Authorization"] = `Bearer ${secret}`;
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(
                buildPayload({
                    videoUrl: VIDEO_URL,
                    frameIndex,
                    videoMeta: meta,
                    placed: labeler.placed,
                })
            ),
        });
        const respText = await response.text();
        if (response.ok) {
            showStatus(
                "success",
                `✅ Submitted (${response.status}). ${respText.substring(0, 120)}`
            );
        } else {
            showStatus(
                "error",
                `❌ ${response.status} ${response.statusText}: ${respText.substring(0, 200)}`
            );
        }
    } catch (err) {
        showStatus("error", `❌ Network error: ${(err as Error).message}`);
    }
});

// ---- Boot ----
updateJSON();
(async () => {
    try {
        videoModel = await loadVideoModel();
        await loadRandomFrame();
    } catch (err) {
        console.error(err);
        initialLoading.innerHTML = `❌ Failed to load video via sleap-io.js: ${(err as Error).message}`;
        showStatus("error", (err as Error).message);
    }
})();
