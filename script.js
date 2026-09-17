// WorkSigned landing page — scroll reveal + lightweight form handling.
// Non-module browser JS (matches the project's no-ES-modules convention).

// ==========================================================================
// SCROLL REVEAL — add .visible when an element enters the viewport.
// ==========================================================================
const revealEls = document.querySelectorAll('.reveal');

if (revealEls.length) {
    const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) {
        io.observe(el);
    });
}

// ==========================================================================
// APPLICATION FORM — submits to FormZero (self-hosted on Cloudflare Workers).
// We fetch() a JSON payload {name, email, message} to the form's endpoint and
// show an inline success message (no page reload / no third-party email).
// ==========================================================================
const FORMZERO_ENDPOINT = 'https://formzero.ethanweimd.workers.dev/api/forms/worksigned/submissions';

function showApplySuccess(msg) {
    const success = document.querySelector('#apply-success');
    if (success) {
        success.textContent = msg || 'Thanks — your request is in. We\'ll be in touch soon.';
        success.classList.add('show');
    }
}

function showApplyError(msg) {
    const success = document.querySelector('#apply-success');
    if (success) {
        success.textContent = msg || 'Sorry, something went wrong. Please try again.';
        success.classList.remove('show');
        success.classList.add('show', 'error');
    }
}

function submitApply(e) {
    const form = e.target;
    const name = form.querySelector('#name');
    const email = form.querySelector('#email');
    const message = form.querySelector('#message');
    if (!name.value.trim() || !email.value.trim() || !email.checkValidity()) {
        e.preventDefault();
        return false;
    }
    e.preventDefault();
    const btn = document.querySelector('#apply-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    fetch(FORMZERO_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name.value.trim(),
            email: email.value.trim(),
            message: message ? message.value.trim() : ''
        })
    })
        .then(function (response) { return response.json().then(function (d) { return { ok: response.ok, d: d }; }); })
        .then(function (res) {
            if (res.ok) {
                form.reset();
                showApplySuccess();
            } else {
                showApplyError(res.d && res.d.error ? res.d.error : 'Sorry, something went wrong. Please try again.');
            }
        })
        .catch(function () {
            showApplyError('Network error — please try again.');
        })
        .finally(function () {
            if (btn) { btn.disabled = false; btn.textContent = 'Request access'; }
        });
    return false;
}

