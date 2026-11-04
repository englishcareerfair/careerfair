# 🎙️ Career Fair: Every Career Speaks English

> **A high-craft, full-stack student career intelligence and spoken English evaluation platform.**  
> Designed for students (Class 8 & below, Class 9, Class 10+) and parents at **Kanakia International School Mira Road**.

Built for seamless deployment on **Cloudflare Pages** backed by **Cloudflare D1 (SQLite)**, **Cloudflare Pages Functions**, **ElevenLabs Speech API**, **Google Gemini AI API**, and browser native **Web Speech & Web Audio APIs**.

---

## 🌟 What This Platform Includes

### 1. 🎯 Careers Directory & Intelligence (32+ Pathways)
- Deep career profiles across **Medicine & Surgery, Commercial Aviation, Software Architecture, Corporate M&A Law, Civil Services (IFS/IAS), Defence (NDA), Broadcast Journalism, Luxury Hospitality, Venture Entrepreneurship, and Creative Writing**.
- For every career: Typical starting and peak compensation bands, required academic degrees, entrance tests, and critically: **Why English is the Superpower** (e.g. ICAO mandatory aviation phraseology, USMLE licensing, cross-examination advocacy, client standups, investor pitching).
- Interactive search, industry tags, and category filtering.

### 2. 🏛️ Colleges Explorer with Official Accreditations
- Verified academic standards across three key categories:
  - **Maharashtra Premier**: St. Xavier's Autonomous (`NAAC A+ 3.63`), Elphinstone College, Ramnarain Ruia (`NAAC A+ 3.70`), Fergusson College Pune (`NAAC A+ 3.62`), SPPU (`NAAC A+`), Symbiosis (`NAAC A++ 3.58`), TISS (`NAAC A++ 3.89`), IIT Bombay (`Institute of National Importance - INI`).
  - **Top Indian Universities & INIs**: Miranda House DU (`NIRF #1 Colleges in India`), St. Stephen's (`NIRF Top 15`), LSR (`NIRF #9`), NLSIU Bengaluru (`NIRF #1 Law · BCI Approved`), NALSAR Hyderabad (`NIRF #3 Law`), EFLU Hyderabad (`Central University of National Eminence in Languages`), AIIMS New Delhi (`NIRF #1 Medical · NMC Recognized`), IGRUA Aviation Academy (`DGCA Approved · ICAO Level 4+`), IIM Ahmedabad (`NIRF #1 Management · EQUIS & AMBA`).
  - **Global Study Abroad**: University of Oxford (`QS World #3`), University of Cambridge (`QS World #2`), Columbia University (`Ivy League`), NYU, University of Toronto, University of Melbourne.
- **Accreditation Filter**: Instant filtering by NAAC A++, NAAC A+, NIRF Top Ranked, UGC Autonomous / INI, and Professional Statutory Councils (BCI, NMC, NBA, DGCA).

### 3. 🗣️ Speak & Pronunciation Ladder (Speak Tab)
- 4 Progressive Speaking Packs: `Everyday Fluency`, `Broadcast Journalism`, `Courtroom Advocacy`, and `Scholarly Academic`.
- 10–12 consecutive rungs with live microphone voice capture.
- **Listen to Reference Audio**: Browser Speech Synthesis articulates target sentences with natural cadence.
- **Phonetic Breakdown**: Syllables, phonetic pronunciation symbols, and articulation guidance.
- Real-time **Levenshtein accuracy percentage**; scores ≥ 70% automatically unlock consecutive ladder rungs and save results to the leaderboard.

### 4. 🎙️ AI Speech Lab & 6-Dimension Fluency Coach
- **Real-Time Audio Waveform Visualizer**: Powered by HTML5 Canvas & Web Audio API `AudioContext` / `AnalyserNode`.
- **Speaking Pace (WPM) Meter**: Real-time Words-Per-Minute gauge with a visual sweet-spot needle (120–150 WPM ideal).
- **Verbatim Filler-Word Counter**: Tracks and highlights hesitation sounds (`um`, `uh`, `like`, `you know`, `actually`, `basically`).
- **6-Dimension Assessment**: Scores Pronunciation, Fluency, Clarity, Vocabulary Diversity, Grammatical Structure, and Confidence.
- **Spider/Radar Chart Visualizer**: Multi-axis radar canvas graphic plotting speaker strengths.
- **"Say It Better" Rewrite Synthesis**: Actionable coaching feedback with a polished model sentence.

