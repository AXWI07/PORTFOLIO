/* ============================================================
   AW Webdesign — interactions
   ============================================================ */
(() => {
  // ?motion=1 forces the animated path (for testing on reduced-motion systems)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && !location.search.includes('motion=1');
  const touch = matchMedia('(hover: none)').matches;

  /* ----- hero: letter split + weight melt (as approved) ----- */
  const name = document.querySelector('[data-name]');
  name.setAttribute('aria-label', name.textContent.trim());
  name.innerHTML = [...name.childNodes].map(node => {
    if (node.nodeName === 'BR') return '<br>';
    if (node.nodeName === 'SPAN') return node.outerHTML;
    return [...node.textContent].map(c => c.trim() ? `<span class="ch" aria-hidden="true">${c}</span>` : ' ').join('');
  }).join('');

  const hero = document.querySelector('[data-hero]');
  if (!reduced && !touch) {
    const letters = [...name.querySelectorAll('.ch')];
    // lock each letter's width at its heaviest weight so melting never reflows the line
    const lockWidths = () => {
      letters.forEach(ch => { ch.style.width = ''; });
      letters.forEach(ch => { ch._w = ch.getBoundingClientRect().width; });
      letters.forEach(ch => {
        ch.style.width = ch._w + 'px';
        ch.style.textAlign = 'center';
      });
    };
    // wait for the actual Montserrat face, not just fonts.ready (which can win the race)
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('600 1rem Montserrat'), document.fonts.ready])
        .then(lockWidths).catch(lockWidths);
    } else lockWidths();
    let rlock;
    addEventListener('resize', () => { clearTimeout(rlock); rlock = setTimeout(lockWidths, 200); });
    const R = 170;
    let last = 0;
    hero.addEventListener('pointermove', e => {
      const now = performance.now();
      if (now - last < 40) return;
      last = now;
      for (const ch of letters) {
        const r = ch.getBoundingClientRect();
        const d = Math.hypot((r.left + r.width / 2) - e.clientX, (r.top + r.height / 2) - e.clientY);
        const t = Math.max(0, 1 - d / R);
        if (t > 0) {
          ch.style.transition = 'font-weight .25s ease-out';
          ch.style.fontWeight = Math.round(600 - 450 * t);
          ch._melt = now;
        }
      }
    });
    setInterval(() => {
      const now = performance.now();
      for (const ch of letters) {
        if (ch._melt && now - ch._melt > 1500) {
          ch._melt = 0;
          ch.style.transition = 'font-weight 1.2s cubic-bezier(.22,1,.36,1)';
          ch.style.fontWeight = 600;
        }
      }
    }, 250);
  }

  /* ============================================================
     work showcase — exact port of the reference implementation:
     scrubbed timeline over the whole section; every image window
     grows minH→maxH svh while it enters the viewport, width bulges
     minW→maxW vw around the viewport middle, info fades in.
     ============================================================ */
  gsap.registerPlugin(ScrollTrigger);

  /* ----- Lenis smooth scrolling (what makes scrubbed animations feel high-end) -----
     Any desktop-width viewport: Lenis only smooths WHEEL input; touch/touchpad
     gestures stay native, so touchscreen laptops are safe to include. */
  /* Always on at desktop widths (like the reference site) — wheel input glides
     even on machines that report prefers-reduced-motion. */
  const wantsLenis = innerWidth >= 1025;
  console.info('[AW] lenis:', wantsLenis && typeof Lenis !== 'undefined' ? 'on' : 'off (small viewport or script missing)');
  let lenis = null;
  if (wantsLenis && typeof Lenis !== 'undefined') {
    document.documentElement.style.scrollBehavior = 'auto'; // Lenis drives the scroll itself
    // duration-based easing: every wheel notch glides ~1.2s (easeOutExpo) instead of
    // stepping — makes notched mouse wheels feel as smooth as a touchpad
    lenis = new Lenis({
      autoRaf: false,
      duration: 1.2,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // route anchor links through Lenis so they glide instead of jumping
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) { e.preventDefault(); lenis.scrollTo(target, { duration: 1.4 }); }
      });
    });
  }

  const section = document.getElementById('selectedWork');
  const wrappers = gsap.utils.toArray('.work-wrapper');
  const n = wrappers.length;

  /* build crossfade galleries from data-images / data-bg */
  wrappers.forEach((w, wi) => {
    const inner = w.querySelector('.work-img-wrapper-2');
    const ids = w.dataset.images.split(',');
    ids.forEach((id, i) => {
      const img = new Image();
      img.src = `https://picsum.photos/id/${id.trim()}/1600/1067`;
      img.alt = 'work image';
      img.className = 'work-image' + (i === 0 ? ' on' : '');
      img.loading = wi === 0 && i === 0 ? 'eager' : 'lazy';
      inner.appendChild(img);
    });
    w.querySelector('.bg-media').style.background = w.dataset.bg;

    /* gallery cycling: desktop cycles while hovered (1s); touch auto-cycles (2s, staggered) */
    const imgs = [...inner.querySelectorAll('.work-image')];
    let idx = 0, iv = null, to = null;
    const show = i => imgs.forEach((im, j) => im.classList.toggle('on', j === i));
    const small = matchMedia('(hover: none) and (pointer: coarse)').matches || innerWidth < 1025;
    if (small) {
      to = setTimeout(() => {
        idx = (idx + 1) % imgs.length; show(idx);
        iv = setInterval(() => { idx = (idx + 1) % imgs.length; show(idx); }, 2000);
      }, 2000 * wi);
    } else {
      w.addEventListener('mouseenter', () => {
        iv = setInterval(() => { idx = (idx + 1) % imgs.length; show(idx); }, 1000);
      });
      w.addEventListener('mouseleave', () => {
        clearInterval(iv); iv = null; idx = 0; show(0);
      });
    }
  });

  /* scroll choreography — ported 1:1 (units are svh of scroll) */
  const mm = gsap.matchMedia();
  const setup = (minH, maxH, minW, maxW, animW, gap = 0) => {
    gsap.set(section, { height: `${n * (maxH + gap)}svh` });
    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
    });
    const d = [];
    for (let e = 0; e < n; e++) {
      // height (incl. gap) of item i at timeline time t
      const heightOf = (i, t) => {
        const k = d[i];
        return t <= k.hStart ? minH + gap : t >= k.hEnd ? maxH + gap
          : minH + gap + (maxH - minH) * (t - k.hStart) / (k.hEnd - k.hStart);
      };
      // top position (svh from viewport top) of item e at time t
      const topOf = t => {
        let r = 0;
        for (let i = 0; i < e; i++) r += heightOf(i, t);
        return 100 - t + r;
      };
      // binary search: first t where fn(t) drops to target
      const solve = (fn, target) => {
        let lo = 0, hi = 3000;
        for (let i = 0; i < 50; i++) {
          const mid = (lo + hi) / 2;
          if (fn(mid) > target) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
      };
      d.push({
        hStart: solve(topOf, 100),         // starts growing when entering from below
        hEnd: 0, infoFadeStart: 0, wGrowEnd: 0, wShrinkStart: 0, wShrinkEnd: 0
      });
      d[e].hEnd = solve(topOf, 10);        // fully grown when top reaches 10svh
      d[e].infoFadeStart = solve(topOf, 70);
      if (animW) {
        const centerOf = t => topOf(t) + heightOf(e, t) / 2;
        d[e].wGrowEnd = solve(centerOf, 55);
        d[e].wShrinkStart = solve(centerOf, 45);
        d[e].wShrinkEnd = solve(t => topOf(t) + heightOf(e, t), 0);
      }
    }
    const imgWraps = gsap.utils.toArray('.work-img-wrapper', section);
    const infos = gsap.utils.toArray('.work-info-wrapper', section);
    imgWraps.forEach((el, i) => {
      const k = d[i];
      tl.fromTo(el, { height: `${minH}svh` },
        { height: `${maxH}svh`, ease: 'none', duration: k.hEnd - k.hStart }, k.hStart);
      if (infos[i]) tl.fromTo(infos[i], { opacity: 0 }, { opacity: 1, ease: 'none', duration: 20 }, k.infoFadeStart);
      if (animW) {
        tl.fromTo(el, { width: `${minW}vw` },
          { width: `${maxW}vw`, ease: 'none', duration: k.wGrowEnd - k.hStart }, k.hStart);
        tl.fromTo(el, { width: `${maxW}vw` },
          { width: `${minW}vw`, ease: 'none', duration: k.wShrinkEnd - k.wShrinkStart, immediateRender: false },
          k.wShrinkStart);
      } else {
        gsap.set(el, { width: `${minW}vw` });
      }
    });
    tl.to({}, { duration: .01 }, n * (maxH + gap) + 100); // pad timeline to full scroll length
    return tl;
  };
  mm.add('(min-width: 1025px)', () => { setup(28, 72, 48, 60, true, 0); });
  mm.add('(max-width: 1024px)', () => { setup(25, 50, 100, 100, false, 20); });

  /* ============================================================
     about — heading mask, word by word copy reveal (scrub),
     portrait curtain + parallax
     ============================================================ */
  const aboutCopy = document.getElementById('aboutCopy');
  if (aboutCopy) {
    // split into word spans; the closing phrase gets the accent color
    const words = aboutCopy.textContent.trim().split(/\s+/);
    const accentFrom = words.length - 3; // "worth showing off."
    aboutCopy.innerHTML = words.map((w, i) =>
      `<span class="w${i >= accentFrom ? ' accent' : ''}">${w}</span>`).join(' ');

    gsap.to('.at-line', {
      y: 0, duration: .9, ease: 'power4.out',
      scrollTrigger: { trigger: '.about', start: 'top 78%' }
    });
    gsap.to('.about-copy .w', {
      opacity: 1, ease: 'none', stagger: .6, duration: 1,
      scrollTrigger: { trigger: '.about-copy', start: 'top 78%', end: 'bottom 45%', scrub: true }
    });
    gsap.to('#aboutMedia', {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power4.inOut',
      scrollTrigger: { trigger: '#aboutMedia', start: 'top 80%' }
    });
    gsap.fromTo('#aboutMedia img', { yPercent: -10 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '#aboutMedia', start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  /* ============================================================
     mobile menu — curtain drops from the top, links rise through
     masks, burger morphs into an X
     ============================================================ */
  const burger = document.getElementById('burger');
  const mnav = document.getElementById('mnav');
  if (burger && mnav) {
    const links = mnav.querySelectorAll('.mnav-links a span');
    const foot = mnav.querySelector('.mnav-foot');
    gsap.set(foot, { opacity: 0, y: 18 });
    const menuTl = gsap.timeline({
      paused: true,
      onStart: () => {
        mnav.style.visibility = 'visible';
        document.body.classList.add('menu-open');
        if (lenis) lenis.stop();
      },
      onReverseComplete: () => {
        mnav.style.visibility = 'hidden';
        document.body.classList.remove('menu-open');
        if (lenis) lenis.start();
      }
    });
    menuTl
      .to(mnav, { clipPath: 'inset(0% 0 0% 0)', duration: .7, ease: 'power4.inOut' })
      .to(links, { y: 0, duration: .65, stagger: .07, ease: 'power4.out' }, '-=.25')
      .to(foot, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' }, '-=.4');

    let menuOpen = false;
    const setMenu = open => {
      if (open === menuOpen) return;
      menuOpen = open;
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mnav.setAttribute('aria-hidden', String(!open));
      if (open) {
        mnav.style.visibility = 'visible';
        menuTl.timeScale(1).play();
        mnav.querySelector('a').focus({ preventScroll: true });
      } else {
        menuTl.timeScale(1.4).reverse();
        burger.focus({ preventScroll: true });
      }
    };
    burger.addEventListener('click', () => setMenu(!menuOpen));
    addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
    mnav.querySelectorAll('.mnav-links a').forEach(a =>
      a.addEventListener('click', () => setMenu(false)));
  }

  /* ============================================================
     skillset — heading mask, intro rise, rows + chips stagger in
     ============================================================ */
  if (document.getElementById('skRows')) {
    gsap.to('.sk-line', {
      y: 0, duration: .9, ease: 'power4.out',
      scrollTrigger: { trigger: '.skillset', start: 'top 78%' }
    });
    gsap.from('.sk-intro', {
      y: 36, opacity: 0, duration: 1, ease: 'power4.out',
      scrollTrigger: { trigger: '.sk-intro', start: 'top 82%' }
    });
    gsap.utils.toArray('.sk-row').forEach(row => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: row, start: 'top 84%' }
      });
      tl.from(row, { y: 46, opacity: 0, duration: .85, ease: 'power4.out' })
        .from(row.querySelectorAll('.chips span'),
          { y: 14, opacity: 0, duration: .5, stagger: .07, ease: 'power3.out' }, '-=.45');
    });
  }

  /* ============================================================
     services — heading mask, intro rise, rows + button stagger in
     ============================================================ */
  if (document.getElementById('svGrid')) {
    gsap.to('.sv-line', {
      y: 0, duration: .9, ease: 'power4.out',
      scrollTrigger: { trigger: '.services', start: 'top 78%' }
    });
    gsap.from('.sv-intro', {
      y: 36, opacity: 0, duration: 1, ease: 'power4.out',
      scrollTrigger: { trigger: '.sv-intro', start: 'top 82%' }
    });
    // columns rise one after the other, then each column's list ticks in
    const cols = gsap.utils.toArray('.sv-col');
    const gridTl = gsap.timeline({
      scrollTrigger: { trigger: '#svGrid', start: 'top 80%' }
    });
    gridTl.from(cols, { y: 54, opacity: 0, duration: .9, stagger: .14, ease: 'power4.out' });
    cols.forEach((col, i) => {
      gridTl.from(col.querySelectorAll('.sv-list li'),
        { x: -18, opacity: 0, duration: .45, stagger: .06, ease: 'power3.out' }, .35 + i * .14);
    });
  }

  /* ============================================================
     loading screen — name reveals bottom-up, holds, travels to the
     hero headline's exact spot, then the black curtain lifts and
     the white word "becomes" the black one beneath.
     ============================================================ */
  /* Always plays on page open (like the Framer reference), timings taken 1:1
     from its appear config: enter .8s bezier(.75,0,.25,1), handoff at 2.1s
     over 1s bezier(.5,0,.5,1). */
  const loader = document.getElementById('loader');
  if (loader) {
    document.body.classList.add('is-loading');
    if (lenis) lenis.stop();
    window.scrollTo(0, 0);
    const run = () => {
      const word = document.getElementById('loaderName');
      const target = document.querySelector('[data-name]');
      gsap.set(loader, { clipPath: 'inset(0% 0% 0% 0%)' });
      const tl = gsap.timeline({
        onComplete: () => {
          loader.remove();
          document.body.classList.remove('is-loading');
          if (lenis) lenis.start();
        }
      });
      tl.to(word.querySelectorAll('.li'), { y: 0, opacity: 1, duration: .8, stagger: .08, ease: 'power3.inOut' })
        .add(() => {
          // FLIP: same text, same font — a uniform scale from the height ratio lands the
          // glyphs exactly on the hero headline (element boxes differ, text does not).
          const a = word.getBoundingClientRect();
          const b = target.getBoundingClientRect();
          gsap.to(word, {
            x: b.left - a.left, y: b.top - a.top, scale: b.height / a.height,
            duration: 1, ease: 'power2.inOut'
          });
        }, '+=1.3')
        .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: .9, ease: 'power3.inOut' }, '+=1.2');
    };
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('600 1rem Montserrat'), document.fonts.ready])
        .then(run).catch(run);
    } else run();
  }
})();