// ==========================================================================
// SHOWCASE — build the tool-suite slideshow from a data set.
// One large 16:9 window stage; a segmented tab rail of every tool.
// The video slide auto-plays when active and pauses when it isn't.
// ==========================================================================
// Inline tool icons (16px stroke icons, no external deps).
(function () {
    var ICONS = {
        code:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/></svg>',
        latex:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h9M8 6v12M11 14c-2 2-3 2-4 2M17 6l-2 12M19 8l-4 4"/></svg>',
        docs:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
        sheets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 4v16"/></svg>',
        ppt:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="1"/><path d="M12 16v4M8 20h8"/></svg>',
        chat:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 10h8M8 13h5"/></svg>',
        run:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5v14l11-7z"/></svg>'
    };

    // The full tool suite, in demo order: write it -> run it -> the writing tools -> AI chat.
    var TOOLS = [
        { id: "code",   icon: "code",   cap: "Code",      url: "app.worksigned.com/code",
          img: "assets/code.png",
          desc: "Write and edit source in the built-in code editor — every save is hashed onto the trail." },
        { id: "run",    icon: "run",    cap: "Runs live", url: "app.worksigned.com/runner",
          video: "assets/showcase.mp4", img: "assets/run_poster.png", badge: "LIVE",
          desc: "Don't just write it — run it. This code executes live, right inside the platform." },
        { id: "latex",  icon: "latex",  cap: "LaTeX",     url: "app.worksigned.com/latex",
          img: "assets/latex.png",
          desc: "Write LaTeX and compile it to a paper — source and rendered output, both sealed." },
        { id: "docs",   icon: "docs",   cap: "Documents", url: "app.worksigned.com/docs",
          img: "assets/docs.png",
          desc: "Draft reports and documents with the full word processor, in the browser." },
        { id: "sheets", icon: "sheets", cap: "Sheets",    url: "app.worksigned.com/sheets",
          img: "assets/sheets.png",
          desc: "Build spreadsheets and data tables — your results, versioned and verifiable." },
        { id: "ppt",    icon: "ppt",    cap: "Slides",    url: "app.worksigned.com/slides",
          img: "assets/ppt.png",
          desc: "Assemble presentations and figures, ready to defend your work to reviewers." },
        { id: "chat",   icon: "chat",   cap: "AI Chat",   url: "app.worksigned.com/chat",
          img: "assets/chat.png",
          desc: "Work alongside an AI research assistant — the whole conversation is on the record too." },
        { id: "all",    icon: "run",    cap: "All of it, in one place", url: "app.worksigned.com",
          montage: true,
          desc: "Math, engineering, content creation, and scientific tools — every discipline, one signed record."
    }
    ];

    var stage = document.getElementById("showcase-stage");
    var tabs  = document.getElementById("showcase-tabs");
    var urlEl = document.getElementById("showcase-url");
    var capEl = document.getElementById("showcase-caption");
    var windowEl = stage.closest(".window");
    if (!stage || !tabs) return;

    var AUTO_MS = 3000;          // auto-advance interval
    var current = 0;

    // Build slides
    stage.innerHTML = TOOLS.map(function (t, i) {
        var media;
        if (t.montage) {
            // A professional "capability" frame: the tools you have now + the
            // disciplines you'll be able to work in. Aspirational, not a claim
            // that we ship every one of them today.
            var chips = ['Math', 'Engineering', 'Content creation', 'Scientific tools'].map(function (c) {
                return '<span class="mt-chip">' + c + '</span>';
            }).join("");
            // Concrete, basic, actually-buildable examples (by capability, not brand name).
            var examples = [
                'Matrix & linear-algebra calculator',
                'ODE / differential-equation solver + live plots',
                '2D & 3D function plotting',
                'Statistical & regression analysis',
                'Circuit & signal (frequency-response) simulator',
                'Monte Carlo / numerical simulation',
                'Unit & dimension converter',
                'Fourier / spectrum analyzer'
            ].map(function (x) { return '<span class="mt-ex">' + x + '</span>'; }).join("");
            var grid = TOOLS.filter(function (x) { return !x.montage; }).map(function (x) {
                return '<div class="mt-cell"><img src="' + x.img + '" alt="' + x.cap + '">'
                     + '<span class="mt-cell-cap">' + x.cap + '</span></div>';
            }).join("");
            media = '<div class="montage">'
                  +   '<div class="mt-lead">Be able to use tools like <span class="mt-more">— and far more. This list is not exhaustive.</span></div>'
                  +   '<div class="mt-head">' + chips + '</div>'
                  +   '<div class="mt-examples">' + examples + '</div>'
                  +   '<div class="mt-grid">' + grid + '</div>'
                  + '</div>';
        } else if (t.video) {
            media = '<video src="' + t.video + '" muted loop playsinline preload="metadata" data-slide="' + i + '"></video>';
        } else {
            media = '<img src="' + t.img + '" alt="' + t.cap + ' tool" loading="' + (i === 0 ? "eager" : "lazy") + '">';
        }
        return '<div class="slide' + (i === 0 ? " active" : "") + '" data-i="' + i + '">' + media + '</div>';
    }).join("");

    // Build tabs
    tabs.innerHTML = TOOLS.map(function (t, i) {
        var thumb;
        if (t.montage) {
            var mini = TOOLS.filter(function (x) { return !x.montage; }).slice(0, 6).map(function (x) {
                return '<span style="background:url(' + x.img + ') center/cover"></span>';
            }).join("");
            thumb = '<div class="tab-thumb"><div class="mt-mini">' + mini + '</div></div>';
        } else {
            thumb = t.video
                ? '<div class="tab-thumb"><img src="' + (t.img || t.video) + '" alt=""></div>'
                : '<div class="tab-thumb"><img src="' + t.img + '" alt="' + t.cap + '"></div>';
        }
        return '<button class="tab' + (i === 0 ? " active" : "") + '" data-i="' + i + '" aria-label="' + t.cap + '">' +
               thumb +
               (t.badge ? '<span class="tab-badge">' + t.badge + '</span>' : '') +
               '<span class="tab-cap">' + ICONS[t.icon] + '<span>' + t.cap + '</span></span>' +
               '</button>';
    }).join("");

    var slides = Array.prototype.slice.call(stage.querySelectorAll(".slide"));
    var tabEls = Array.prototype.slice.call(tabs.querySelectorAll(".tab"));

    function updateCaption(i) {
        if (!capEl) return;
        capEl.classList.remove("swap");
        // restart the fade-in animation
        void capEl.offsetWidth;
        capEl.innerHTML = '<span class="showcase-caption-name">' + TOOLS[i].cap + '</span><span class="desc">' + TOOLS[i].desc + '</span>';
        capEl.classList.add("swap");
    }

    function setSlide(i, manual) {
        current = (i + TOOLS.length) % TOOLS.length;
        slides.forEach(function (s, k) { s.classList.toggle("active", k === current); });
        tabEls.forEach(function (t, k) { t.classList.toggle("active", k === current); });
        urlEl.innerHTML = TOOLS[current].url;
        updateCaption(current);
        // Video handling: play active, pause all others
        slides.forEach(function (s, k) {
            var v = s.querySelector("video");
            if (!v) return;
            if (k === current) {
                var p = v.play(); if (p && p.catch) p.catch(function () {});
            } else {
                v.pause();
            }
        });
        // Re-schedule auto-advance (skipped while a hold/pause is active).
        restartTimer();
    }

    // ---- auto-advance (no visible progress bar) ----
    var timer = null;
    var paused = false;     // paused while hovering the window / tab rail
    var manualHold = false; // set true when the user clicks a thumbnail; held until mouse leaves
    var inView = true;      // only auto-advance while the section is on screen

    function isPaused() { return paused || manualHold; }

    function clearTimer() {
        if (timer) { clearTimeout(timer); timer = null; }
    }

    function restartTimer() {
        clearTimer();
        if (isPaused() || !inView) return;  // don't schedule while paused / off-screen
        timer = setTimeout(function () {
            timer = null;
            if (!isPaused() && inView) setSlide(current + 1);
        }, AUTO_MS);
    }

    // Pause auto-advance while hovering the window or the tab rail (let them inspect)
    [windowEl, tabs].forEach(function (el) {
        if (!el) return;
        el.addEventListener("mouseenter", function () {
            paused = true;
            clearTimer();
        });
        el.addEventListener("mouseleave", function () {
            paused = false;
            manualHold = false;   // leaving the area releases a click-hold too
            restartTimer();
        });
    });

    // Only auto-advance while the section is actually on screen
    if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
            inView = entries[0].isIntersecting;
            if (inView) restartTimer(); else clearTimer();
        }, { threshold: 0.25 });
        io.observe(stage);
    }

    tabs.addEventListener("click", function (e) {
        var btn = e.target.closest(".tab");
        if (btn) {
            manualHold = true;    // clicking a thumbnail pauses auto-advance
            setSlide(parseInt(btn.dataset.i, 10));
        }
    });
    document.getElementById("showcase-prev").addEventListener("click", function () { setSlide(current - 1, true); });
    document.getElementById("showcase-next").addEventListener("click", function () { setSlide(current + 1, true); });
    document.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        var rect = stage.getBoundingClientRect();
        var visible = rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15;
        if (!visible) return;
        if (e.key === "ArrowLeft") { setSlide(current - 1, true); }
        else { setSlide(current + 1, true); }
    });

    setSlide(0);
})();


