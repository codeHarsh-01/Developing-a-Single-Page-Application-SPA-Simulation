/* ------------------------------------------------------------------
   app.js — entry point. Wires router.js to real browser events and
   handles the one piece of UI that isn't a "route": the mobile menu.
------------------------------------------------------------------- */

(function (SPA) {
    "use strict";

    function initRouterWiring() {
        window.addEventListener("hashchange", SPA.navigate);

        // Normalize a bare page load (no hash at all) to "#/" so the
        // address bar always reflects the current route, without firing
        // an extra hashchange (replaceState does not fire one) — this
        // avoids double-rendering the first view.
        if (!window.location.hash) {
            window.history.replaceState(null, "", "#/");
        }
        SPA.navigate();
    }

    function initMobileNav() {
        const toggle = document.getElementById("navToggle");
        const nav = document.getElementById("mainNav");
        if (!toggle || !nav) return;

        function close() {
            nav.classList.remove("open");
            toggle.classList.remove("active");
            toggle.setAttribute("aria-expanded", "false");
        }
        function open() {
            nav.classList.add("open");
            toggle.classList.add("active");
            toggle.setAttribute("aria-expanded", "true");
        }

        toggle.addEventListener("click", function (e) {
            e.stopPropagation();
            nav.classList.contains("open") ? close() : open();
        });

        // Closing on link click matters more here than in a normal site:
        // clicking a route link doesn't navigate away, so nothing else
        // would ever close this menu on its own.
        nav.querySelectorAll("a[data-link]").forEach(function (link) {
            link.addEventListener("click", close);
        });

        document.addEventListener("click", function (e) {
            if (nav.classList.contains("open") && !nav.contains(e.target) && e.target !== toggle) close();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && nav.classList.contains("open")) { close(); toggle.focus(); }
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        initMobileNav();
        initRouterWiring();
    });
})(window.SPA);
