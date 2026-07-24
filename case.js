/* ============================================================
   AW Webdesign — case study interactions
   ============================================================ */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && !location.search.includes('motion=1');

  /* smooth scrolling (desktop widths), like the main site */
  let lenis = null;
  if (innerWidth >= 1025 && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.2, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', () => { if (window.ScrollTrigger) ScrollTrigger.update(); });
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const t = document.querySelector(a.getAttribute('href'));
        if (t) { e.preventDefault(); lenis.scrollTo(t, { duration: 1.2 }); }
      });
    });
  }

  if (reduced || typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  /* hero name: split into letters + gentle rise on load */
  const name = document.querySelector('[data-name]');
  if (name) {
    name.innerHTML = [...name.childNodes].map(node => {
      if (node.nodeName === 'SPAN') return node.outerHTML;
      return [...node.textContent].map(c => c.trim() ? `<span class="ch">${c}</span>` : '&nbsp;').join('');
    }).join('');
    gsap.from(name.querySelectorAll('.ch'), { y: '110%', opacity: 0, duration: .9, stagger: .03, ease: 'power4.out' });
    gsap.from('.cs-eyebrow, .cs-sub, .cs-meta, .cs-hero .cs-visit',
      { y: 26, opacity: 0, duration: .9, stagger: .1, ease: 'power3.out', delay: .3 });
  }

  /* image blocks + text blocks reveal as they enter */
  gsap.utils.toArray('[data-reveal]').forEach(el => {
    gsap.from(el, {
      y: 60, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });

  /* subtle parallax inside each image frame */
  gsap.utils.toArray('.cs-shot img').forEach(img => {
    gsap.fromTo(img, { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });
})();