### 5. 📹 Live On-Camera News Anchor Studio & Teleprompter
- Direct webcam capture and **OBS Virtual Camera / Browser Source** integration.
- Auto-scrolling teleprompter overlay with speed adjustments (`Slow`, `Normal`, `Fast`).
- Authentic **Breaking News Lower-Third Graphic Banner** with student name and customized headline.
- MediaRecorder integration for recording and downloading broadcast video clips.

### 6. ⚖️ Boardroom Debate & Mayday Roleplay
- **Two Speakers, One Device**: Turn-based stage with Speaker 1 (Proposition) and Speaker 2 (Opposition).
- 60-second round countdown timer with turn recording and side-by-side comparative scorecard.
- **Mayday Emergency Scenarios**: High-stress simulations for Airline Pilot ATC emergency diversion, ER Trauma triage consultation, Software Architecture database outage, and Diplomatic trade disputes.

### 7. 🎮 Career Language Arcade Suite (10 Games)
- **Jobtris (Semantic Tetris)**: Falling industry skill blocks cleared by typing or speaking semantic matches.
- **Wordle / Wordless**: 6-guess 5-letter vocabulary challenge with multi-tier validation (offline dictionary + 3-pass verification), random English vocabulary selection, and an end-of-game solution reveal modal with 1-click New Game restart.
- **Semantris Career Blocks**: Fast-paced word association game.
- **Career Term Blitz & Hangman**: Timed vocabulary challenges with instant audio feedback.
- **Idiom Master & Rapid Jargon Match**: Fun interactive tests for professional idioms and domain jargon.

### 8. 💼 Future Executive Business Card & Instant QR Verification
- Generates a bespoke **Class of 2040 Executive Identity Card** with custom name, aspiring career title, official issuing academy credentials, and verified contact badge.
- **Instant Vector QR Code**: 100% offline client-side vector QR generation (`<0.1s` smartphone camera scan).
- **Compact Verification URL**: Lightweight query schema (`?v=1&s=...&t=...&e=...&p=...`) with Error Correction `'L'`, eliminating camera focus hunting.
- **Synchronous Canvas Export**: Instant business card PNG download with direct embedded vector QR drawing.

### 9. 💬 Dual Side-by-Side Feedback & Reflection Wall
- **Wide-Screen / Laptop Layout**: Side-by-side display of the submission form and the live Visitor Reflections wall.
- **Mobile Responsive Reflow**: Automatically collapses to a clean single-column vertical layout on mobile devices.
- **Verified Review Badges**: Verified roles (`Student`, `Teacher`, `Parent`, `Guest`), custom administration titles, star ratings, and pinned reviews.

### 10. 🔒 Admin Control Room & Platform Management
- **In-App Password Management**: Dedicated **🔐 Admin Password** tab to change the master admin password at any time with persistent storage in Cloudflare D1.
- **Dynamic API Key Pools**: Main and backup key rotation for **Google Gemini** and **ElevenLabs** with auto-failover upon quota exhaustion.
- **Voice Studio Tester**: Select from account voices or free-tier studio voices, with live in-browser speech synthesis testing.
- **Live Stream Embed**: Synchronize YouTube live broadcast links and announcements across all connected visitor devices.
- **Moderation Tools**: Pin VIP reflections, assign custom leadership titles (e.g. `Vice-Principal`), soft-delete spam, and ban disruptive IP addresses.
- **Data Exports**: Export complete scores and reflection records to `.CSV` or `.JSON`.

---

## 🚀 Quick Start & Deployment Guide

