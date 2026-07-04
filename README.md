# VuePlay — DPDP Teen Consent Prototype

Clickable prototype for the Vedantu PM case study: how a YouTube-style video
platform should handle consent and data for under-18 users under India's
DPDP Act, 2023.

> Note on branding: this is an original concept product ("VuePlay"), not a
> literal YouTube clone. It's styled to evoke a familiar video-platform UI
> (dark app chrome, red primary accent, video-grid feed) so it reads
> instantly as "a YouTube-like app" — without reproducing YouTube's actual
> logo, wordmark, or trademarked UI, which keeps the submission clean of any
> IP concerns while still making the case study obvious.

## Files

```
vueplay-prototype/
├── index.html   → structure only, no inline styles/scripts
├── style.css    → design system (CSS variables) + all component styles
├── script.js    → app state, screen renderer, recommendation engine,
│                  and the "Ask Compliance" RAG copilot
└── README.md    → this file
```

## How to run it

No build step, no dependencies. Just open `index.html` in a browser, or for
a local dev server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## What's actually implemented (not just mocked)

1. **Full consent flow** — sign-up → age declaration → minor detection →
   parental verification (DigiLocker-style) → itemised granular consent →
   confirmation → home feed → privacy dashboard.
2. **Content-based recommendation engine** (`script.js`, `contextualFeed()`)
   — real cosine-similarity ranking over video tag vectors. This is the
   answer to "how do you personalise without behavioural profiling."
3. **Before/After DPDP toggle** on the feed screen — flips between the
   non-compliant status-quo experience (targeted ad, profiling-based
   ranking) and the proposed compliant experience, so the gap DPDP creates
   is visible, not just asserted in a slide.
4. **Per-recommendation explainability** — each card shows *why* it was
   recommended (shared content tags), a lightweight nod to explainable AI.
5. **"Ask Compliance" copilot** — a RAG-lite feature: a 12-provision DPDP
   corpus (`dpdpCorpus` in `script.js`), a keyword-overlap retriever
   (`retrieve()`), and a **live call to the Claude API** grounded only on
   the retrieved provisions, with inline citations back to specific
   sections. Retrieval is keyword-based on purpose — a static front-end
   file can't run FAISS/embeddings; in production this would reuse a
   semantic-chunking + vector-search pipeline.
6. **Consent ledger** — every action in the app writes a timestamped,
   auditable log entry (the artifact DPDP requires fiduciaries be able to
   produce).

## Setting up real Google Sign-In (optional but recommended)

The "Continue with Google" button is wired to real Google Identity Services.
Without setup it gracefully falls back to a mock identity, so the demo
never breaks — but real sign-in takes about 5 minutes:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create
   a project (any name, e.g. "vueplay-prototype").
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID.**
3. Application type: **Web application**.
4. Under **Authorized JavaScript origins**, add:
   - `http://127.0.0.1:5500` (or whatever local dev port you use)
   - `https://YOUR-GITHUB-USERNAME.github.io` (once you know your Pages URL)
5. Copy the generated **Client ID** (ends in `.apps.googleusercontent.com`).
6. Open `script.js`, find this line near the top:
   ```js
   const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
   ```
   and paste your real Client ID in.
7. Redeploy. Clicking "Continue with Google" now opens a real Google
   account picker and pulls your real name/email into the flow.

## Deploying with GitHub Pages (simple, and what you'll submit)

1. Create a new GitHub repo (public), e.g. `vueplay-dpdp-prototype`.
2. Upload `index.html`, `style.css`, `script.js` to the repo root (drag-and-drop
   on github.com works fine, no git CLI needed).
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment," set **Source: Deploy from a branch**,
   branch: `main`, folder: `/ (root)` → **Save**.
5. Wait ~1 minute, then your link will be live at:
   `https://YOUR-GITHUB-USERNAME.github.io/vueplay-dpdp-prototype/`
6. If you set up Google Sign-In, go back and add that exact URL to your
   OAuth client's Authorized JavaScript origins (step 4 above), or the
   Google button will silently fall back to the mock identity.

That URL is what you submit as your clickable prototype link.

## Talking points for the discussion round

- Why content-based filtering satisfies "personalised recommendations"
  without violating DPDP Section 9's ban on behavioural profiling of minors.
- Why retrieval here is keyword-based, and what you'd change for production.
- Why the app chrome is dark (matches user expectation of a video platform)
  but consent/legal screens stay light (legibility and trust cues matter
  more than brand consistency in a compliance-critical flow).
