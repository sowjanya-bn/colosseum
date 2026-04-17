# Future improvements

## Background tab response capture

**Problem:** GPT (and sometimes Claude) doesn't render responses in the DOM when the tab is backgrounded. Fetching from a background tab returns stale or empty content. The user currently has to manually visit the tab at least once for the pull to work.

**Attempted approach:** Briefly focus the model tab before each fetch (`chrome.tabs.update({ active: true })`), wait ~400ms for DOM to render, fetch, then return focus to the app tab. This worked but was disruptive — the visible tab switch felt like a page refresh.

**Ideas to explore:**
- Focus the tab in a *separate window* so the main window isn't disrupted
- Use `chrome.windows.create` to open a tiny offscreen/minimized window containing the model tab, activate it there for the fetch, then close the window
- Investigate whether `chrome.scripting.executeScript` with `world: 'MAIN'` can force a DOM paint without tab activation
- Check if GPT has a visibility API hook that can be spoofed (`document.visibilityState`, `Page.setWebLifecycleState` via DevTools protocol — extensions can't use CDP directly, but maybe via a native messaging host)
