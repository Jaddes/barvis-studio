(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.site-header');
  const setHeader = () => header?.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', setHeader, { passive: true });
  setHeader();

  const reelButton = document.querySelector('[data-reel-button]');
  reelButton?.addEventListener('click', () => {
    reelButton.setAttribute('aria-pressed', reelButton.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  });

  const observed = document.querySelectorAll('.ticker, .studio-reel, .project');
  const visibility = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-offscreen', !entry.isIntersecting));
  }, { threshold: .01 }) : null;
  observed.forEach(el => visibility?.observe(el));

  if (reduced || !window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);

  let lenis;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro.from('.site-header', { y: -40, opacity: 0, duration: .8 })
    .from('.hero-kicker', { y: 20, opacity: 0, duration: .55 }, '-=.35')
    .from('.hero-title .line span', { yPercent: 110, duration: 1.1, stagger: .14 }, '-=.3')
    .from('.hero-lower', { y: 28, opacity: 0, duration: .75 }, '-=.55')
    .from('.signal-stage', { scale: .72, opacity: 0, rotate: -18, duration: 1.2 }, '-=1')
    .from('.hero-proof span', { x: 16, opacity: 0, stagger: .08, duration: .55 }, '-=.8');

  gsap.to('.hero-media img', { scale: 1.12, yPercent: 5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .8 } });
  gsap.from('.reel-frame', { clipPath: 'inset(12% 8% 12% 8%)', scale: .94, duration: 1.25, ease: 'power3.out', scrollTrigger: { trigger: '.studio-reel', start: 'top 78%' } });
  gsap.from('.reel-copy > *', { y: 34, opacity: 0, stagger: .1, duration: .75, ease: 'power3.out', scrollTrigger: { trigger: '.reel-copy', start: 'top 83%' } });
  gsap.to('.reel-play', { rotate: 8, y: -14, ease: 'none', scrollTrigger: { trigger: '.reel-frame', start: 'top bottom', end: 'bottom top', scrub: .7 } });

  gsap.utils.toArray('.manifesto-main, .section-head, .project-copy, .method-grid, .contact h2').forEach(el => {
    gsap.from(el, { y: 70, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 84%' } });
  });

  const staggerGroups = [
    ['.capability-row', '.capability-row article'],
    ['.method ol', '.method li'],
    ['.project-copy', '.project-copy li'],
    ['.contact-bottom', '.contact-bottom > *'],
    ['footer', 'footer > *'],
  ];
  staggerGroups.forEach(([trigger, targets]) => {
    const root = document.querySelector(trigger);
    if (!root) return;
    gsap.from(targets, {
      y: 24,
      opacity: 0,
      duration: .72,
      stagger: .09,
      ease: 'power2.out',
      scrollTrigger: { trigger: root, start: 'top 86%', once: true },
    });
  });

  gsap.utils.toArray('.project-meta').forEach(meta => {
    gsap.from(meta.children, {
      y: 16,
      opacity: 0,
      stagger: .12,
      duration: .65,
      ease: 'power2.out',
      scrollTrigger: { trigger: meta, start: 'top 90%', once: true },
    });
  });

  gsap.to('.hero-media-scan', {
    xPercent: 9.8,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
  });
  gsap.utils.toArray('.project-visual').forEach((el, i) => {
    const win = el.querySelector('.product-window');
    gsap.from(win, { yPercent: 20, rotate: i ? 3 : -5, scale: .88, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 78%' } });
    gsap.to(el.querySelector('.project-number'), { yPercent: -18, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: .8 } });
  });

  const stage = document.querySelector('.signal-stage');
  const move = e => {
    if (matchMedia('(pointer:coarse)').matches) return;
    gsap.to(stage, { x: (e.clientX / innerWidth - .5) * 28, y: (e.clientY / innerHeight - .5) * 28, duration: .8, overwrite: true });
  };
  addEventListener('pointermove', move, { passive: true });
  const cleanup = () => {
    lenis?.destroy();
    visibility?.disconnect();
    removeEventListener('pointermove', move);
    removeEventListener('scroll', setHeader);
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    gsap.killTweensOf('*');
  };
  addEventListener('pagehide', cleanup, { once: true });
})();
