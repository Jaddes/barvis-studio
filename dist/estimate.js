/* BARVIS Studio — procena projekta i mobilni meni.
   Procena koristi samo cene iz cenovnika na stranici („od“ iznosi); tačna cena uvek dolazi u pisanoj ponudi. */
(() => {
  const en = document.documentElement.lang.startsWith('en');
  const MAIL = 'hello@barvis-studio.dev';
  const PHONE = '38169625066';
  const T = en ? {
    from: 'from', site: 'Website', system: 'Custom system', talk: 'Free call first',
    sitePrice: '€500', systemPrice: '€2,000', talkPrice: 'No cost',
    maintenance: '+ maintenance from €50 a month', siteToSystem: 'The features you ticked need a custom system, not just a website.',
    team: { '1': 'Just me', '2-5': '2–5 people', '6-15': '6–15 people', '15+': 'More than 15 people' },
    training: 'Team training', noFeatures: 'Scope to be defined together',
    subject: 'Enquiry: ', greeting: 'Hi Boris,', intro: 'I used the estimate on your site:',
    pkg: 'Package', needs: 'Needs', teamLabel: 'Team', after: 'After launch', about: 'About us (what we do, how we work today):', thanks: 'Thanks!',
    copied: 'Summary copied. Paste it into an email or message.', copyFail: 'Copying failed. Use the email button instead.',
    unsureNote: 'In a 30-minute call we work out what makes sense, before any cost.',
  } : {
    from: 'od', site: 'Sajt', system: 'Sistem po meri', talk: 'Prvo besplatan razgovor',
    sitePrice: '500 €', systemPrice: '2.000 €', talkPrice: 'Bez troška',
    maintenance: '+ održavanje od 50 € mesečno', siteToSystem: 'Funkcije koje ste označili traže sistem po meri, ne samo sajt.',
    team: { '1': 'Samo ja', '2-5': '2–5 ljudi', '6-15': '6–15 ljudi', '15+': 'Više od 15 ljudi' },
    training: 'Obuka tima', noFeatures: 'Obim definišemo zajedno',
    subject: 'Upit: ', greeting: 'Zdravo Borise,', intro: 'Popunio/la sam procenu na sajtu:',
    pkg: 'Paket', needs: 'Potrebno', teamLabel: 'Tim', after: 'Posle puštanja', about: 'O nama (čime se bavimo, kako radimo danas):', thanks: 'Hvala!',
    copied: 'Opis je kopiran. Nalepite ga u mejl ili poruku.', copyFail: 'Kopiranje nije uspelo. Koristite dugme za mejl.',
    unsureNote: 'Za 30 minuta razgovora vidimo šta ima smisla, pre bilo kakvog troška.',
  };

  const form = document.querySelector('[data-estimate]');
  if (form) {
    const out = name => form.querySelector(`[data-out="${name}"]`);
    const labelOf = input => input.closest('label')?.querySelector('span')?.textContent.trim() || input.value;
    const status = form.querySelector('.estimate-status');
    let summary = '';

    const compute = () => {
      const kind = form.querySelector('[name="kind"]:checked')?.value || 'system';
      const features = [...form.querySelectorAll('[name="feature"]:checked')].map(labelOf);
      const team = form.querySelector('[name="team"]:checked')?.value || '2-5';
      const care = [...form.querySelectorAll('[name="care"]:checked')];
      const maintenance = care.some(x => x.value === 'maintenance');
      const training = care.some(x => x.value === 'training');

      // Sajt ostaje sajt samo dok nije označena nijedna funkcija sistema.
      let pkg = kind, hint = '';
      if (kind === 'site' && features.length) { pkg = 'system'; hint = T.siteToSystem; }
      if (kind === 'unsure' && !features.length) pkg = 'talk';
      if (kind === 'unsure' && features.length) pkg = 'system';

      const names = { site: T.site, system: T.system, talk: T.talk };
      const prices = { site: T.sitePrice, system: T.systemPrice, talk: T.talkPrice };
      out('package').textContent = names[pkg];
      out('price').innerHTML = pkg === 'talk' ? prices.talk : (en ? `<small>${T.from}</small> ${prices[pkg]}` : `<small>${T.from}</small> ${prices[pkg]}`);
      out('extra').textContent = pkg === 'talk' ? T.unsureNote : (maintenance ? T.maintenance : '');
      out('extra').hidden = !out('extra').textContent;

      const items = [...features, T.team[team], ...(training ? [T.training] : [])];
      out('list').innerHTML = (features.length ? '' : `<li class="muted">${T.noFeatures}</li>`) + items.map(x => `<li>${x}</li>`).join('');
      form.classList.toggle('is-site', pkg === 'site');
      form.querySelector('.estimate-hint')?.remove();
      if (hint) out('list').insertAdjacentHTML('beforebegin', `<p class="estimate-hint">${hint}</p>`);

      const after = [maintenance && T.maintenance.replace(/^\+\s*/, ''), training && T.training].filter(Boolean);
      summary = [
        T.greeting, '', T.intro,
        `• ${T.pkg}: ${names[pkg]}${pkg === 'talk' ? '' : ` (${T.from} ${prices[pkg]})`}`,
        `• ${T.needs}: ${features.join(', ') || T.noFeatures}`,
        `• ${T.teamLabel}: ${T.team[team]}`,
        ...(after.length ? [`• ${T.after}: ${after.join(', ')}`] : []),
        '', T.about, '', T.thanks,
      ].join('\n');
      const mail = form.querySelector('[data-send="mail"]');
      mail.href = `mailto:${MAIL}?subject=${encodeURIComponent(T.subject + names[pkg])}&body=${encodeURIComponent(summary)}`;
      form.querySelector('[data-send="whatsapp"]').href = `https://wa.me/${PHONE}?text=${encodeURIComponent(summary)}`;
      status.textContent = '';
    };

    form.addEventListener('change', compute);
    form.addEventListener('submit', event => event.preventDefault());
    form.querySelector('[data-send="copy"]')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(summary); status.textContent = T.copied; }
      catch (_) { status.textContent = T.copyFail; }
    });
    compute();
  }

  // Mobilni meni: pun ekran, zatvara se na Esc, klik na link ili promenu širine.
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#mobile-menu');
  if (toggle && menu) {
    const set = open => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? (en ? 'Close menu' : 'Zatvori meni') : (en ? 'Menu' : 'Meni'));
      menu.hidden = !open;
      document.documentElement.classList.toggle('menu-open', open);
      if (open) menu.querySelector('a')?.focus();
    };
    toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', event => { if (event.target.closest('a')) set(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { set(false); toggle.focus(); } });
    matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) set(false); });
  }

  // Aktivna sekcija u glavnoj navigaciji: poslednja sekcija čiji je vrh prešao sredinu ekrana.
  const navLinks = [...document.querySelectorAll('.site-header nav a[href^="#"]')];
  const targets = navLinks.map(a => [a, document.querySelector(a.getAttribute('href'))]).filter(([, t]) => t);
  if (targets.length) {
    let queued = false;
    const spy = () => {
      queued = false;
      const line = innerHeight * .45;
      let current = null;
      targets.forEach(([a, t]) => { const r = t.getBoundingClientRect(); if (r.top <= line && r.bottom > line) current = a; });
      navLinks.forEach(a => a.classList.toggle('is-active', a === current));
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
  }
})();
