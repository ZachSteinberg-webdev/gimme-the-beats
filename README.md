# Gimme The Beats

Gimme The Beats is a browser-based drum machine / groovebox. It runs a multi-track, 16/32/64/128-step sequencer in real time, lets a user build patterns with drum samples, tweak mix controls (volume, pan, mute/solo, tempo), and save/load those patterns to/from their account. It’s built as a full-stack React + Express + MongoDB app, deployed as a live production service. You can open it and start tapping drums immediately in guest mode with no signup, then create an account later and keep your work.

The point of this project wasn to build a mini-DAW — timing-stable playback, a transport bar, persistent projects, and an interface that feels like physical hardware.

---

## High-Level Overview

- Frontend: React (Vite build), custom CSS modules, Web Audio API scheduling
- Backend: Node.js / Express API with JWT auth
- Database: MongoDB Atlas via Mongoose
- Deployed as: Node/Express server (serves both the API and the built frontend) running behind a CDN, talking to MongoDB Atlas
- User model supports both:
  - Guest sessions (try it instantly, no account)
  - Registered accounts (save patterns / recall later)
- Core UX:
  - A 16/32/64/128-step grid per track
  - Play / Stop transport
  - BPM control
  - Per-track mute/solo
  - Per-track gain/pan/pitch/decay/reverb/delay knobs
  - Pattern save / load

