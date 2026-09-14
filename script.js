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
// APPLICATION FORM — client-side only for now (no backend yet).
// Shows a success message and would POST to /api/apply when the backend is wired.
// ==========================================================================
function submitApply(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.querySelector('#name').value.trim(),
        email: form.querySelector('#email').value.trim(),
        what: form.querySelector('#what').value.trim(),
    };

    // Placeholder for the real submission. When the FastAPI/HTTP backend is
    // in place, replace this with a fetch() POST to /api/apply with `data`.
    console.log('WorkSigned apply request:', data);

    const success = document.querySelector('.apply-success');
    if (success) {
        success.textContent = 'Thanks, ' + (data.name || 'friend') + ' — we\'ll be in touch at ' + data.email + '.';
        success.classList.add('show');
    }
    form.reset();
    return false;
}
