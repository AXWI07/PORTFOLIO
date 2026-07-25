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
    // split into WORDS (each kept on one line) then letters, so a name never breaks mid-word
    const dotEl = name.querySelector('.dot');
    const dotHTML = dotEl ? dotEl.outerHTML : '';
    let text = '';
    name.childNodes.forEach(n => { if (n.nodeType === 3) text += n.textContent; });
    const words = text.trim().split(/\s+/);
    name.innerHTML = words.map((w, wi) => {
      const chars = [...w].map(c => `<span class="ch">${c}</span>`).join('');
      const last = wi === words.length - 1;
      return `<span class="word">${chars}${last ? dotHTML : ''}</span>`;
    }).join(' ');
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

  /* note: no image parallax — the shots are shown uncropped, so shifting them
     inside the frame would leave gaps. The reveal above carries the motion. */
})();