### Prerequisites
- A free account on [GitHub](https://github.com/)
- A free account on [Cloudflare](https://dash.cloudflare.com/)

---

### Step 1: Push Code to GitHub

1. Clone or navigate to your project repository:
   ```bash
   cd careerfair
   ```

2. Stage all files, commit, and push to your GitHub repository:
   ```bash
   git add .
   git commit -m "Update Career Fair platform"
   git push origin main
   ```

---

### Step 2: Deploy on Cloudflare Pages

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the sidebar, navigate to **Workers & Pages**.
3. Click **Create application**, then select the **Pages** tab.
4. Click **Connect to Git** and choose your repository.
5. Configure the build settings:
   - **Framework preset**: `None`
   - **Build command**: *(leave completely blank)*
   - **Build output directory**: `public`
6. Click **Save and Deploy**.

Cloudflare will deploy your static assets in under 60 seconds!

---

### Step 3: Create Cloudflare D1 Database

To enable the live leaderboard, student voice scores, feedback storage, and persistent admin settings:

1. In the Cloudflare Dashboard, go to **Storage & Databases** > **D1 SQL Database**.
2. Click **Create database**.
3. Name it `careerfair-db` and click **Create**.
4. Open your new `careerfair-db` database and switch to the **Console** tab.
5. Open [`schema.sql`](./schema.sql), copy its contents, paste them into the D1 console, and click **Execute**.

---

### Step 4: Bind D1 Database to Pages

1. In the Cloudflare Dashboard, go to **Workers & Pages** > your `careerfair` project.
2. Navigate to **Settings** > **Functions**.
3. Under **D1 database bindings**, click **Add binding**:
   - **Variable name**: `DB` *(Must be uppercase `DB`)*
   - **D1 Database**: Select `careerfair-db`
4. Click **Save**.

---

### Step 5: Configure Environment Variables (Optional)

In your Pages project settings (**Settings** > **Environment variables**), you can optionally configure:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `ADMIN_PASSWORD` | Master password for the control room (can also be updated inside Admin Panel) | Configured in D1 / Dashboard |
| `GEMINI_API_KEY` | Google Gemini API key for AI feedback and coaching rewrites | Heuristic fallback |
| `ELEVEN_KEY` | ElevenLabs API key for studio Indian English voice synthesis | Web Speech fallback |
| `STT_MODEL` | Speech-to-text model identifier | `scribe_v1` |

> [!TIP]
> You can also configure multiple Gemini and ElevenLabs backup keys directly inside the **Admin Panel** under **AI & Speech Router** without redeploying!

---

## 💻 Local Testing & Offline Operations

You can test the entire platform locally without external server dependencies by opening `public/index.html` directly in your browser, or serving it with Python:

```bash
cd public
python -m http.server 8080
```
Then visit `http://localhost:8080`. All audio waveform visualizers, speech recognition, games, QR code verification, and responsive themes function completely offline!

---

## 📁 Repository Structure

```text
careerfair/
├── public/
│   ├── index.html            # Unified Single-Page Application (HTML5, responsive, accessible)
│   ├── styles.css            # Token system, 4 theme switchers, fluid typography & grid
│   ├── app.js                # Core interactive engine, Web Speech API, AudioContext, arcade games
│   ├── qrcode.min.js         # Offline client-side vector QR code generator
│   ├── _headers              # Security, mic/cam permissions, CORS, and caching headers
│   └── favicon.svg           # Branded SVG favicon
├── functions/
│   └── api/
│       └── [[path]].js       # Cloudflare Pages Functions backend (D1, STT, Gemini AI, Admin routes)
├── schema.sql                # D1 SQLite database tables & starter configuration
├── wrangler.toml             # Cloudflare Pages & D1 database bindings configuration
└── README.md                 # Documentation, feature guide & deployment instructions
```

---

## 🔐 Administration & Security Reference

- **Admin Control Room**: Accessible via the **Admin** navigation tab.
- **Password Management**: Change the master password at any time via **Admin Panel > 🔐 Admin Password**. The new password is saved directly to Cloudflare D1.
- **Passing Threshold**: Configurable accuracy benchmark (default: 70%).
- **Branding**: Kanakia International School Mira Road.
