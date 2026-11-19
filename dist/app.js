/* BARVIS Studio — interakcije. Sadržaj je vidljiv i bez JavaScript-a; ovo samo dodaje kretanje i udobnosti. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Zaglavlje dobija pozadinu posle prvog skrolovanja.
  const header = document.querySelector('.site-header');
  const setHeader = () => header?.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', setHeader, { passive: true });
  setHeader();

  // Kopiranje mejl adrese (dugme se prikazuje samo kada pregledač to podržava).
  const copyButton = document.querySelector('[data-copy]');
  const copyStatus = document.querySelector('.copy-status');
  if (copyButton && navigator.clipboard?.writeText) {
    copyButton.hidden = false;
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyButton.dataset.copy);
        copyStatus.textContent = 'Adresa je kopirana.';
      } catch {
        copyStatus.textContent = `Kopiranje nije uspelo. Adresa: ${copyButton.dataset.copy}`;
      }
      setTimeout(() => { copyStatus.textContent = ''; }, 4000);
    });
  }

  // Traka usluga i projekti pauziraju animaciju kad nisu na ekranu (manje rada za procesor).
  const visibility = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('is-offscreen', !entry.isIntersecting)), { threshold: .01 })
    : null;
  document.querySelectorAll('.ticker, .project').forEach(el => visibility?.observe(el));

  if (reduced || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  let lenis;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    // Linkovi na sekcije (#…) idu kroz Lenis, a fokus prati odredište (tastatura, čitač ekrana).
    document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: link.getAttribute('href') === '#top' ? 0 : -72 });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      history.replaceState(null, '', link.getAttribute('href'));
    }));
  }

  // Jedan orkestriran ulaz na vrhu stranice.
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.site-header', { y: -40, opacity: 0, duration: .8 })
    .from('.hero-kicker', { y: 20, opacity: 0, duration: .55 }, '-=.35')
    .from('.hero-title .line span', { yPercent: 110, duration: 1.1, stagger: .14 }, '-=.3')
    .from('.hero-lower', { y: 28, opacity: 0, duration: .75 }, '-=.55')
    .from('.signal-stage', { scale: .72, opacity: 0, rotate: -18, duration: 1.2 }, '-=1')
    .from('.hero-proof span', { x: 16, opacity: 0, stagger: .08, duration: .55 }, '-=.8');

  gsap.to('.hero-media img', { scale: 1.12, yPercent: 5, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .8 } });
  gsap.to('.hero-media-scan', { xPercent: 9.8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
  // Studio: uređaji ulaze iz dubine, telefon prati skrol sporije od laptopa (paralaksa).
  gsap.from('.studio-copy > *', { y: 34, opacity: 0, stagger: .1, duration: .75, ease: 'power3.out', scrollTrigger: { trigger: '.studio-copy', start: 'top 85%', once: true } });
  gsap.from('.laptop', { y: 80, opacity: 0, rotateY: -22, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: '.device-stage', start: 'top 82%', once: true } });
  gsap.from('.phone', { y: 140, opacity: 0, rotate: 12, duration: 1.4, delay: .15, ease: 'power3.out', scrollTrigger: { trigger: '.device-stage', start: 'top 82%', once: true } });
  gsap.to('.phone', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.device-stage', start: 'top bottom', end: 'bottom top', scrub: .8 } });

  // Snimci ekrana se otkrivaju „zavesom“.
  gsap.utils.toArray('.shot').forEach(shot => {
    gsap.from(shot, { clipPath: 'inset(14% 6% 14% 6% round .5rem)', y: 40, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: shot, start: 'top 86%', once: true } });
  });

  gsap.utils.toArray('.manifesto-main, .section-head, .case-intro, .project-copy, .method-grid, .contact h2').forEach(el => {
    gsap.from(el, { y: 70, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 84%', once: true } });
  });
  [
    ['.audience-grid', '.audience-grid article'],
    ['.capability-row', '.capability-row article'],
    ['.deliver-grid', '.deliver-grid article'],
    ['.faq-list', '.faq-list details'],
    ['.case-tags', '.case-tags li'],
    ['.method ol', '.method li'],
    ['.contact-bottom', '.contact-bottom > *'],
  ].forEach(([trigger, targets]) => {
    if (!document.querySelector(trigger)) return;
    gsap.from(targets, { y: 24, opacity: 0, duration: .72, stagger: .09, ease: 'power2.out', scrollTrigger: { trigger, start: 'top 86%', once: true } });
  });
  gsap.utils.toArray('.project-visual').forEach((el, index) => {
    gsap.from(el.querySelector('.product-window'), { yPercent: 20, rotate: index ? 3 : -5, scale: .88, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 78%', once: true } });
    gsap.to(el.querySelector('.project-number'), { yPercent: -18, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: .8 } });
  });

  // Signal u uvodu blago prati pokazivač (samo miš, ne dodir).
  const stage = document.querySelector('.signal-stage');
  const finePointer = matchMedia('(pointer: fine)').matches;
  const move = event => gsap.to(stage, { x: (event.clientX / innerWidth - .5) * 28, y: (event.clientY / innerHeight - .5) * 28, duration: .8, overwrite: true });
  if (stage && finePointer) addEventListener('pointermove', move, { passive: true });

  addEventListener('pagehide', () => {
    lenis?.destroy();
    visibility?.disconnect();
    removeEventListener('pointermove', move);
  }, { once: true });
})();
