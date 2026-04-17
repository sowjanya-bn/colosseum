# Colosseum ⚔

A lightweight AI ideation relay tool. Send prompts to Claude and GPT side-by-side, read their independent responses, and forward one model's answer to the other — as many times as you like. You control every message and every relay.

No API keys. Works directly with your browser sessions via a Chrome extension.

---

## How it works

- The **web app** is the moderator UI — you type prompts, read responses, and decide what to forward.
- The **Chrome extension** bridges the app to open tabs of claude.ai and chatgpt.com, automating the typing and submission.
- You stay in control. Nothing is sent automatically without your action.

---

## Running it

Every time you want to use Colosseum:

```bash
npm start
```

Then open [http://localhost:4173](http://localhost:4173) in Chrome.

This builds the app and runs it as a stable preview server — no hot-reload WebSocket, so the page won't refresh if you step away or your screen sleeps.

> Use `npm run dev` only when actively making code changes (runs on port 5173 with live reload).

The extension stays installed permanently — you only need to reload it if you update the extension files (see below).

---

## First-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Load the Chrome extension

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder in this repo

The extension will stay installed across restarts. You only need to reload it here if you make changes to files inside `extension/`.

### 3. Open your AI tabs

In Chrome, open:
- [https://claude.ai](https://claude.ai) — log in, start a new conversation
- [https://chatgpt.com](https://chatgpt.com) — log in, start a new conversation

### 4. Start a session

Run `npm run dev`, go to [http://localhost:5173](http://localhost:5173), and start typing.

---

## Usage

- **Send to Claude / GPT / Both** — use the target selector in the moderator bar
- **Forward** — click `forward →` on any model response to send it to the other model
- **Pull response** — if a response hasn't appeared yet, click `↓ pull response` in the panel header to fetch it manually
- **Moderator notes** — add context when forwarding; shown inline in the transcript
- **Settings** — click ⚙ to set a session title and customize each model's persona/role prompt
- **Export** — open the Session Transcript panel at the bottom and click `↓ export` to download the full conversation as a Markdown file
- **Reset** — click ↺ to clear the session (extension tabs are preserved)

---

## Extension reload (after code changes)

If you edit anything inside the `extension/` folder:

1. Go to `chrome://extensions`
2. Click the reload button on the Colosseum extension
3. Refresh your claude.ai and chatgpt.com tabs

The web app (`src/`) hot-reloads automatically via Vite — no action needed there.

---

## Project structure

```
colosseum/
├── src/                  # React app (moderator UI)
│   ├── App.tsx
│   ├── state.ts
│   ├── extension.ts      # Bridge to Chrome extension
│   ├── promptBuilder.ts
│   ├── transcriptExport.ts
│   └── components/
├── extension/            # Chrome extension (MV3)
│   ├── manifest.json
│   ├── background.js     # Service worker, tab management
│   └── content/
│       ├── bridge.js     # Injected into localhost, relays messages
│       ├── claude.js     # Injected into claude.ai
│       └── gpt.js        # Injected into chatgpt.com
└── package.json
```
