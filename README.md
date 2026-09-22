# Week 5 — Developing a Single Page Application (SPA) Simulation

## Project Plan

The goal was a small but genuinely functional SPA: one HTML shell, client-side
routing that updates the URL and responds to Back/Forward, content that loads
dynamically rather than sitting pre-rendered in the page, and visible loading
and error states — not just the happy path.

Four routes were planned up front: **Home**, **About**, **Projects** (with a
client-side filter, to prove state can live inside a single route), and
**Contact** (a validated form, to prove routing and "normal page behavior"
aren't mutually exclusive). A not-found view and a simulated-failure/retry
view were planned alongside them from the start, since the brief specifically
asks for error handling, not just the successful cases.

## Project Structure

```text
week5-spa-simulation/
├── index.html          The single page every route renders into
├── css/
│   └── style.css        All styling, transitions, and states
├── js/
│   ├── routes.js         Route content + per-route state and behavior
│   ├── router.js          The router: URL parsing, loading, errors, focus
│   └── app.js              Entry point: wires events, mobile menu
└── README.md            This report
```

## Architecture

**One container, swapped content.** `index.html` has a single
`<div id="app">` inside `<main>`. Every route is a JavaScript function that
returns an HTML string; the router's only job is deciding *which* function to
call and injecting its result into that one div. Nothing else on the page —
header, nav, footer — is ever touched by a route change.

**Hash-based routing (`#/about`), not History API `pushState`.** This was
the single biggest architectural decision, and it was made deliberately, not
by default. Both were considered:

| | Hash routing (`#/about`) | `pushState` routing (`/about`) |
|---|---|---|
| Works opened directly from a zip (`file://`) | Yes | No — browsers block this |
| Works on GitHub Pages after a hard refresh | Yes | Only with a server rewrite rule |
| Needs any server configuration | No | Yes (redirect all paths to index.html) |
| Uses the browser's real History object | Yes — every hash change is a history entry | Yes |
| Looks like a "real" URL path | No (`#/about`) | Yes (`/about`) |

The brief's deliverable is explicitly a **zip file** meant to be a complete,
runnable project — the most likely way anyone actually opens it is by
extracting the zip and double-clicking `index.html`. A `pushState` router
would work fine for every click *during* a session, but a hard refresh on
`/about`, or pasting that URL into a new tab, would 404 (no server, no
`/about` file exists) — a bad demo of a project whose whole point is smooth
navigation. Hash routing has no such failure mode: the browser has supported
fragment navigation without any server involvement since long before the
History API existed. The trade-off (URLs have a `#` in them) was judged worth
making for a project whose primary deliverable is "download and run it,"
rather than "deployed behind a configured server." The browser's Back and
Forward buttons still work natively either way — a `hashchange` event fires
on every URL change, which is what the router listens for.

**Dynamic loading is simulated, honestly.** There's no backend, so "loading
content dynamically" can't mean a real network request. Every route change
goes through a ~450ms delay with a skeleton loading state and an animated
progress bar before its content appears — the same *shape* of experience a
real API-backed app would have, clearly presented as a simulation (the
footer says so, and so does this report) rather than dressed up as something
it isn't.

**State management.** Two things count as real state here, not just
content: a per-route, per-session visit counter (stored in
`sessionStorage`, shown live on the Home view), and each route's own
in-page state (the Projects filter selection, the Contact form's validation
state) which resets on navigation away, since it's meaningfully scoped to
that view rather than the whole app. `sessionStorage` was chosen over
`localStorage` deliberately — visit counts describe *this browsing session*,
and resetting in a new tab is the more honest behavior than accumulating
forever on the visitor's machine.

**Accessibility carried over, not re-learned.** An SPA's biggest usability
risk is that route changes are invisible to anyone not looking at the
screen — the URL and page title still need to update, and keyboard focus
needs to go somewhere sensible, or a screen reader user's focus is left
stranded on a nav link while the entire page content silently changes
underneath them. Every route change here: updates `document.title`, updates
`aria-current="page"` on the matching nav link, writes a status message to a
visually-hidden `aria-live="polite"` announcer, and moves keyboard focus to
the new view's heading (or, on a failed load, straight to the Retry button).

## Testing

The full SPA was driven programmatically in a real headless browser
(Playwright/Chromium) rather than checked by eye — **38 automated checks**
covering:

- Initial load, hash normalization, and correct nav highlighting
- Every route: correct content, correct URL, correct `document.title`,
  focus moved to the new heading
- Browser Back and Forward actually restore the correct route's content
- A deep link opened fresh (e.g. `index.html#/contact`) renders that route
  immediately, not Home-then-redirect
- An unknown hash renders the 404 view
- A forced simulated failure renders the error card, moves focus to Retry,
  and a Retry click succeeds
- The Projects filter changes visible cards without touching the URL
- Contact form validation (empty submit, and a fully valid submit)
- The session visit counter survives a page reload
- The mobile menu opens, closes on route selection, and the hamburger icon
  animates correctly

**Result: 38 of 38 checks passed**, with the four "Google Fonts failed to
load" console warnings being a known artifact of this offline development
sandbox having no internet access, not a defect in the page.

## Challenges Encountered

Documented honestly, including the ones caught by the testing pass itself
rather than by writing careful code the first time:

**A flaky test that revealed a real gap, not a fluke.** The simulated
failure path uses an 8% random chance during normal browsing, to feel like
a real (occasionally unreliable) API. The first full test run passed, but a
later screenshot script timed out clicking a button that should have
existed — the random failure had fired during an unrelated step and shown
the error card instead. That meant the *first* "all green" test run had
technically just gotten lucky, not verified anything reliably. The fix was
a `disableRandomErrors` flag the test harness sets before the page's own
scripts run, so ordinary-navigation tests are fully deterministic and the
error path is only ever exercised on purpose, via an explicit `forceError`
flag. Discovering that a passing test suite can still be silently
unreliable — and confirming the fix by running it several times in a row
afterward — was the most valuable single moment in this project.

**The "hidden" skip link wasn't fully hidden.** The skip-to-content link
was positioned `top: -48px` to sit off-screen until focused — a fixed
number chosen without checking the element's actual rendered height. Its
real height turned out to be about 49.6px, so roughly 1.6 pixels of it
were still visible at the very top of the page at all times. It was caught
by screenshotting the Home page and noticing a sliver of a dark box at the
top edge that had no business being there. The fix replaced the
guess-a-pixel-value approach with `transform: translateY(-150%)`, which
hides the element relative to its own size regardless of what that size
is — a more robust pattern than the one used in earlier work in this
series, and worth carrying forward.

**Focus was moving to new content in every case except one.** Every
successful route render moves focus to that view's heading — except the
error-card path, which was overlooked in the first pass because it isn't a
"route" in the same sense as the other four. It has the same accessibility
requirement as everything else (a keyboard/screen-reader user needs
somewhere sensible to land), and the same test that verifies focus for
every route was written for and applied to this one afterward, catching
the gap directly.

## Known Limitations

- Hash routing means URLs have a visible `#` in them, and Home is `#/`
  rather than a bare `/`. This is the deliberate trade-off discussed above,
  not an oversight.
- The simulated network delay and 8% failure rate are fixed constants, not
  based on measuring a real backend, because there isn't one to measure.
- Route content lives as HTML-string templates inside `routes.js` rather
  than being fetched from separate partial files. This was a deliberate
  choice for portability (see Architecture), not an attempt to hide a
  fetch-based approach — a `fetch()`-per-route version would work
  identically once hosted over http(s), but would fail immediately if
  opened via `file://`, which this project prioritizes supporting out of
  the box.

## Conclusion

This project meets the brief's core requirement — dynamically loading and
displaying content without full page reloads — using hash-based routing
deliberately chosen for portability, real (not merely styled) loading and
error states, session-scoped state management, and accessibility treated as
a routing concern rather than an afterthought. Every claim in this report
was checked against the running application in an actual browser: 38
automated checks, two real bugs caught and fixed during that process, and a
third issue (a test that could pass by luck) caught and corrected before it
could hide a real one.
