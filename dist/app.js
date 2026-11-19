/* BARVIS Studio — interakcije. Sadržaj je vidljiv i bez JavaScript-a; ovo samo dodaje kretanje i udobnosti. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const en = document.documentElement.lang.startsWith('en');
  const L = en
    ? { prev: 'Previous image', next: 'Next image', nextShort: 'Next', image: 'Image', gallery: 'Screenshots', play: 'Play video', watch: 'Watch' }
    : { prev: 'Prethodna slika', next: 'Sledeća slika', nextShort: 'Sledeća', image: 'Slika', gallery: 'Snimci ekrana', play: 'Pusti video', watch: 'Pogledajte' };
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
      video.play().catch(() => {});
      video.focus();
    });
  });

  // Galerija snimaka postaje slajder: jedna velika slika, „sledeća“ uz animaciju zavese.
  document.querySelectorAll('.case-gallery').forEach(gallery => {
    const slides = [...gallery.querySelectorAll(':scope > .shot')];
    if (slides.length < 2) return;

    // Veći snimci: pregledač bira 1440 px verziju umesto 960 px.
    slides.forEach(slide => slide.querySelectorAll('source').forEach(source => {
      source.sizes = slide.classList.contains('shot-phone') ? '(max-width: 760px) 50vw, 420px' : '(max-width: 760px) 100vw, 1440px';
    }));

    const stage = document.createElement('div');
    stage.className = 'slider-stage';
    stage.append(...slides);
    const ui = document.createElement('div');
    ui.className = 'slider-ui';
    ui.innerHTML = `<p class="slider-count" aria-live="polite"><b>01</b> / ${pad(slides.length)}</p>
      <div class="slider-dots"></div>
      <div class="slider-nav"><button type="button" class="slider-prev" aria-label="${L.prev}">${arrow(-1)}</button><button type="button" class="slider-next" aria-label="${L.next}"><span aria-hidden="true">${L.nextShort}</span>${arrow(1)}</button></div>`;
    // Velike strelice preko same slike (vidljive na prelaz mišem).
    const overlay = document.createElement('div');
    overlay.className = 'slider-arrows';
    overlay.innerHTML = `<button type="button" class="slider-arrow is-prev" aria-label="${L.prev}" tabindex="-1">${arrow(-1)}</button><button type="button" class="slider-arrow is-next" aria-label="${L.next}" tabindex="-1">${arrow(1)}</button>`;
    stage.append(overlay);
    gallery.append(stage, ui);
    gallery.classList.add('is-slider');
    gallery.setAttribute('role', 'region');
    gallery.setAttribute('aria-roledescription', 'carousel');
    gallery.setAttribute('aria-label', L.gallery);

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
    gallery.querySelectorAll('.slider-prev, .slider-arrow.is-prev').forEach(b => b.addEventListener('click', () => go(current - 1, -1)));
    gallery.querySelectorAll('.slider-next, .slider-arrow.is-next').forEach(b => b.addEventListener('click', () => go(current + 1, 1)));
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

  const has = selector => document.querySelector(selector) !== null;
  const reveal = (trigger, start = 'top 86%') => ({ trigger, start, once: true });
  // Posle ulaza brišemo GSAP stil, da CSS efekti na prelaz mišem i dalje rade.
  const clean = 'transform,opacity,filter';

  // Jedan orkestriran ulaz na vrhu stranice (glavna stranica ima „hero“, stranice po delatnosti imaju „landing-hero“).
  if (has('.hero')) {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.site-header', { y: -40, opacity: 0, duration: .8, clearProps: clean })
      .from('.hero-kicker', { y: 20, opacity: 0, duration: .55 }, '-=.35')
      .from('.hero-title .line span', { yPercent: 110, duration: 1.1, stagger: .14 }, '-=.3')
      .from('.hero-lead, .hero-actions', { y: 28, opacity: 0, duration: .75, stagger: .1 }, '-=.6')
      .from('.hero-visual', { y: 90, opacity: 0, scale: .94, duration: 1.4, ease: 'expo.out' }, '-=1.2')
      .from('.hv', { opacity: 0, duration: .9, stagger: .18 }, '<');
    gsap.to('.hero-visual', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .8 } });
  } else if (has('.landing-hero')) {
    gsap.from('.landing-hero > *', { y: 36, opacity: 0, stagger: .1, duration: .8, ease: 'power3.out' });
  }

  // Studio: uređaji ulaze iz dubine, telefon prati skrol sporije od laptopa (paralaksa).
  if (has('.device-stage')) {
    gsap.from('.studio-copy > *', { y: 34, opacity: 0, stagger: .1, duration: .75, ease: 'power3.out', scrollTrigger: reveal('.studio-copy', 'top 85%') });
    gsap.from('.laptop', { y: 80, opacity: 0, rotateY: -22, duration: 1.3, ease: 'power3.out', scrollTrigger: reveal('.device-stage', 'top 82%') });
    gsap.from('.phone', { y: 140, opacity: 0, rotate: 12, duration: 1.4, delay: .15, ease: 'power3.out', scrollTrigger: reveal('.device-stage', 'top 82%') });
    gsap.to('.phone', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.device-stage', start: 'top bottom', end: 'bottom top', scrub: .8 } });
  }
  if (has('.about-photo')) {
    gsap.from('.about-photo', { y: 60, opacity: 0, rotate: -2, duration: 1.2, ease: 'power3.out', scrollTrigger: reveal('.about', 'top 78%') });
  }

  // Veliki naslovi se dele na reči koje izranjaju jedna za drugom.
  // (Ne na Google prevodu: tamo bi podela na reči pokvarila prevod rečenice.)
  const splitWords = el => {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const walk = node => [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const outer = document.createElement('span');
          outer.className = 'split-word';
          outer.setAttribute('aria-hidden', 'true');
          const inner = document.createElement('span');
          inner.textContent = part;
          outer.append(inner);
          frag.append(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') walk(child);
    });
    walk(el);
    return el.querySelectorAll('.split-word > span');
  };
  const canSplit = !location.hostname.endsWith('translate.goog');
  const headings = '.studio-copy h2, .deliver-title, .method-intro h2, .about-copy h2, .faq-head h2';
  if (canSplit) {
    gsap.utils.toArray(headings).forEach(el => {
      gsap.from(splitWords(el), { yPercent: 115, rotate: 4, duration: 1.05, stagger: .07, ease: 'expo.out', scrollTrigger: reveal(el, 'top 85%') });
    });
  }

  // Ostali naslovi i uvodi sekcija.
  gsap.utils.toArray(`.manifesto-main, .section-head, .case-intro, .deliver-head .eyebrow, .method-intro > :not(h2), .faq-head > :not(h2), .contact h2${canSplit ? '' : `, ${headings}`}`).forEach(el => {
    gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: reveal(el, 'top 86%') });
  });

  // Video i slajder se otvaraju „zavesom“.
  gsap.utils.toArray('.case-video, .case-gallery, .landing .shot').forEach(el => {
    gsap.from(el, { clipPath: 'inset(12% 5% 12% 5% round .9rem)', y: 50, opacity: 0, duration: 1.2, ease: 'power3.out', clearProps: 'clipPath,transform,opacity', scrollTrigger: reveal(el) });
  });

  [
    ['.audience-grid', '.audience-grid > *', { y: 40 }],
    ['.capability-row', '.capability-row article', { x: 60 }],
    ['.case-tags', '.case-tags li', { y: 16 }],
    ['.contact-bottom', '.contact-bottom > *', { y: 24 }],
  ].forEach(([trigger, targets, from]) => {
    if (!has(trigger)) return;
    gsap.utils.toArray(trigger).forEach(box => {
      gsap.from(box.querySelectorAll(`:scope ${targets.replace(trigger, '').trim()}`), { ...from, opacity: 0, duration: .8, stagger: .1, ease: 'power3.out', clearProps: clean, scrollTrigger: reveal(box) });
    });
  });

  // Šta dobijate: kartice uleću „fijuu“ (pomeraj + nagib + zamućenje), brojevi iskaču.
  if (has('.deliver-grid')) {
    gsap.from('.deliver-grid article', { x: -140, skewX: -10, opacity: 0, filter: 'blur(14px)', duration: 1.15, stagger: .14, ease: 'expo.out', clearProps: clean, scrollTrigger: reveal('.deliver-grid', 'top 84%') });
    gsap.from('.deliver-num', { scale: .3, opacity: 0, duration: .9, stagger: .14, delay: .35, ease: 'back.out(2.4)', clearProps: clean, scrollTrigger: reveal('.deliver-grid', 'top 84%') });
  }

  // Cene: kartice se okreću ka posetiocu jedna za drugom, iznosi „odbrojavaju“ do prave cene.
  if (has('.pricing-grid')) {
    gsap.from('.pricing-grid article', { rotateX: -55, y: 90, opacity: 0, transformOrigin: '50% 100%', duration: 1.1, stagger: .13, ease: 'expo.out', clearProps: clean, scrollTrigger: reveal('.pricing-grid', 'top 84%') });
    const fmt = n => en ? n.toLocaleString('en-GB') : n.toLocaleString('de-DE'); // 2.000 na srpskom, 2,000 na engleskom
    document.querySelectorAll('.pricing-grid .price').forEach((price, i) => {
      const node = [...price.childNodes].find(n => n.nodeType === Node.TEXT_NODE && /\d/.test(n.textContent));
      if (!node) return;
      const original = node.textContent;
      const match = original.match(/\d[\d.,]*/);
      const target = Number(match[0].replace(/[.,]/g, ''));
      const counter = { value: 0 };
      gsap.to(counter, {
        value: target, duration: 1.6, delay: .25 + i * .13, ease: 'power3.out', scrollTrigger: reveal('.pricing-grid', 'top 84%'),
        onUpdate: () => { node.textContent = original.replace(match[0], fmt(Math.round(counter.value))); },
        onComplete: () => { node.textContent = original; },
      });
    });
    gsap.from('.pricing-grid li', { x: -16, opacity: 0, duration: .5, stagger: .04, delay: .5, ease: 'power2.out', clearProps: clean, scrollTrigger: reveal('.pricing-grid', 'top 84%') });
  }

  // Način rada: koraci uleću i iskaču, brojevi se zarotiraju na mesto, linija se puni dok se skroluje.
  if (has('.method ol')) {
    gsap.from('.method li', { x: 120, opacity: 0, scale: .88, filter: 'blur(10px)', duration: 1.05, stagger: .18, ease: 'back.out(1.7)', clearProps: clean, scrollTrigger: reveal('.method ol', 'top 82%') });
    gsap.from('.method li > span', { scale: 0, rotate: -180, duration: .9, stagger: .18, delay: .3, ease: 'back.out(3)', clearProps: clean, scrollTrigger: reveal('.method ol', 'top 82%') });
    gsap.from('.method li b', { y: 24, opacity: 0, duration: .7, stagger: .18, delay: .4, ease: 'power3.out', clearProps: clean, scrollTrigger: reveal('.method ol', 'top 82%') });
    gsap.fromTo('.method ol', { '--progress': 0 }, { '--progress': 1, ease: 'none', scrollTrigger: { trigger: '.method ol', start: 'top 75%', end: 'bottom 55%', scrub: .6 } });
  }

  // O meni: slika se otvara zavesom, okvir „klizne“ na mesto, činjenice uleću sa desne strane.
  if (has('.about-copy')) {
    gsap.from('.about-photo img', { clipPath: 'inset(100% 0 0 0 round .5rem)', scale: 1.25, duration: 1.5, ease: 'expo.out', clearProps: 'clipPath,transform', scrollTrigger: reveal('.about', 'top 75%') });
    gsap.from('.about-copy > p:not(.eyebrow)', { y: 30, opacity: 0, filter: 'blur(6px)', duration: .9, stagger: .14, delay: .35, ease: 'power3.out', clearProps: clean, scrollTrigger: reveal('.about-copy', 'top 80%') });
    gsap.from('.about-facts li', { x: 80, opacity: 0, duration: .8, stagger: .12, ease: 'expo.out', clearProps: clean, scrollTrigger: reveal('.about-facts', 'top 88%') });
    gsap.from('.about-links a', { scale: .6, opacity: 0, duration: .7, stagger: .1, ease: 'back.out(2.2)', clearProps: clean, scrollTrigger: reveal('.about-links', 'top 92%') });
  }

  // Pitanja: svako pitanje se „preklopi“ na mesto, jedno za drugim.
  if (has('.faq-list')) {
    gsap.from('.faq-list details', { rotateX: -80, y: 40, opacity: 0, transformOrigin: '50% 0%', transformPerspective: 900, duration: .9, stagger: .09, ease: 'expo.out', clearProps: clean, scrollTrigger: reveal('.faq-list', 'top 84%') });
    gsap.from('.faq-head .btn-ghost', { scale: .6, opacity: 0, duration: .7, delay: .5, ease: 'back.out(2.2)', clearProps: clean, scrollTrigger: reveal('.faq-head', 'top 85%') });
  }

  addEventListener('pagehide', () => {
    lenis?.destroy();
    visibility?.disconnect();
    removeEventListener('pointermove', parallax);
  }, { once: true });
})();
