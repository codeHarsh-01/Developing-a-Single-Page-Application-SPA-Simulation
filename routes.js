/* ------------------------------------------------------------------
   routes.js — route registry: what each URL renders and how.

   Loaded as a plain <script> (no ES modules) on purpose: browsers block
   `type="module"` scripts from loading over the file:// protocol via
   CORS, which would break this project the moment someone opens
   index.html directly instead of through a server. Every file in this
   project attaches to a single shared namespace, `window.SPA`, instead.
------------------------------------------------------------------- */

window.SPA = window.SPA || {};

(function (SPA) {
    "use strict";

    // ---- Session-scoped state (Section: state management) ----
    // sessionStorage (not localStorage) is deliberate: visit counts are
    // meant to describe "this browsing session," and should reset in a
    // new tab rather than persist forever on the visitor's machine.
    const STORAGE_KEY = "spa-sim-visits";

    function loadVisits() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (err) {
            return {};
        }
    }

    function recordVisit(path) {
        const visits = loadVisits();
        visits[path] = (visits[path] || 0) + 1;
        visits._total = (visits._total || 0) + 1;
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
        } catch (err) {
            /* ignore persistence failures */
        }
        return visits;
    }

    // ---- Sample project data for the /projects route ----
    const PROJECTS = [
        { title: "Responsive Portfolio", desc: "A mobile-first portfolio demonstrating responsive layout strategies.", tags: ["HTML", "CSS"], category: "web" },
        { title: "Word Analytics App", desc: "A utility concept for counting words, characters, and reading time.", tags: ["JavaScript", "UI"], category: "javascript" },
        { title: "Game Project", desc: "An interactive game concept built around classic arcade mechanics.", tags: ["C++", "SFML"], category: "cpp" },
        { title: "SPA Simulation", desc: "This project: hash-based routing, dynamic loading, and state management.", tags: ["JavaScript", "Routing"], category: "javascript" },
    ];

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function projectCardHtml(p) {
        return (
            '<article class="proj-card" data-category="' + p.category + '">' +
                "<h3>" + escapeHtml(p.title) + "</h3>" +
                "<p>" + escapeHtml(p.desc) + "</p>" +
                '<div class="tag-row">' + p.tags.map(t => "<span>" + escapeHtml(t) + "</span>").join("") + "</div>" +
            "</article>"
        );
    }

    // ---- Route definitions ----
    // Each route has: title (for document.title), render() returning an
    // HTML string, and an optional afterRender() to wire up interactive
    // bits once that HTML is actually in the DOM.
    SPA.routes = {
        "/": {
            title: "Home",
            render: function () {
                const visits = loadVisits();
                return (
                    '<div class="view-header">' +
                        '<p class="eyebrow">Home</p>' +
                        '<h1 class="page-title" tabindex="-1" id="routeHeading">SPA Simulation</h1>' +
                        '<p class="lede">A small single-page application built with plain HTML, CSS, and JavaScript. ' +
                        "Use the nav above — every click updates the URL, loads new content, and keeps your browser's " +
                        "back/forward buttons working correctly, all without a single full page reload.</p>" +
                    "</div>" +
                    '<div class="stat-row" id="homeStats">' +
                        '<div class="stat-card"><div class="value">' + (visits._total || 0) + '</div><div class="label">Route changes this session</div></div>' +
                        '<div class="stat-card"><div class="value">' + (visits["/"] || 0) + '</div><div class="label">Times you\'ve viewed Home</div></div>' +
                        '<div class="stat-card"><div class="value" id="currentRouteValue">/</div><div class="label">Current route</div></div>' +
                    "</div>"
                );
            },
        },

        "/about": {
            title: "About",
            render: function () {
                return (
                    '<div class="view-header">' +
                        '<p class="eyebrow">About this project</p>' +
                        '<h1 class="page-title" tabindex="-1" id="routeHeading">How this SPA works</h1>' +
                        '<p class="lede">This page is one of four routes rendered entirely on the client. Here\'s the short version of the architecture.</p>' +
                    "</div>" +
                    '<p style="max-width:60ch;margin-bottom:14px">The URL hash (the part after <code>#</code>) is the single ' +
                    "source of truth for which view is showing. Clicking a nav link doesn't request a new page — it just " +
                    "changes the hash, which fires the browser's native <code>hashchange</code> event, which this app listens for.</p>" +
                    '<p style="max-width:60ch;margin-bottom:14px">Every route change goes through a short simulated loading ' +
                    "delay before its content appears, the same way a real API call would feel — including, occasionally, " +
                    "a simulated failure with a retry button, so the error-handling path is real and not just theoretical.</p>" +
                    '<p style="max-width:60ch">Visit the <a href="#/projects" data-link style="color:var(--accent-text);font-weight:700">Projects</a> ' +
                    "page to see client-side filtering, or " +
                    '<a href="#/contact" data-link style="color:var(--accent-text);font-weight:700">Contact</a> for a validated form — both run entirely inside this one HTML page.</p>'
                );
            },
        },

        "/projects": {
            title: "Projects",
            render: function () {
                return (
                    '<div class="view-header">' +
                        '<p class="eyebrow">Explore</p>' +
                        '<h1 class="page-title" tabindex="-1" id="routeHeading">Projects</h1>' +
                        '<p class="lede">Filtering here doesn\'t touch the URL or reload anything — it\'s local state inside this one route.</p>' +
                    "</div>" +
                    '<div class="filter-bar" id="projFilterBar" role="group" aria-label="Filter projects by category">' +
                        '<button type="button" class="filter-btn active" data-filter="all" aria-pressed="true">All</button>' +
                        '<button type="button" class="filter-btn" data-filter="web" aria-pressed="false">Web</button>' +
                        '<button type="button" class="filter-btn" data-filter="javascript" aria-pressed="false">JavaScript</button>' +
                        '<button type="button" class="filter-btn" data-filter="cpp" aria-pressed="false">C++</button>' +
                    "</div>" +
                    '<div class="card-grid" id="projGrid">' + PROJECTS.map(projectCardHtml).join("") + "</div>" +
                    '<p class="filter-empty" id="projFilterEmpty" hidden>No projects in this category.</p>'
                );
            },
            afterRender: function () {
                const bar = document.getElementById("projFilterBar");
                const cards = document.querySelectorAll("#projGrid .proj-card");
                const empty = document.getElementById("projFilterEmpty");
                if (!bar) return;
                bar.addEventListener("click", function (e) {
                    const btn = e.target.closest(".filter-btn");
                    if (!btn) return;
                    bar.querySelectorAll(".filter-btn").forEach(b => {
                        b.classList.remove("active");
                        b.setAttribute("aria-pressed", "false");
                    });
                    btn.classList.add("active");
                    btn.setAttribute("aria-pressed", "true");
                    const filter = btn.dataset.filter;
                    let visible = 0;
                    cards.forEach(card => {
                        const match = filter === "all" || card.dataset.category === filter;
                        card.hidden = !match;
                        if (match) visible++;
                    });
                    if (empty) empty.hidden = visible !== 0;
                });
            },
        },

        "/contact": {
            title: "Contact",
            render: function () {
                return (
                    '<div class="view-header">' +
                        '<p class="eyebrow">Get in touch</p>' +
                        '<h1 class="page-title" tabindex="-1" id="routeHeading">Send a message</h1>' +
                        '<p class="lede">Validated the same as a normal form — the only difference is nothing here ever reloads the page.</p>' +
                    "</div>" +
                    '<form class="contact-form" id="spaContactForm" novalidate>' +
                        '<div class="field">' +
                            '<label for="cName">Name</label>' +
                            '<input id="cName" type="text" autocomplete="name" aria-describedby="cNameError">' +
                            '<small class="field-error" id="cNameError" aria-live="polite"></small>' +
                        "</div>" +
                        '<div class="field">' +
                            '<label for="cEmail">Email</label>' +
                            '<input id="cEmail" type="email" autocomplete="email" aria-describedby="cEmailError">' +
                            '<small class="field-error" id="cEmailError" aria-live="polite"></small>' +
                        "</div>" +
                        '<div class="field">' +
                            '<label for="cMessage">Message</label>' +
                            '<textarea id="cMessage" rows="4" aria-describedby="cMessageError"></textarea>' +
                            '<small class="field-error" id="cMessageError" aria-live="polite"></small>' +
                        "</div>" +
                        '<button class="btn btn-primary" type="submit" id="cSubmitBtn">Send message</button>' +
                        '<p class="form-status" id="cFormStatus" role="status" aria-live="polite"></p>' +
                    "</form>"
                );
            },
            afterRender: function () {
                const form = document.getElementById("spaContactForm");
                if (!form) return;
                const name = document.getElementById("cName");
                const email = document.getElementById("cEmail");
                const message = document.getElementById("cMessage");
                const errors = {
                    name: document.getElementById("cNameError"),
                    email: document.getElementById("cEmailError"),
                    message: document.getElementById("cMessageError"),
                };
                const status = document.getElementById("cFormStatus");
                const submitBtn = document.getElementById("cSubmitBtn");
                const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                function setError(field, el, msg) {
                    if (msg) { field.setAttribute("aria-invalid", "true"); el.textContent = msg; return false; }
                    field.removeAttribute("aria-invalid"); el.textContent = ""; return true;
                }
                function validateName() { return name.value.trim() ? setError(name, errors.name, "") : setError(name, errors.name, "Please enter your name."); }
                function validateEmail() {
                    const v = email.value.trim();
                    if (!v) return setError(email, errors.email, "Please enter an email address.");
                    if (!EMAIL_RE.test(v)) return setError(email, errors.email, "Enter a valid email address.");
                    return setError(email, errors.email, "");
                }
                function validateMessage() { return message.value.trim().length >= 10 ? setError(message, errors.message, "") : setError(message, errors.message, "Message should be at least 10 characters."); }

                name.addEventListener("blur", validateName);
                email.addEventListener("blur", validateEmail);
                message.addEventListener("blur", validateMessage);

                form.addEventListener("submit", function (e) {
                    e.preventDefault();
                    const ok = [validateName(), validateEmail(), validateMessage()].every(Boolean);
                    if (!ok) {
                        status.dataset.state = "error";
                        status.textContent = "Please fix the highlighted fields.";
                        return;
                    }
                    submitBtn.disabled = true;
                    submitBtn.textContent = "Sending...";
                    window.setTimeout(function () {
                        submitBtn.disabled = false;
                        submitBtn.textContent = "Send message";
                        status.dataset.state = "success";
                        status.textContent = "Message captured for this demo — no server involved.";
                        form.reset();
                    }, 600);
                });
            },
        },
    };

    SPA.notFoundRoute = {
        title: "Not Found",
        render: function (path) {
            return (
                '<div class="notfound">' +
                    '<div class="code" aria-hidden="true">404</div>' +
                    '<h1 class="page-title" tabindex="-1" id="routeHeading">Page not found</h1>' +
                    '<p class="lede" style="margin-bottom:20px">There\'s no route for <code>' + escapeHtml(path) + "</code>.</p>" +
                    '<a class="btn btn-primary" href="#/" data-link>Back to Home</a>' +
                "</div>"
            );
        },
    };

    SPA.recordVisit = recordVisit;
    SPA.loadVisits = loadVisits;
})(window.SPA);
