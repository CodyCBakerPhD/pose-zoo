# Pose Zoo

Inspired by Galaxy Zoo, but for pose estimation.

Random frames are pulled from a video hosted on EMBER and presented for keypoint labeling.
This project uses the new v2 [`@talmolab/sleap-io.js`](https://github.com/talmolab/sleap-io.js) library and its browser-side data model (`Skeleton`, `Instance`, `Point`, `LabeledFrame`, `Labels`) plus the `loadVideo` / `Mp4BoxVideoBackend` video reader.
See <https://iojs.sleap.ai/latest/#sleap-iojs> for the upstream docs.

## Layout

- `src/` — Vite-served labeling page. `index.html` is the entry
  point; `main.ts` boots the app and wires up `skeleton.ts`,
  `payload.ts`, `video.ts`, and `labeler.ts`. `@talmolab/sleap-io.js`
  is bundled from npm — no `esm.sh` import map.
- `configs/` — Vite, Vitest, Playwright, TypeScript and Prettier
  configs. Tools are invoked via the `npm` scripts in
  `package.json` rather than directly.
- `tests/unit/` — Vitest unit tests for pure modules (`payload.ts`,
  `skeleton.ts`).
- `tests/integration/` — Playwright tests that boot the Vite dev
  server and assert against the rendered DOM.
- `backend.py` — Flask + flask-restx annotation receiver. Validates
  the payload, writes it as a JSON file inside a sparse checkout of
  a target GitHub repository, and commits/pushes.
- `.github/workflows/preview.yml` — builds the site with
  `npm run build` and deploys a per-PR static preview of `dist/` to
  the `gh-pages` branch.
- `.github/workflows/test.yml` — runs the Vitest + Playwright
  suites on every PR.

## Run locally

```bash
# Install dependencies
npm install

# Serve the labeling page (Vite dev server with HMR)
npm run dev
# → open http://localhost:5173/

# In another terminal, run the receiver
pip install -r requirements.txt
python backend.py
# → http://localhost:5000/docs/
```

Then point the labeling page's "Server endpoint" at `http://localhost:5000/api/annotations` and provide the API secret you configured via the `API_SECRET` environment variable.

## npm scripts

| Script                  | What it does                                             |
| ----------------------- | -------------------------------------------------------- |
| `npm run dev`           | Start the Vite dev server with HMR.                      |
| `npm run build`         | Bundle the labeling page into `dist/` for deployment.    |
| `npm run preview`       | Preview the built `dist/` locally.                       |
| `npm run typecheck`     | Run `tsc --noEmit` against `src/`, `tests/`, `configs/`. |
| `npm test`              | Run the Vitest unit suite.                               |
| `npm run test:coverage` | Run Vitest with v8 coverage.                             |
| `npm run test:e2e`      | Run the Playwright integration suite.                    |
| `npm run format`        | Format the project with Prettier.                        |
