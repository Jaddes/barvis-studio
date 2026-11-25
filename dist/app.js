/* BARVIS Studio — interakcije. Sadržaj je vidljiv i bez JavaScript-a; ovo samo dodaje kretanje i udobnosti. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const I18N = (() => { try { return JSON.parse(document.getElementById('i18n')?.textContent || 'null'); } catch (_) { return null; } })() || {};
  const LOCALE = I18N.locale || 'sr-Latn';
  const L = I18N.app || { prev: 'Prethodna slika', next: 'Sledeća slika', image: 'Slika', gallery: 'Snimci ekrana', play: 'Pusti video', watch: 'Pogledajte' };
  const pad = n => String(n).padStart(2, '0');
  const arrow = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d > 0 ? 'M5 12h14M13 6l6 6-6 6' : 'M19 12H5M11 6l-6 6 6 6'}"/></svg>`;

  // Zaglavlje dobija pozadinu posle prvog skrolovanja.
  const header = document.querySelector('.site-header');
  const setHeader = () => header?.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', setHeader, { passive: true });
  setHeader();

  // Meni za jezik se zatvara klikom van njega ili tasterom Escape.
  const langMenu = document.querySelector('.lang-menu');
  if (langMenu) {
    document.addEventListener('click', event => { if (langMenu.open && !langMenu.contains(event.target)) langMenu.open = false; });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && langMenu.open) { langMenu.open = false; langMenu.querySelector('summary').focus(); }
    });
  }

  // Kopiranje mejl adrese (dugme se prikazuje samo kada pregledač to podržava).
  const copyButton = document.querySelector('[data-copy]');
  const copyStatus = document.querySelector('.copy-status');
  if (copyButton && navigator.clipboard?.writeText) {
    copyButton.hidden = false;
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyButton.dataset.copy);
        copyStatus.textContent = copyButton.dataset.copied || 'Adresa je kopirana.';
      } catch {
        copyStatus.textContent = `${copyButton.dataset.copyFailed || 'Kopiranje nije uspelo. Adresa:'} ${copyButton.dataset.copy}`;
      }
      setTimeout(() => { copyStatus.textContent = ''; }, 4000);
    });
  }

  // Traka usluga pauzira kad nije na ekranu (manje rada za procesor).
  const visibility = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('is-offscreen', !entry.isIntersecting)), { threshold: .01 })
    : null;
  document.querySelectorAll('.ticker').forEach(el => visibility?.observe(el));

  // Naslovne slike videa (data-poster) se učitavaju tek kad video priđe ekranu, ne pri prvom učitavanju stranice.
  const posters = [...document.querySelectorAll('video[data-poster]')];
  const showPoster = video => { video.poster = video.dataset.poster; video.removeAttribute('data-poster'); };
  if ('IntersectionObserver' in window) {
    const posterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { posterObserver.unobserve(entry.target); showPoster(entry.target); }
    }), { rootMargin: '600px 0px' });
    posters.forEach(video => posterObserver.observe(video));
  } else posters.forEach(showPoster);

  // Video: veliko dugme preko naslovne slike; kontrole se pojavljuju tek kad video krene.
  document.querySelectorAll('.case-video video').forEach(video => {
    const frame = document.createElement('div');
    frame.className = 'video-frame';
    video.before(frame);
    frame.append(video);
    video.controls = false;
    const seconds = video.closest('figure')?.querySelector('figcaption b')?.textContent.match(/\d+/)?.[0];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'play-btn';
    button.setAttribute('aria-label', L.play);
    button.innerHTML = `<span class="play-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5v17l14-8.5z"/></svg></span><span class="play-label" aria-hidden="true">${L.watch}${seconds ? ` · ${seconds} s` : ''}</span>`;
    frame.append(button);
    button.addEventListener('click', () => {
      video.controls = true;
      video.volume = .7; // muzika je podloga, ne treba da iznenadi
      button.remove();
      video.play().catch(() => { video.controls = true; });
      video.focus();
    });
  });

  // Galerija snimaka postaje slajder: jedna velika slika, „sledeća“ uz animaciju zavese.
  document.querySelectorAll('.case-gallery').forEach(gallery => {
    const slides = [...gallery.querySelectorAll(':scope > .shot')];
    if (slides.length < 2) return;

    // Snimci postoje do 3840 px; pregledač bira veličinu prema stvarnoj širini slajdera i gustini ekrana.
    slides.forEach(slide => slide.querySelectorAll('source').forEach(source => {
      source.sizes = slide.classList.contains('shot-phone') ? '(max-width: 1000px) 45vw, 22vw' : '(max-width: 1000px) 100vw, 48vw';
    }));

    const stage = document.createElement('div');
    stage.className = 'slider-stage';
    stage.append(...slides);
    const ui = document.createElement('div');
    ui.className = 'slider-ui';
    ui.innerHTML = `<p class="slider-count" aria-live="polite"><b>01</b> / ${pad(slides.length)}</p>
      <div class="slider-dots"></div>`;
    // Nazad/napred su preko same slike i pojavljuju se tek na prelaz mišem (na telefonu su uvek vidljivi).
    const nav = document.createElement('div');
    nav.className = 'slider-arrows';
    nav.innerHTML = `<button type="button" class="slider-arrow slider-prev" aria-label="${L.prev}">${arrow(-1)}</button><button type="button" class="slider-arrow slider-next" aria-label="${L.next}">${arrow(1)}</button>`;
    stage.append(nav);
    gallery.append(stage, ui);
    gallery.classList.add('is-slider');
    gallery.setAttribute('role', 'region');
    gallery.setAttribute('aria-roledescription', 'carousel');
    // Svaka galerija dobija jedinstven naziv (npr. „Snimci ekrana: Fizio Alfa“).
    const project = gallery.closest('.case')?.querySelector('.project-meta span')?.textContent.split('·').pop().trim();
    gallery.setAttribute('aria-label', project ? `${L.gallery}: ${project}` : L.gallery);

    const count = ui.querySelector('.slider-count b');
    const dotsBox = ui.querySelector('.slider-dots');
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `${L.image} ${i + 1}`);
      dot.addEventListener('click', () => go(i, i > current ? 1 : -1));
      dotsBox.append(dot);
      return dot;
    });

    let current = 0;
    const sync = () => {
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === current);
        slide.setAttribute('aria-hidden', String(i !== current));
      });
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
      count.textContent = pad(current + 1);
    };
    const curtain = 'cubic-bezier(.77, 0, .18, 1)';
    const go = (next, dir) => {
      next = (next + slides.length) % slides.length;
      if (next === current) return;
      const from = slides[current];
      const to = slides[next];
      current = next;
      sync();
      if (reduced || !to.animate) return;
      from.classList.add('is-leaving');
      const leave = from.animate(
        [{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 5}%) scale(.94)`, opacity: .2 }],
        { duration: 850, easing: curtain });
      leave.onfinish = leave.oncancel = () => from.classList.remove('is-leaving');
      to.animate(
        [{ clipPath: dir > 0 ? 'inset(0 0 0 100% round .9rem)' : 'inset(0 100% 0 0 round .9rem)' }, { clipPath: 'inset(0 0 0 0 round .9rem)' }],
        { duration: 850, easing: curtain });
      to.querySelector('img')?.animate(
        [{ transform: `scale(1.14) translateX(${dir * 4}%)` }, { transform: 'none' }],
        { duration: 1150, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      to.querySelector('figcaption')?.animate(
        [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
        { duration: 600, delay: 320, easing: 'ease-out', fill: 'backwards' });
    };
    nav.querySelector('.slider-prev').addEventListener('click', () => go(current - 1, -1));
    nav.querySelector('.slider-next').addEventListener('click', () => go(current + 1, 1));
    gallery.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); go(current + 1, 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); go(current - 1, -1); }
    });
    // Prevlačenje prstom levo/desno; običan klik na sliku vodi na sledeću.
    let startX = null;
    stage.addEventListener('pointerdown', event => { startX = event.target.closest('button') ? null : event.clientX; });
    stage.addEventListener('pointerup', event => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 45) go(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      else if (event.target.closest('picture')) go(current + 1, 1);
    });
    sync();
  });

  // Uvod: slojevi ekrana blago prate miš (CSS promenljive, bez prepisivanja 3D nagiba).
  const heroVisual = document.querySelector('.hero-visual');
  const parallax = event => {
    heroVisual.style.setProperty('--px', (event.clientX / innerWidth - .5).toFixed(3));
    heroVisual.style.setProperty('--py', (event.clientY / innerHeight - .5).toFixed(3));
  };
  if (heroVisual && finePointer && !reduced) addEventListener('pointermove', parallax, { passive: true });

  /* Pokret samo tamo gde nosi poruku, i svaki ključni trenutak drugom tehnikom:
     1) uvod: redovi naslova izlaze iz maske (jednom, pri otvaranju)
     2) „haos → red“: razbacane beleške, tabele i poruke se pri skrolu slažu u kalendar (vezano za skrol)
     3) radovi: snimak projekta se otvara zavesom
     4) kako radimo: linija procesa se iscrta kroz korake
     Bez zamućenja, bez „iskakanja“, bez odbrojavanja i bez animacije na svakoj kartici. */
  const board = document.querySelector('[data-chaos]');
  if (board && !reduced) {
    // Bez JavaScripta (ili sa smanjenim pokretom) tabla je već sređena (--p: 1).
    board.style.setProperty('--p', '0');
    const update = () => {
      const r = board.getBoundingClientRect();
      // 0 kad tabla tek uđe odozdo, 1 kad stigne do gornje trećine ekrana.
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * .62 + r.height * .35)));
      board.style.setProperty('--p', p.toFixed(3));
      board.classList.toggle('is-sorted', p > .97);
    };
    addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update();
  }

  // Cene se „učitaju“: iznos odbroji do prave vrednosti kad red uđe u ekran (jednom, brojevi iste širine).
  if (!reduced && 'IntersectionObserver' in window) {
    const fmt = n => n.toLocaleString(LOCALE);
    const counters = [...document.querySelectorAll('.ledger strong, .price')].map(el => {
      const node = [...el.childNodes].find(n => n.nodeType === Node.TEXT_NODE && /\d/.test(n.textContent));
      if (!node) return null;
      const original = node.textContent, match = original.match(/\d[\d.,]*/);
      return { el, node, original, match: match[0], target: Number(match[0].replace(/[.,]/g, '')) };
    }).filter(Boolean);
    const run = c => {
      const start = performance.now(), dur = 1100;
      const tick = now => {
        const t = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - t, 3);
        c.node.textContent = c.original.replace(c.match, fmt(Math.round(c.target * eased)));
        if (t < 1) requestAnimationFrame(tick); else c.node.textContent = c.original;
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      const c = counters.find(x => x.el === entry.target);
      if (c) setTimeout(() => run(c), counters.indexOf(c) % 5 * 90);
    }), { threshold: .6 });
    counters.forEach(c => { c.node.textContent = c.original.replace(c.match, fmt(0)); io.observe(c.el); });
  }

  if (reduced || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const has = selector => document.querySelector(selector) !== null;
  const once = (trigger, start = 'top 82%') => ({ trigger, start, once: true });

  if (has('.hero')) {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.hero-title .line > span', { yPercent: 105, duration: .9, stagger: .08, clearProps: 'transform' })
      .from('.hero-lead, .hero-actions, .hero-proof', { opacity: 0, duration: .6, stagger: .06, clearProps: 'opacity' }, '-=.45')
      .from('.hero-visual', { opacity: 0, y: 24, duration: 1, clearProps: 'opacity,transform' }, '-=.7');
  }

  gsap.utils.toArray('.work-shot').forEach(el => {
    gsap.from(el, { clipPath: 'inset(0 0 100% 0 round .7rem)', duration: 1.1, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: once(el, 'top 88%') });
  });
  gsap.utils.toArray('.case-video, .case-gallery').forEach(el => {
    gsap.from(el, { clipPath: 'inset(10% 6% 10% 6% round .9rem)', duration: 1.1, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: once(el, 'top 85%') });
  });

  // Kako radimo: linija ide kroz korake, a broj se „protrese“ i upali tačno kada linija stigne do njega.
  if (has('.steps')) {
    const list = document.querySelector('.steps'), items = [...list.querySelectorAll('li')], n = items.length, dur = .5 * n + .3;
    list.classList.add('is-armed');
    const tl = gsap.timeline({ scrollTrigger: once(list, 'top 75%') });
    tl.fromTo(list, { '--progress': 0 }, { '--progress': 1, duration: dur, ease: 'none' }, 0);
    items.forEach((li, i) => tl.call(() => li.classList.add('is-hit'), null, n > 1 ? dur * i / (n - 1) : 0));
  }

  addEventListener('pagehide', () => {
    visibility?.disconnect();
    removeEventListener('pointermove', parallax);
  }, { once: true });
})();
