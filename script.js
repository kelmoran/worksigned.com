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
// APPLICATION FORM — submits to Formspree, which emails the entries to the
// owner. We POST the raw form data (Formspree needs the original inputs),
// then let it redirect to the ?sent=1 thank-you state.
// ==========================================================================
(function () {
    // Show a thank-you message if we came back from the Formspree redirect.
    if (/[?&]sent=1/.test(window.location.search)) {
        const success = document.querySelector('.apply-success');
        if (success) {
            success.textContent = 'Thanks — your request is in. We\'ll be in touch soon.';
            success.classList.add('show');
        }
    }
})();

function submitApply(e) {
    const form = e.target;
    // Light client-side validation, then hand off to Formspree (real submit).
    const name = form.querySelector('#name');
    const email = form.querySelector('#email');
    if (!name.value.trim() || !email.value.trim() || !email.checkValidity()) {
        e.preventDefault();
        return false;
    }
    // Allow the form's native POST to Formspree to proceed.
    return true;
}
