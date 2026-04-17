# Colosseum — Change Requests (CR)
*Prepared from session synthesis. Ready for implementation.*

---

## 1. Snippet System
**What:** A minimal, manual carry-forward mechanism for session context.
**How:** After each session, the moderator curates 2–3 key takeaways or unresolved threads. These are stored on the moderator's end and optionally injected at the start of the next relevant session.
**Constraint:** Keep it manual. No automation. Selectivity is the point.

---

## 2. Handoff Clarity (Internal)
**What:** When forwarding a message between models, the moderator maintains a lightweight internal tag for their own intent.
**How:** Three modes — `neutral` (relay as-is), `probe` (forwarding to stress-test), `steer` (nudging toward a direction). This doesn't need to be visible in the output, just intentional.
**Constraint:** No overhead added to the interface. This is a moderator mental model, not a UI feature.

---

## 3. Earned Ending Signal
**What:** A soft marker for when a session has reached useful saturation.
**How:** Define a personal heuristic — e.g. "both models have converged AND the last two exchanges added no new frames." When that condition is met, close rather than extend.
**Constraint:** Resist the urge to keep going for completeness. Dilution is a real cost.

---

## 4. Disagreement Preservation
**What:** When models diverge and both are still producing signal, hold the tension longer before resolving or moving on.
**How:** If a thread shows genuine disagreement, forward at least one more round before synthesizing. Flag these moments as high-value.
**Constraint:** Don't resolve prematurely for the sake of tidiness. The gaps are load-bearing.

---

## 5. Surprise Tracking
**What:** A lightweight post-session evaluation signal.
**How:** After each session, ask: *did anything genuinely shift my thinking?* If yes, note what. If consistently no, adjust inputs — not the system.
**Constraint:** Keep this informal. It's a check, not a metric.

---

## 6. Independence Stress Test
**What:** Periodically inject a contrary or disruptive framing to test the system's real range.
**How:** Introduce a position that cuts against emerging consensus — not just a different angle, but something genuinely adversarial to the direction. Observe how both models handle it.
**Frequency:** Not every session. Use when convergence feels too smooth.

---

## 7. Thread Awareness
**What:** Basic tracking of high-value lines of thought that deserve revisiting.
**How:** Mentally mark "active threads" during a session. Occasionally return to an unresolved thread rather than always pushing forward to new territory.
**Constraint:** Depth over volume. Not every thread needs resolution — some just need a second pass.

---

## 8. Active Moderation Experiment
**What:** Occasionally run a session with more visible moderator presence to calibrate the value of default restraint.
**How:** Intervene more, steer more explicitly, surface your own views. Compare the output quality to restrained sessions.
**Purpose:** Confirm that restraint is essential, not just habitual. Know what your silence is actually doing.

---

## 9. Lightness Protection
**What:** A design constraint, not a feature.
**How:** Before adding any new capability — more models, memory tooling, structured templates — apply the test: *does this make the system feel like something I operate rather than something I think with?* If yes, don't build it yet.
**Constraint:** This is the hardest one to maintain as the system grows. Protect it deliberately.

---

## 10. Context Quality Over Volume
**What:** The synthesis standard for what gets carried forward.
**How:** Prioritise ideas that reframe the question over ideas that add to the answer. Accuracy of perspective matters more than number of perspectives.
**Constraint:** More models ≠ better output. Independence and quality of angle is the variable that matters.

---

## Design Principles (Non-Negotiable)
- The Colosseum is a thinking environment, not an observation one.
- The moderator is always also an author, even in silence.
- Incompleteness is sometimes load-bearing. Don't smooth everything.
- Agreement is a signal. So is disagreement. So is surprise. All are data.
- Build for fluid thinking with just enough persistence to avoid starting from scratch.

---

*Session date: current. Next step: implement snippet system first, everything else is secondary.*
