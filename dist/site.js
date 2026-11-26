/* BARVIS Studio — navigacija i motion momenti (GSAP). Skrol je uvek prirodan (bez Lenisa).
   Sadržaj je potpun i bez ovog fajla: početna stanja animacija postoje samo dok je <html class="anim">. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.site-header');

  /* ---------- zaglavlje ---------- */
  const onScroll = () => header?.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- mobilni meni (dijalog sa zarobljenim fokusom) ---------- */
  const menuBtn = document.querySelector('.menu-btn[aria-controls]');
  const menu = document.getElementById('mobile-menu');
  const setMenu = open => {
    if (!menu) return;
    menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    (open ? menu.querySelector('a, button') : menuBtn).focus();
  };
  menuBtn?.addEventListener('click', () => setMenu(menu.hidden));
  menu?.querySelector('.menu-close')?.addEventListener('click', () => setMenu(false));
  menu?.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  menu?.addEventListener('keydown', e => {
    if (e.key === 'Escape') return setMenu(false);
    if (e.key !== 'Tab') return;
    const f = [...menu.querySelectorAll('a, button, summary')].filter(x => x.offsetParent);
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  });
  document.querySelectorAll('details.lang').forEach(d => document.addEventListener('click', e => { if (!d.contains(e.target)) d.open = false; }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('details.lang[open]').forEach(d => { d.open = false; d.querySelector('summary').focus(); }); });

  /* ---------- donja traka sa CTA (telefon) ---------- */
  const thumb = document.querySelector('[data-thumb]');
  const hero = document.querySelector('.hero, .case-top, .start-top, .page-head');
  const forms = document.querySelectorAll('form, .cta-final');
  if (thumb && hero && 'IntersectionObserver' in window) {
    let heroGone = false, formVisible = false;
    const sync = () => {
      const on = heroGone && !formVisible;
      thumb.classList.toggle('is-on', on); thumb.setAttribute('aria-hidden', String(!on));
      thumb.querySelectorAll('a').forEach(a => a.tabIndex = on ? 0 : -1);
    };
    new IntersectionObserver(([e]) => { heroGone = !e.isIntersecting; sync(); }).observe(hero);
    const seen = new Set();
    const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)); formVisible = seen.size > 0; sync(); });
    forms.forEach(f => io.observe(f));
  }

  /* ---------- slike koje se nisu učitale ---------- */
  document.querySelectorAll('.screen img').forEach(img => {
    const fail = () => img.closest('.screen').classList.add('is-broken');
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail(); else img.addEventListener('error', fail, { once: true });
  });

  /* ---------- video u studiji: dugme tačno u centru, poster dok se ne pusti ---------- */
  document.querySelectorAll('[data-film]').forEach(film => {
    const video = film.querySelector('video'), btn = film.querySelector('.film-play');
    btn?.addEventListener('click', async () => {
      film.classList.add('is-playing'); video.controls = true;
      try { await video.play(); video.focus(); } catch (_) { film.classList.remove('is-playing'); }
    });
    video?.addEventListener('error', () => film.classList.add('is-broken'), true);
    video?.querySelector('source')?.addEventListener('error', () => film.classList.add('is-broken'));
  });

  /* ---------- anchor linkovi: posle skrola fokus ide na cilj ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    const focus = () => { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); };
    target.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' }); focus();
    history.pushState(null, '', a.hash);
  });

  /* ---------- linije toka u heroju: od papira do tačke u stvarnom ekranu ---------- */
  const lines = document.querySelector('[data-lines]');
  const drawLines = () => {
    if (!lines) return;
    const stage = lines.parentElement, s = stage.getBoundingClientRect(), scr = stage.querySelector('.screen-main').getBoundingClientRect();
    const to = lines.dataset.to.split(' ').map(p => p.split(',').map(Number));
    lines.setAttribute('viewBox', `0 0 ${s.width} ${s.height}`);
    lines.innerHTML = [...stage.querySelectorAll('.art')].map((art, i) => {
      const a = art.getBoundingClientRect();
      const x1 = a.right - s.left - 6, y1 = a.top + a.height / 2 - s.top;
      const x2 = scr.left - s.left + scr.width * to[i][0], y2 = scr.top - s.top + scr.height * to[i][1];
      const dx = Math.max(30, (x2 - x1) * 0.55);
      return `<path pathLength="1" d="M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}"/><circle class="from" cx="${x1}" cy="${y1}" r="3"/><circle cx="${x2}" cy="${y2}" r="5"/>`;
    }).join('');
  };
  if (lines) {
    drawLines();
    let last = lines.parentElement.offsetWidth + 'x' + lines.parentElement.offsetHeight;
    new ResizeObserver(([e]) => { const k = Math.round(e.contentRect.width) + 'x' + Math.round(e.contentRect.height); if (k !== last) { last = k; drawLines(); } }).observe(lines.parentElement);
  }

  /* ---------- pokret ---------- */
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST || reduce.matches) { root.classList.add('no-anim'); return; }
  gsap.registerPlugin(ST);
  root.classList.add('anim');

  document.addEventListener('visibilitychange', () => document.hidden ? gsap.ticker.sleep() : gsap.ticker.wake());
  addEventListener('pagehide', () => { ST.getAll().forEach(t => t.kill()); });

  const mm = gsap.matchMedia();

  // 1) Hero: redovi naslova izlaze iz maske, rasuti papiri padaju na mesto, linije se iscrtavaju ka sistemu.
  const heroEl = document.querySelector('.hero');
  if (heroEl) {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.hero-title .row > span', { y: 0, duration: 0.7, stagger: 0.08 })
      .from('.hero .art', { autoAlpha: 0, y: -24, duration: 0.5, stagger: 0.07 }, 0.15)
      .from('.hero .stage-lines circle', { autoAlpha: 0, duration: 0.2, stagger: 0.04 }, 0.5)
      .fromTo('.hero .stage-lines path', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, stagger: 0.08, ease: 'power2.inOut' }, 0.45);
  }

  // 2) Priča: rasuti papiri → zapisi → stvarni ekran. Desktop: sticky scena, koraci levo pokreću stanja.
  const story = document.querySelector('[data-story]');
  if (story) {
    const steps = [...story.querySelectorAll('[data-step]')];
    const arts = story.querySelectorAll('.s-before .art');
    const records = story.querySelector('.records');
    const result = story.querySelector('.story-result');
    const mark = i => steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    mm.add('(min-width: 1100px)', () => {
      gsap.set(records, { opacity: 0 }); gsap.set(result, { opacity: 0, y: 40 });
      // Aktivan korak = onaj koji prolazi sredinu ekrana.
      steps.forEach((s, i) => ST.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: self => self.isActive && mark(i) }));
      const tl = gsap.timeline({ scrollTrigger: { trigger: story.querySelector('.story-steps'), start: 'top 55%', end: 'bottom 70%', scrub: 0.6 } });
      tl.to(arts, { rotation: 0, x: (i) => ['8%', '-60%', '-40%'][i], y: (i) => ['0%', '20%', '-90%'][i], scale: 0.9, duration: 1 })
        .to(arts, { opacity: 0, duration: 0.4 }, 1)
        .to(records, { opacity: 1, duration: 0.4 }, 1.05)
        .from(records.children, { x: -30, opacity: 0, stagger: 0.12, duration: 0.5 }, 1.05)
        .to(records, { opacity: 0, y: -40, duration: 0.5 }, 2.1)
        .to(result, { opacity: 1, y: 0, duration: 0.6 }, 2.2);
      return () => { gsap.set([arts, records, result, records.children], { clearProps: 'all' }); };
    });
    mm.add('(max-width: 1099px)', () => { root.classList.add('no-anim-story'); story.classList.add('no-anim'); mark(-1); return () => story.classList.remove('no-anim'); });
  }

  // 4) Proces: linija se iscrtava kroz pet koraka (samo desktop, gde su koraci u redu).
  mm.add('(min-width: 1100px)', () => {
    const line = document.querySelector('.process-line .draw');
    if (line) gsap.fromTo(line, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 80%', end: 'bottom 55%', scrub: 0.5 } });
  });

  // 3) Studija: zavesa otvara film.
  document.querySelectorAll('.film').forEach(film => {
    gsap.to(film, { clipPath: 'inset(0% 0% 0% 0% round 18px)', ease: 'power2.out', scrollTrigger: { trigger: film, start: 'top 85%', end: 'top 35%', scrub: 0.5 } });
  });
})();
