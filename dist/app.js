(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    .from('.signal-stage', { scale: .72, opacity: 0, rotate: -18, duration: 1.2 }, '-=1');

  gsap.utils.toArray('.manifesto-main, .section-head, .project-copy, .method-grid, .contact h2').forEach(el => {
    gsap.from(el, { y: 70, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 84%' } });
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
  addEventListener('beforeunload', () => { lenis?.destroy(); removeEventListener('pointermove', move); });
})();