Under the hood, I schedule audio with a lookahead clock so it stays in sync instead of relying on naive setTimeout loops.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
   - [Frontend / Audio Engine](#frontend--audio-engine)
   - [Backend / API](#backend--api)
   - [Database Models](#database-models)
   - [Auth / Session Model](#auth--session-model)
   - [Styling / UI Layer](#styling--ui-layer)
2. [Core Flow](#core-flow)
   - [Step Sequencer](#step-sequencer)
   - [Transport Bar](#transport-bar)
   - [Pattern Save / Load](#pattern-save--load)
   - [Guest Mode → Account Upgrade](#guest-mode--account-upgrade)
3. [Security / Reliability / Abuse Handling](#security--reliability--abuse-handling)
   - [JWT / Cookies](#jwt--cookies)
   - [Input Validation & Sanitization](#input-validation--sanitization)
   - [Rate Limiting / Abuse Surfaces](#rate-limiting--abuse-surfaces)
   - [Static Sample Safety](#static-sample-safety)
4. [Operational Notes](#operational-notes)
   - [Environment Variables / Secrets](#environment-variables--secrets)
   - [Build / Deploy](#build--deploy)
   - [Timing Stability / Audio Scheduling](#timing-stability--audio-scheduling)
   - [Responsive Layout](#responsive-layout)
   - [Data Retention](#data-retention)
5. [What Makes This Interesting](#what-makes-this-interesting)

---

## Tech Stack

### Frontend / Audio Engine

- **React + Vite**
  - The UI is componentized: transport bar, sequencer grid, mixer strip per track, pattern browser, etc.
  - I use React state for UI intent (is step [row,col] active? is track muted?) and a separate scheduler layer for precise audio timing.
  - Routing is handled client-side. Production build is static assets served by Express.

- **Web Audio API**
  - I create one `AudioContext`, pre-load all drum samples (kick, snare, hats, etc.) into `AudioBuffer`s, and trigger them with very accurate `audioContext.currentTime` scheduling.
  - Instead of “play on click,” I schedule future notes slightly ahead (lookahead scheduling). That avoids the classic browser timing drift you get if you trust `setInterval` at 16ms.
  - Each step fires as an audio node chain:
    - bufferSource → gainNode (per-step velocity / per-track volume) → stereoPannerNode → destination.
  - Mixer actions (mute/solo/pan/volume) are applied in real time by adjusting those gain/pan nodes, not by reloading audio.

- **UI Interactions**
  - Click or tap a step to toggle it active/inactive for that sound.
  - Click and drag across steps to paint or erase multiple hits.
  - Visual playhead “ticks” across 16 steps while transport is running.
  - Knobs are custom SVG/CSS knobs. Dragging vertically changes the value (e.g. volume or pan). I store knob angles in component state and apply them to the corresponding gain/pan node.

### Backend / API

- **Express server**
  - Serves `/api/*` routes for auth, pattern CRUD, user profile data.
  - Serves the Vite production build (the compiled React app) for all non-API GET routes.
  - Uses common middleware: 
    	- `app.use(helmet());`
    	- `app.use(express.json({ limit: '10kb' }));`
    	- `app.use(express.urlencoded({ extended: true }));`
    	- `app.use(mongoSanitize());`
    	- `app.use(cookieParser(process.env.COOKIE_SECRET));`
    	- `app.use(cors({ origin: FRONTEND_URL, credentials: true }))   // loosened in dev only`

- **Controllers**
  - Auth controller: register / login / logout / getCurrentUser
  - Pattern controller: savePattern / loadPatterns / deletePattern / renamePattern
  - User controller: update display name, update preferred BPM default, etc.

- **Error handling**
  - Each controller uses explicit try `{ ... } catch (err) { ... }` blocks. If something goes wrong in a route (bad credentials, invalid pattern payload, DB write failure, etc.), I handle it in that controller and send a response directly.
  - I return JSON with both an HTTP status code and a predictable response body. For example:
		- Auth failures return `401` with a payload shaped like `{ success: false, errors: ["Invalid email or password"] }`.
		- Validation problems (like missing patternName, BPM out of range, wrong step array length, etc.) return `400` with `{ success: false, errors: ["patternName is required", "bpm must be between 40 and 240"] }`.
		- General server errors (like a Mongo write error) return `500` with `{ success: false, errors: ["Something went wrong. Please try again."] }`.
	- The important part is consistency: the frontend always gets a JSON object with `success: false` and an `errors` array. That means the React UI can reliably display inline feedback next to the form or control that triggered the request, without guessing at the format or parsing HTML.

### Database Models

MongoDB Atlas via Mongoose. Core collections:

1. **User**
   - `userName`
   - `userEmail` (unique)
   - `passwordHash` (bcrypt)
   - UI / audio preferences:
     - `defaultBpm`
     - `swingAmount`
     - `meter` (e.g. 4/4 for now)
     - UI chrome prefs (light/dark, show transport labels, etc.)

2. **Project**
   - `owner` (ObjectId → User)
   - `patternName`
   - `bpm`
   - `swing`
   - `tracks`: array of track objects, where each track stores:
     - `sampleId` (e.g. "kick-808", "snare-tight", "hat-closed")
     - `steps`: length-16 boolean/intensity array
     - `volume` (0.0–1.0)
     - `pan` (-1.0..1.0)
     - `mute` (boolean)
     - `solo` (boolean)
   - `createdAt`, `updatedAt`
   - I index `(owner, patternName)` with `{ unique: true }` so one user can't create the same-named pattern 15 times. That lets me surface “pattern name already exists” cleanly.

3. **SampleMetadata** (optional / lightweight)
   - Keyed by `sampleId`
   - Holds:
     - Human-readable label (“808 Kick”)
     - Category (“Kick”, “Snare”, etc.)
     - File path for that sample on disk / CDN
   - This lets the frontend build a kit selector without hardcoding every file path.

### Auth / Session Model

- **JWT auth**
  - Login returns a signed JWT that I set as an `httpOnly`, `SameSite=Strict` cookie.
  - The cookie isn’t readable from JS, which protects the token from basic XSS scraping.
  - Each token encodes the user’s ID and expires on a short horizon (e.g. 24h). On expiration, the frontend forces a silent re-login.

- **bcrypt**
  - I hash user passwords with bcrypt (salted) before saving.
  - I never store plaintext credentials. I also never send the hash to the frontend.

- **Guest mode**
  - If you haven’t logged in, I still generate a “guest profile” in memory on the frontend:
    - Your unsaved working pattern
    - Your current BPM / swing
    - Knob positions
  - I also keep that in `localStorage` so a refresh doesn’t wipe your work.
  - When you create an account, I `POST` that guest data to `/api/pattern/migrate` and persist it under the new user.

This is the same idea I use in my other apps: “try it now, keep your work later.”

### Styling / UI Layer

- **CSS Modules**
  - Every major UI surface (TransportBar, MixerStrip, StepGrid, PatternList) ships with its own `.module.css`.
  - I purposely avoid global CSS bleed so I can iterate on component visuals without accidentally nuking the layout in other areas.

- **Hardware-inspired UI**
  - Knobs render with subtle shading and an angle indicator.
  - Mute/Solo buttons look like physical switches.
  - Steps in the sequencer light up with a hardware “LED pad” vibe when active and pulse when the playhead reaches them.

---

## Core Flow

### Step Sequencer

- The grid is 16/32/64/128 steps wide per track.
- Each row is one sound (kick, snare, hat, etc.).
- Clicking a cell toggles that hit on/off.
- The sequencer loop runs in constant time at the chosen BPM. I calculate step duration as:

    `stepDurationSeconds = (60 / bpm) / 4`

  (In 4/4 time, 16 steps represent 4 beats, so each step = sixteenth note.)

- I highlight the “current step” in the UI so you can see the groove.

- Swing support:
  - Swing offsets every other 16th note forward in time by a percentage of the step length.
  - I don’t move the visual grid; I shift the scheduled playback time when I enqueue notes.

### Transport Bar

- Top-level “transport” component controls global playback state.
  - Play / Stop
  - BPM field (number input with drag-to-adjust support)
  - Swing amount (knob / numeric)
  - Save / Pattern selector / Load

- BPM changes apply immediately. When you spin the BPM knob or type in a new BPM, I update both:
  - The internal playback scheduler interval
  - The pattern’s “working BPM,” so if you save, that tempo is captured in the pattern document

- Transport state is global. I expose it via a context provider so all children (sequencer grid, mixer controls, etc.) know if we’re playing, what the BPM is, and what step index is “live” right now.

### Pattern Save / Load

- “Save Pattern” calls something like:

    ```
    POST /api/patterns/save
    {
        patternName,
        bpm,
        swing,
        tracks: [
            {
                sampleId: "kick-808",
                steps: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],
                volume: 0.82,
                pan: -0.10,
                mute: false,
                solo: false
            },
            ...
        ]
    }
    ```

- On the server:
  - I verify auth (JWT). If the request has no valid token, I reject with `401` instead of silently creating orphan data.
  - I validate that the payload isn’t enormous (16 steps per track, max track count).
  - I sanitize `patternName` (trim, limit length, strip weird control chars).
  - I either insert a new Pattern doc or update an existing one if the user is saving over the same name.

- “Load Pattern”:
  - I GET `/api/patterns/list` to render all patterns this user owns.
  - Selecting one pulls it into the sequencer state:
    - I set all track rows, knob positions, mutes/solos, BPM, and swing to match the loaded pattern.
    - The UI updates instantly.

- “Delete Pattern” does a soft confirmation modal (“Are you sure? This can’t be undone.”), then hits `/api/patterns/delete/:patternId` to remove it for that user.

### Guest Mode → Account Upgrade

- In guest mode:
  - Your current working pattern (even unsaved) is mirrored into `localStorage`.
  - TransportBar shows a “Sign up to save” CTA instead of the normal Save button.
  - You can still tweak BPM, swing, and steps and hear everything. Audio is not limited.

- When you register:
  1. I create the User in Mongo (bcrypt-hashed password).
  2. I issue a JWT cookie.
  3. I POST your current working pattern(s) to `/api/patterns/migrateFromGuest`.
  4. The backend persists them as first-class Pattern docs owned by you.
  5. I clear the guest localStorage keys and flip the UI into “logged-in” mode.

That flow is intentional. You never lose work you did “for fun” before you decided to make an account.

---

## Security / Reliability / Abuse Handling

### JWT / Cookies

- On login:
  - I sign a JWT with `JWT_SECRET`.
  - I set it as an `httpOnly`, `SameSite=Strict` cookie.
  - The token encodes only what I need (user id, maybe username) and a short TTL.
  - I do not store raw passwords in the token, obviously.

- On each authenticated API call:
  - I read the cookie server-side.
  - I verify signature and expiration.
  - I attach `req.user` with the Mongo user id.
  - If verification fails, I return `401`.

- On logout:
  - I overwrite the cookie with an immediate-expiration version so the browser effectively discards it.

This keeps auth state off `localStorage` (which is script-readable and easier to steal via XSS).

### Input Validation & Sanitization

- I run `express.json({ limit: '10kb' })` so someone can’t upload a multi-megabyte payload claiming it’s “just a beat.”
- I run `express-mongo-sanitize()` globally to strip `$` and `.` in user-controlled keys, which blocks trivial NoSQL injection attempts.
- I validate each pattern server-side:
  - `patternName` length and characters
  - BPM range bounds (e.g. 40–240)
  - Swing range bounds (0–100%)
  - Track count (I cap tracks so you can’t POST 10,000 “tracks” and explode memory)
  - Step array length (must be 16/32/64/128)
- If validation fails, I throw a structured `400` with field-level errors so the frontend can highlight the bad input instead of silently failing.

### Rate Limiting / Abuse Surfaces

Places where rate limiting matters:

1. **Auth endpoints (register / login)**
   - To block brute-force password guessing.
   - To prevent someone from slamming register and polluting my DB with junk accounts.
   - I can enforce N attempts per IP per 15 minutes.

2. **Pattern save / delete**
   - A malicious script could hammer `/api/patterns/save` in a loop and bloat my Mongo storage.
   - Real users don’t save 200 patterns per minute.
   - I can cap “pattern writes per user per minute.”

3. **Sample metadata fetch**
   - If I expose `/api/samples` or similar to list available kits, I can rate-limit it to avoid becoming a de facto unauthenticated sample CDN browser.

This is “treat it like production,” even though it’s a personal project.

### Static Sample Safety

- Drum samples are static assets (WAV/MP3/OGG) in a controlled directory.
- I never let the client request an arbitrary file path like `../../etc/passwd`.
- When the frontend asks for a sample, it does it by known `sampleId`. On the server side I resolve `sampleId` against an allowlist map:

    ```
    {
        "kick-808": "samples/808/kick.wav",
        "snare-tight": "samples/808/snare.wav",
        ...
    }
    ```
    
  If the ID isn’t in that map, I `404`.

- Browser caching headers are set so samples can be cached aggressively by the client/CDN. That keeps playback snappy and reduces repeat bandwidth.

---

## Operational Notes

### Environment Variables / Secrets

I manage behavior using env vars. Typical ones:

- `MONGO_URI`
  MongoDB Atlas connection string.

- `JWT_SECRET`
  Secret for signing/verifying JWTs.

- `COOKIE_SECRET`
  Secret string passed to `cookie-parser`, used to sign cookies.

- `CORS_ORIGIN`
  Allowed frontend origin in dev. In production I set CORS to off / locked down.

- `PORT`
  Port Express listens on.

- `NODE_ENV`
  "development" or "production". Controls logging, CORS strictness, error detail, etc.

- `STATIC_SAMPLE_DIR` (optional)
  Base directory for drum kit audio files, if I want to swap kits or mount them off-disk vs bundling them.

None of these secrets is ever shipped to the browser. All privileged actions (saving patterns, listing user patterns) go through authenticated server routes.

### Build / Deploy

- **Local dev**

    ```
    npm install
    npm run dev
    ```

  I run the backend server (Express) and the Vite dev server together. Vite proxies `/api` to Express so the frontend can just call `/api/...` without hardcoding ports.

- **Production build**
    npm run build

  This runs Vite’s production build. The output `dist/` bundle (minified React app, hashed assets, CSS modules, audio UI, etc.) gets copied or served by Express.

- **Runtime**
  - One Node process serves:
    - Static frontend files
    - `/api` routes
  - MongoDB Atlas is used as the persistent store.
  - A CDN (e.g. Cloudflare) can sit in front:
    - TLS termination
    - Caching of static assets and drum samples
    - Basic bot filtering

This keeps infra simple: I ship one service, not a swarm of microservices.

### Timing Stability / Audio Scheduling

Web audio in a browser is tricky because `setInterval` drifts under CPU load. I treat this like real audio software:

- I maintain a “next note time” in seconds (`audioContext.currentTime` based).
- I run a short “scheduler loop” every ~25ms that:
  - Looks ahead e.g. 100ms into the future.
  - Queues any steps whose play time falls within that 100ms window.
  - Advances “next note time” based on BPM and swing.

- Each step is started with `bufferSource.start(scheduledTime)` instead of “start now.”
- The UI playhead is driven by React state updated on requestAnimationFrame, but audio timing is never driven by requestAnimationFrame. Audio schedule wins.

Result: playback sounds steady even if the tab is doing React re-renders or the devtools are open.

### Responsive Layout

- On desktop:
  - You see the full sequencer grid, mixer strips (volume/pan/mute/solo knobs/buttons), and transport across the top.
  - Pattern browser sits in a sidebar so you can load / rename quickly.

- On mobile:
  - TransportBar floats to the top (large tap targets).
  - Only a couple tracks are shown at once; you can swipe / tap arrows to switch which track row is visible.
  - Mixer controls get bigger knobs and stacked labels so your thumb can hit them without precision tapping.

- CSS modules isolate mobile overrides. I’m not relying on one giant global stylesheet; each component (TransportBar, MixerStrip, SequencerGrid) ships its own responsive rules.

The goal is “feels like a little groovebox,” not “a desktop DAW awkwardly shoved onto a phone.”

### Data Retention

- Guest data:
  - Lives in `localStorage` in the browser plus in-memory React state.
  - Includes unsaved pattern state (grid, BPM, swing, knob settings).
  - Gets offered for migration the moment you sign up.
  - After successful migration, I clear those localStorage keys.

- User data:
  - Lives in MongoDB (`Pattern` docs, `User` prefs).
  - Each pattern is owned by exactly one user.
  - If the account is deleted, I can drop all patterns for that user (simple `{ owner: userId }` deleteMany).
  - I don’t store raw IP addresses or audio recordings. I only store structured sequencing info (steps, names, control values).

---

## What Makes This Interesting

1. I wrote a real step sequencer with scheduled audio. Playback uses a short-horizon scheduler keyed to the audio clock, which is how serious browser drum machines avoid drift. This is closer to DAW behavior than to a tutorial “soundboard.”

2. I layered product thinking on top of audio.  
   - A transport bar with BPM, swing, play/stop, and pattern save.
   - Mixer-style per-track volume/pan/mute/solo knobs.
   - Visual playhead across 16 steps.
   - Named patterns you can save, reload, rename, and delete.
   - The UI feels like hardware, not just checkboxes.

3. I treat anonymous use as first-class.  
   You can open the app and start building a beat immediately with zero auth. I’ll remember what you did. If you later create an account, I migrate that work into MongoDB under your user. You don’t lose the groove you just built.

4. I use production-level security even though this is “just a beat machine.”  
   - JWTs are stored in httpOnly cookies with short TTLs.
   - Passwords are bcrypt-hashed.
   - I sanitize user input and cap payload sizes.
   - I block arbitrary file path fetches for samples.
   - I can attach per-route rate limiting to anything that can spam writes (auth, pattern save, etc.).

5. The UI is intentionally modular and clean.  
   Every big UI surface (transport bar, sequencer grid, knobs, etc.) is a React component with its own CSS module. I killed off ornamental clutter (like an earlier decorative accent line in `TransportBar.module.css`) so the final look feels like usable audio software, not a design exercise.

6. I think like an operator.  
   I considered:
   - Timing stability
   - Data migration from guest → account
   - Saving patterns in a normalized shape per user
   - Avoiding accidental DoS from spammy saves / signups
   - Serving static audio samples in a safe, cacheable way