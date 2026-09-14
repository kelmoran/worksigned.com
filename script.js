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
