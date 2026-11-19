/* BARVIS Studio — interakcije. Sadržaj je vidljiv i bez JavaScript-a; ovo samo dodaje kretanje i udobnosti. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const en = document.documentElement.lang.startsWith('en');
  const L = en
    ? { prev: 'Previous image', next: 'Next image', image: 'Image', gallery: 'Screenshots', play: 'Play video', watch: 'Watch' }
    : { prev: 'Prethodna slika', next: 'Sledeća slika', image: 'Slika', gallery: 'Snimci ekrana', play: 'Pusti video', watch: 'Pogledajte' };
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

  // Ključne reči: kad pasus uđe u ekran, podvlače se jedna za drugom (na prelaz mišem ih „markira“ CSS).
  if (!reduced && 'IntersectionObserver' in window) {
    const kwObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      kwObserver.unobserve(entry.target);
      entry.target.querySelectorAll('.kw').forEach((kw, i) => setTimeout(() => {
        kw.classList.remove('kw-wait');
        kw.classList.add('kw-pulse');
        kw.addEventListener('animationend', () => kw.classList.remove('kw-pulse'), { once: true });
      }, 500 + i * 220));
    }), { threshold: .35 });
    document.querySelectorAll('.studio-copy, .about-copy').forEach(box => {
      box.querySelectorAll('.kw').forEach(kw => kw.classList.add('kw-wait'));
      kwObserver.observe(box);
    });
  }

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
  // Naslov uvoda („Digital systems, made human.“) deli se na reči: izranjaju pri učitavanju i reaguju na miš.
  const canSplit = !location.hostname.endsWith('translate.goog');
  const heroTitle = document.querySelector('.hero-title');
  const heroWords = heroTitle && canSplit ? splitWords(heroTitle) : '.hero-title .line > span';

  // Jedan orkestriran ulaz na vrhu stranice (glavna stranica ima „hero“, stranice po delatnosti imaju „landing-hero“).
  if (has('.hero')) {
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .from('.site-header', { y: -40, opacity: 0, duration: .8, clearProps: clean })
      .from('.hero-kicker', { y: 20, opacity: 0, duration: .55 }, '-=.35')
      .from(heroWords, { yPercent: 115, rotate: 4, duration: 1.1, stagger: .09, ease: 'expo.out', clearProps: 'transform' }, '-=.3')
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

  const headings = '.studio-copy h2, .deliver-title, .method-intro h2, .about-copy h2';
  if (canSplit) {
    gsap.utils.toArray(headings).forEach(el => {
      gsap.from(splitWords(el), { yPercent: 115, rotate: 4, duration: 1.05, stagger: .07, ease: 'expo.out', clearProps: 'transform', scrollTrigger: reveal(el, 'top 85%') });
    });
  }

  // Ostali naslovi i uvodi sekcija.
  gsap.utils.toArray(`.manifesto-main, .section-head, .case-intro, .deliver-head .eyebrow, .method-intro > :not(h2), .faq-head > *, .contact h2${canSplit ? '' : `, ${headings}`}`).forEach(el => {
    gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: reveal(el, 'top 86%') });
  });

  // Video i slajder se otvaraju „zavesom“.
  gsap.utils.toArray('.case-video, .case-gallery, .landing .shot').forEach(el => {
    gsap.from(el, { clipPath: 'inset(12% 5% 12% 5% round .9rem)', y: 50, opacity: 0, duration: 1.2, ease: 'power3.out', clearProps: 'clipPath,transform,opacity', scrollTrigger: reveal(el) });
  });

  // „Fijuu“ ulaz, isti stil kao u sekciji 03: pomeraj + nagib + zamućenje, element za elementom.
  const swoosh = (targets, trigger, { from = 'left', start = 'top 82%', ...extra } = {}) => {
    const els = gsap.utils.toArray(targets);
    if (!els.length) return;
    const d = from === 'right' ? 1 : -1;
    gsap.from(els, { x: 140 * d, skewX: 10 * d, opacity: 0, filter: 'blur(14px)', duration: 1.15, stagger: .14, ease: 'expo.out', clearProps: clean, scrollTrigger: reveal(trigger, start), ...extra });
  };
  const pop = (targets, trigger, extra = {}) => {
    if (!gsap.utils.toArray(targets).length) return;
    gsap.from(targets, { scale: .3, opacity: 0, duration: .9, stagger: .14, delay: .35, ease: 'back.out(2.4)', clearProps: clean, scrollTrigger: reveal(trigger, 'top 82%'), ...extra });
  };

  swoosh('.audience-grid > *', '.audience-grid');
  swoosh('.capability-row article', '.capability-row', { from: 'right' });
  // Manje važni delovi (činjenice, oznake, kontakt) se samo tiho pojave, bez „fijuu“.
  gsap.utils.toArray('.studio-facts, .case-tags, .contact-bottom').forEach(el => gsap.from(el, { y: 24, opacity: 0, duration: .8, ease: 'power2.out', clearProps: clean, scrollTrigger: reveal(el, 'top 90%') }));

  // 03 Šta dobijate: original „fijuu“ + brojevi iskaču.
  swoosh('.deliver-grid article', '.deliver-grid', { start: 'top 84%' });
  pop('.deliver-num', '.deliver-grid');

  // 04 Cene: isti ulaz, oznaka „Najčešće“ iskoči, iznosi odbrojavaju do prave cene.
  if (has('.pricing-grid')) {
    swoosh('.pricing-grid article', '.pricing-grid', { start: 'top 78%' });
    pop('.pricing-badge', '.pricing-grid', { delay: .7, rotate: -20 });
    const fmt = n => en ? n.toLocaleString('en-GB') : n.toLocaleString('de-DE'); // 2.000 na srpskom, 2,000 na engleskom
    document.querySelectorAll('.pricing-grid .price').forEach((price, i) => {
      const node = [...price.childNodes].find(n => n.nodeType === Node.TEXT_NODE && /\d/.test(n.textContent));
      if (!node) return;
      const original = node.textContent;
      const match = original.match(/\d[\d.,]*/);
      const target = Number(match[0].replace(/[.,]/g, ''));
      const counter = { value: 0 };
      gsap.to(counter, {
        value: target, duration: 1.6, delay: .3 + i * .14, ease: 'power3.out', scrollTrigger: reveal('.pricing-grid', 'top 78%'),
        onUpdate: () => { node.textContent = original.replace(match[0], fmt(Math.round(counter.value))); },
        onComplete: () => { node.textContent = original; },
      });
    });
  }

  // 05 Način rada: koraci uleću sa desne strane, brojevi iskaču, a linija se puni do kraja zajedno sa njima
  // (ne zavisi od skrolovanja, pa nikad ne ostane zaglavljena između koraka).
  if (has('.method ol')) {
    const steps = document.querySelectorAll('.method li').length;
    swoosh('.method li', '.method ol', { from: 'right', stagger: .2 });
    pop('.method li > span', '.method ol', { rotate: -180, stagger: .2, delay: .25, ease: 'back.out(3)' });
    gsap.fromTo('.method ol', { '--progress': 0 }, { '--progress': 1, duration: .2 * (steps - 1) + .9, delay: .25, ease: 'power2.inOut', scrollTrigger: reveal('.method ol', 'top 82%') });
  }

  // 06 O meni: slika se otvara zavesom, tekst i činjenice uleću, dugmad iskaču.
  if (has('.about-copy')) {
    gsap.from('.about-photo img', { clipPath: 'inset(100% 0 0 0 round .5rem)', scale: 1.25, duration: 1.5, ease: 'expo.out', clearProps: 'clipPath,transform', scrollTrigger: reveal('.about', 'top 75%') });
    swoosh('.about-copy > p:not(.eyebrow)', '.about-copy', { from: 'right', delay: .2, start: 'top 80%' });
    swoosh('.about-facts li', '.about-facts', { from: 'right', stagger: .12, start: 'top 88%' });
    pop('.about-links a', '.about-links', { delay: .1 });
  }

  // 07 Pitanja: pitanja uleću jedno za drugim, dugme iskoči.
  if (has('.faq-list')) {
    swoosh('.faq-list details', '.faq-list', { from: 'right', stagger: .09 });
    pop('.faq-head .btn-ghost', '.faq-head', { delay: .5 });
  }

  addEventListener('pagehide', () => {
    lenis?.destroy();
    visibility?.disconnect();
    removeEventListener('pointermove', parallax);
  }, { once: true });
})();