/* ==========================================================================
   CASES — "Why this exists" (flat 3-card slide deck)
   Neutral, non-defamatory account of the documented risk. Every disputed
   fact is attributed to the party making the claim or marked "unresolved".
   One coarse month+year per case. 9 slides, 3 cards each, 3s auto-advance.
   ========================================================================== */
(function () {
    var CASES = [
        {
            headline: "AI tools are now inside the research process",
            detail: "Researchers routinely paste unpublished drafts, proofs, and code into AI tools to iterate and get feedback. When a tool later produces a similar result, it can be hard to show who did the original work — and when it was made."
        },
        {
            headline: "A researcher was working on a result a lab also wanted",
            detail: "By mid-August 2026, a mathematician had obtained a related result and had it formally machine-checked, iterating drafts with frontier AI tools as their paper's own \"AI statement\" describes. Weeks later, a major AI lab ran a large multi-agent effort aimed at a closely related result."
        },
        {
            headline: "The lab announced it. The researcher disputed the sequence.",
            detail: "In early September 2026 the lab publicly announced an AI-produced result. The researcher said their unpublished work may have been involved; the lab said it could not have influenced the system — and revised those statements over the following days. No lawsuit. Still unresolved."
        },
        {
            headline: "The key questions have no clean answer yet",
            detail: "Did unpublished inputs reach the model? A user's opt-out may not cover \"de-identified\" or derivative data. Who gets credit for a result the AI reproduced? And what should govern priority in the AI era? 25 Fields Medalists wrote a public letter on the last question. (Sept 2026)"
        },
        {
            headline: "The same pattern shows up far beyond math",
            detail: "Illustrators and photographers sued over image-model training (May 2025). Major labels and musicians raised claims over style and voice cloning (Aug 2026). Dozens of newsrooms and reference publishers are litigating over training on their writing (ongoing since 2023)."
        },
        {
            headline: "In each case, the gap is the same",
            detail: "Work used in ways that aren't obviously consented to, credit that becomes ambiguous once a tool reproduces the result, and no tamper-evident way to show the work existed before a tool saw it. The dispute turns on a fact no one can currently prove: when."
        },
        {
            headline: "Why \"I made it first\" is hard to prove today",
            detail: "A copy elsewhere can be re-timestamped. \"De-identified\" or reasoning data may sit outside an opt-out. And \"we saw it after you published\" is only a statement — it can be asserted, but not easily checked against a record you control."
        },
        {
            headline: "A tamper-evident record makes it checkable",
            detail: "Every save is hash-chained with a timestamp that can't be quietly edited. The record shows which files went to which tool, and when. A journal, funder, or court can verify the whole chain independently — in seconds."
        },
        {
            headline: "Proof of work, on the record",
            cta: true,
            detail: "WorkSigned is local-first — your data stays yours — and produces a signed, shareable proof page that a third party can verify in seconds. The promise to protect you is structured so it can't be bought away."
        }
    ];

    // small inline icon set (stroke, 24x24) — reused across cards
    var ICONS = {
        ai:    '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3.2"/>',
        paste: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
        ghost: '<path d="M12 3a7 7 0 0 0-7 7v10l3-2 3 2 4-2 3 2V10a7 7 0 0 0-7-7z"/><circle cx="9.5" cy="11" r="1"/><circle cx="14.5" cy="11" r="1"/>',
        math:  '<path d="M4 6h16M4 12h10M4 18h7"/><path d="M17 15l4 4M21 15l-4 4"/>',
        drafts:'<path d="M6 3h9l5 5v13H6z"/><path d="M15 3v5h5M9 13h6M9 17h6"/>',
        lab:   '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M8 8V5h8v3M9 14h.01M15 14h.01"/>',
        announce:'<path d="M4 9v6h4l6 4V5L8 9z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
        state: '<path d="M21 12a9 9 0 1 1-9-9"/><path d="M12 8v5l3 2"/>',
        walkback:'<path d="M4 8h16M4 16h10"/><path d="M20 12l-4 4 4 4" opacity="0"/>',
        q1:    '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .5-1.5 1-1.5 2.4"/><circle cx="12" cy="17" r="0.6"/>',
        q2:    '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .5-1.5 1-1.5 2.4"/><circle cx="12" cy="17" r="0.6"/>',
        q3:    '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .5-1.5 1-1.5 2.4"/><circle cx="12" cy="17" r="0.6"/>',
        art:   '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.4"/><path d="M4 17l5-4 4 3 3-2 4 3"/>',
        music: '<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',
        press: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 8h3v11a1 1 0 0 1-2 0"/><path d="M7 9h7M7 13h7M7 17h5"/>',
        consent:'<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
        credit:'<path d="M4 20l6-6M14 8a4 4 0 1 0-5 5"/><path d="M18 6a3 3 0 1 1-3 3"/>',
        record:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
        dated: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9h16M8 3v4M16 3v4"/><path d="M9 15l2 2 4-4"/>',
        deident:'<path d="M12 3a7 7 0 0 0-7 7v10l3-2 4 2 4-2 3 2V10a7 7 0 0 0-7-7z"/><path d="M5 5l14 14"/>',
        assert:'<path d="M4 6h16M4 10h16M4 14h10M4 18h7"/><path d="M17 15l-3 4 4-1z"/>',
        chain: '<path d="M9 12a4 4 0 0 1 5-3.9 4 4 0 0 1 5 3.9 4 4 0 0 1-5 3.9"/><path d="M15 12a4 4 0 0 1-5 3.9 4 4 0 0 1-5-3.9 4 4 0 0 1 5-3.9"/>',
        log:   '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
        verify:'<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
        local: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M9 10v10"/>',
        signed:'<path d="M5 16l4 4L20 7"/><path d="M14 7h6v6"/>'
    };

    function iconSvg(key) {
        var d = ICONS[key] || ICONS.q1;
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
    }

    var grid    = document.getElementById("cases-grid");
    var countEl = document.getElementById("cases-count");
    var dotsEl  = document.getElementById("cases-dots");
    if (!grid) return;

    var AUTO_MS = 3000;
    var current = 0;

    // Build dot rail (one per slide)
    dotsEl.innerHTML = CASES.map(function (_, i) {
        return '<button class="cases-dot' + (i === 0 ? " active" : "") + '" data-i="' + i + '" aria-label="Slide ' + (i + 1) + '"></button>';
    }).join("");
    var dotEls = Array.prototype.slice.call(dotsEl.querySelectorAll(".cases-dot"));

    function render(i) {
        current = (i + CASES.length) % CASES.length;
        var c = CASES[current];
        var ctaRow = c.cta ? '<a href="#apply" class="case-cta case-cta-final">Request access</a>' : '';
        // one big card: headline + detail (+ optional CTA)
        var card = '<div class="case-big">'
                 +   '<h2 class="case-headline">' + c.headline + '</h2>'
                 +   '<p class="case-detail">' + c.detail + '</p>'
                 +   ctaRow
                 + '</div>';
        // re-trigger the fade-in
        grid.classList.remove("swap");
        void grid.offsetWidth;
        grid.innerHTML = card;
        grid.classList.add("swap");
        countEl.textContent = (current + 1) + " / " + CASES.length;
        dotEls.forEach(function (d, k) { d.classList.toggle("active", k === current); });
    }

    function setSlide(i) { render(i); restartTimer(); }

    // ---- auto-advance ----
    var timer = null, paused = false, manualHold = false, inView = true;
    function isPaused() { return paused || manualHold; }
    function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }
    function restartTimer() {
        clearTimer();
        if (isPaused() || !inView) return;
        timer = setTimeout(function () {
            timer = null;
            if (!isPaused() && inView) setSlide(current + 1);
        }, AUTO_MS);
    }

    var panel = document.querySelector(".cases-panel");
    [panel, dotsEl].forEach(function (el) {
        if (!el) return;
        el.addEventListener("mouseenter", function () { paused = true; clearTimer(); });
        el.addEventListener("mouseleave", function () { paused = false; manualHold = false; restartTimer(); });
    });

    if ("IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (entries) {
            inView = entries[0].isIntersecting;
            if (inView) restartTimer(); else clearTimer();
        }, { threshold: 0.25 });
        io.observe(panel);
    }

    dotsEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".cases-dot");
        if (btn) { manualHold = true; setSlide(parseInt(btn.dataset.i, 10)); }
    });
    document.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        var rect = (panel || grid).getBoundingClientRect();
        var visible = rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15;
        if (!visible) return;
        setSlide(current + (e.key === "ArrowLeft" ? -1 : 1));
    });

    setSlide(0);
})();
