/* ------------------------------------------------------------------
   router.js — the router itself.

   Routing strategy: hash-based (#/about), not the History API's
   pushState with clean paths (/about). This is a deliberate choice,
   not an oversight — see README.md "Design Decisions" for the full
   reasoning. Short version: pushState routes need a server configured
   to redirect every path back to index.html, or a hard refresh (or a
   direct paste of the URL) 404s. Hash routes work identically whether
   this project is opened straight from a zip file (file://), hosted on
   GitHub Pages, or served any other way, with no server configuration
   at all — every browser has always shipped fragment navigation for
   free. The browser still fully participates: every hash change is a
   real history entry, so Back and Forward work natively.
------------------------------------------------------------------- */

window.SPA = window.SPA || {};

(function (SPA) {
    "use strict";

    const APP_EL = document.getElementById("app");
    const PROGRESS_EL = document.getElementById("routeProgress");
    const ANNOUNCER_EL = document.getElementById("routeAnnouncer");
    const SIMULATED_DELAY_MS = 450;

    // Test hook: set window.SPA.forceError = true right before triggering
    // a navigation to deterministically exercise the error/retry path
    // instead of relying on the small random chance used in normal
    // browsing. Consumed once, then automatically resets to false so a
    // Retry click can succeed.
    SPA.forceError = false;

    // Test hook: set true to disable the random-chance failure entirely,
    // so automated tests exercising ordinary navigation aren't flaky —
    // every failure in a test then comes only from the explicit
    // forceError hook above, never from chance. Uses ||, not a plain
    // assignment, so a value set by a test harness before this file
    // loads (e.g. via Playwright's addInitScript) isn't clobbered here.
    SPA.disableRandomErrors = SPA.disableRandomErrors || false;

    function getCurrentPath() {
        const hash = window.location.hash || "";
        const path = hash.startsWith("#") ? hash.slice(1) : hash;
        return path === "" ? "/" : path;
    }

    function resolveRoute(path) {
        return SPA.routes[path] || null;
    }

    function updateActiveNavLink(path) {
        document.querySelectorAll(".main-nav a[data-route]").forEach(function (link) {
            if (link.dataset.route === path) {
                link.setAttribute("aria-current", "page");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }

    function showLoadingSkeleton() {
        APP_EL.innerHTML =
            '<div class="skeleton-block skeleton-title"></div>' +
            '<div class="skeleton-block skeleton-line"></div>' +
            '<div class="skeleton-block skeleton-line"></div>' +
            '<div class="skeleton-block skeleton-line short"></div>';
        PROGRESS_EL.classList.remove("done");
        PROGRESS_EL.classList.add("loading");
    }

    function finishProgressBar() {
        PROGRESS_EL.classList.remove("loading");
        PROGRESS_EL.classList.add("done");
        window.setTimeout(function () { PROGRESS_EL.classList.remove("done"); }, 300);
    }

    function renderError(path, retryFn) {
        APP_EL.innerHTML =
            '<div class="error-card" role="alert">' +
                "<h2>Couldn't load this page</h2>" +
                "<p>Something went wrong loading <code>" + path + "</code>. This is a simulated failure — click below to try again.</p>" +
                '<button class="btn btn-primary" type="button" id="retryLoadBtn">Try again</button>' +
            "</div>";
        finishProgressBar();
        const btn = document.getElementById("retryLoadBtn");
        if (btn) {
            btn.addEventListener("click", retryFn);
            btn.focus();
        }
        ANNOUNCER_EL.textContent = "Failed to load " + path + ". Retry button available.";
    }

    function renderRoute(path, route) {
        APP_EL.innerHTML = route.render(path);
        document.title = route.title ? route.title + " — SPA Simulation" : "SPA Simulation";
        if (typeof route.afterRender === "function") route.afterRender();

        finishProgressBar();

        // Move keyboard focus to the new view's heading — without this,
        // a screen reader or keyboard user's focus silently stays on
        // whatever nav link they clicked while the whole page content
        // changes underneath them, which is a common real-world SPA
        // accessibility bug.
        const heading = document.getElementById("routeHeading");
        (heading || APP_EL).focus();

        ANNOUNCER_EL.textContent = (route.title || "Page") + " loaded.";
    }

    function navigate() {
        const path = getCurrentPath();
        const route = resolveRoute(path);

        updateActiveNavLink(path);
        showLoadingSkeleton();

        window.setTimeout(function attempt() {
            const shouldFail = SPA.forceError || (!SPA.disableRandomErrors && Math.random() < 0.08);
            SPA.forceError = false; // one-shot: a Retry click gets a clean attempt

            if (shouldFail) {
                renderError(path, function retry() {
                    showLoadingSkeleton();
                    window.setTimeout(attempt, SIMULATED_DELAY_MS);
                });
                return;
            }

            if (!route) {
                APP_EL.innerHTML = SPA.notFoundRoute.render(path);
                document.title = "Not found — SPA Simulation";
                const heading = document.getElementById("routeHeading");
                (heading || APP_EL).focus();
                ANNOUNCER_EL.textContent = "Page not found: " + path;
                finishProgressBar();
                return;
            }

            SPA.recordVisit(path);
            renderRoute(path, route);

            // Keep the Home view's live stat card in sync if the visitor
            // is looking at Home when a route change is recorded.
            const routeValueEl = document.getElementById("currentRouteValue");
            if (routeValueEl) routeValueEl.textContent = path;
        }, SIMULATED_DELAY_MS);
    }

    SPA.navigate = navigate;
    SPA.getCurrentPath = getCurrentPath;
})(window.SPA);
