/* BARVIS Studio — procena projekta, kontakt forma i mobilni meni.
   Procena koristi samo cene iz cenovnika na stranici („od“ iznosi); tačna cena uvek dolazi u pisanoj ponudi.

   Kontakt forma: ako <form data-contact-form> ima data-endpoint (BARVIS leads API, api/ u ovom repozitorijumu:
   data-endpoint="https://api.barvis-studio.dev/v1/inquiries"), upit se šalje direktno, bez programa za poštu.
   Bez njega (ili ako slanje ne uspe) forma otvara pripremljen mejl, a nudi i WhatsApp i kopiranje poruke. */
(() => {
  // Tekstovi dolaze sa stranice (<script id="i18n">, generiše tools/site/build.py); bez njih važi srpski.
  const I18N = (() => { try { return JSON.parse(document.getElementById('i18n')?.textContent || 'null'); } catch (_) { return null; } })() || {};
  const LOCALE = I18N.locale || 'sr-Latn';
  const MAIL = 'hello@barvis-studio.dev';
  const PHONE = '38169625066';
  const T = I18N.T || {
    from: 'od', site: 'Sajt', system: 'Sistem po meri', talk: 'Prvo besplatan razgovor',
    sitePrice: '500 €', systemPrice: '2.000 €', talkPrice: 'Bez troška',
    maintenance: '+ održavanje od 50 € mesečno', siteToSystem: 'Funkcije koje ste označili traže sistem po meri, ne samo sajt.',
    team: { '1': 'Samo ja', '2-5': '2–5 ljudi', '6-15': '6–15 ljudi', '15+': 'Više od 15 ljudi' },
    training: 'Obuka tima', noFeatures: 'Obim definišemo zajedno',
    subject: 'Upit: ', greeting: 'Zdravo Borise,', intro: 'Popunio/la sam procenu na sajtu:',
    pkg: 'Paket', needs: 'Potrebno', teamLabel: 'Tim', after: 'Posle puštanja', about: 'O nama (čime se bavimo, kako radimo danas):', thanks: 'Hvala!',
    copied: 'Opis je kopiran. Nalepite ga u mejl ili poruku.', copyFail: 'Kopiranje nije uspelo. Koristite formu za upit.',
    unsureNote: 'Za 30 minuta razgovora vidimo šta ima smisla, pre bilo kakvog troška.',
    moved: 'Opis je prenet u formu za upit ispod. Dodajte par reči o poslu i pošaljite.',
  };

  const contactForm = document.querySelector('[data-contact-form]');
  const serviceSelect = contactForm?.querySelector('[name="service"]');

  // Dugmad i linkovi sa data-service unapred biraju uslugu u formi (npr. „Upit za sajt“).
  document.querySelectorAll('a[data-service]').forEach(link => link.addEventListener('click', () => {
    if (serviceSelect && [...serviceSelect.options].some(o => o.value === link.dataset.service)) serviceSelect.value = link.dataset.service;
  }));

  // Procena: više vrsta posla odjednom, sopstvene stavke, budžet i rok. Bez izmišljenih iznosa:
  // prikazuju se samo polazne cene iz cenovnika, a budžet se poredi sa njima.
  const E = I18N.E || {
    kinds: { system: 'Aplikacija ili sistem', site: 'Sajt', automation: 'Automatizacija', maintenance: 'Održavanje', unsure: 'Još ne znam' },
    prices: { system: ['od', 2000], site: ['od', 500], automation: ['prema obimu'], maintenance: ['od', 50, '/ mes.'] },
    scope: ['Manji projekat', 'Srednji projekat', 'Veći projekat'], talk: 'Obim određujemo zajedno',
    fit: { low: 'Budžet je ispod polazne cene. Predložiću manju prvu verziju sa onim što je najvažnije, koja kasnije može da raste.',
      ok: 'Budžet odgovara polaznoj ceni. U pisanoj ponudi dobijate tačan obim i rok.',
      unknown: 'U redu je ako budžet još ne znate. Ponuda pokazuje koliko košta svaki deo, pa birate.' },
    team: { '1': 'Samo ja', '2-5': '2–5 ljudi', '6-15': '6–15 ljudi', '15+': '15+ ljudi' },
    when: { asap: 'Što pre', '1-3': 'Za 1–3 meseca', flex: 'Nije hitno' },
    budget: { '500': 'do 500 €', '2000': '500–2.000 €', '5000': '2.000–5.000 €', more: 'više od 5.000 €', unknown: 'nije određen' },
    remove: 'Ukloni', intro: 'Moja procena sa vašeg sajta:', need: 'Potrebno', does: 'Treba da radi', teamL: 'Tim', whenL: 'Rok', budgetL: 'Budžet',
  };
  E.fmt = n => new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(n);
  const form = document.querySelector('[data-estimate]');
  if (form) {
    const out = name => form.querySelector(`[data-out="${name}"]`);
    const labelOf = input => input.closest('label')?.querySelector('span')?.textContent.trim() || input.value;
    const status = form.querySelector('.estimate-status');
    const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let summary = '', details = '', service = 'unsure';

    // Okvirna cena: osnova po vrsti posla + svaka funkcija, pa veličina tima i hitnost.
    // Isti rasponi kao u cenovniku (I18N.P); rezultat je raspon, nikad jedan „tačan“ broj.
    const P = I18N.P || { site: [['landing', 400, 900, [1, 2]]], system: [['tool', 1500, 4000, [2, 5]]], automation: [['single', 300, 1200, [1, 2]]], maintenance: [['basic', 50, null, null]] };
    const FEAT = { booking: [400, 900], clients: [300, 700], billing: [300, 700], reports: [300, 800], reminders: [300, 700], roles: [300, 700], online: [400, 900], import: [200, 500], custom: [250, 700] };
    const TEAM = { '1': .9, '2-5': 1, '6-15': 1.25, '15+': 1.5 };
    const money = n => E.fmt(n);
    const compute = () => {
      const kinds = [...form.querySelectorAll('[name="kind"]:checked')].map(i => i.value);
      const featInputs = [...form.querySelectorAll('[name="feature"]:checked')];
      const features = featInputs.map(labelOf);
      const team = form.querySelector('[name="team"]:checked')?.value || '2-5';
      const when = form.querySelector('[name="when"]:checked')?.value || 'flex';
      const budget = form.querySelector('[name="budget"]:checked')?.value || 'unknown';
      const builds = kinds.some(k => k === 'system' || k === 'automation' || k === 'unsure' || k === 'site');
      form.querySelector('[data-features]')?.classList.toggle('is-quiet', !kinds.some(k => k === 'system' || k === 'automation' || k === 'unsure'));

      let lo = 0, hi = 0;
      if (kinds.includes('site')) { lo += P.site[0][1]; hi += P.site[0][2]; }
      if (kinds.includes('system')) { lo += 800; hi += 2000; }
      if (kinds.includes('automation')) { lo += P.automation[0][1]; hi += P.automation[0][2]; }
      if (kinds.some(k => k === 'system' || k === 'automation' || k === 'unsure')) featInputs.forEach(i => { const [a, b] = FEAT[i.value] || FEAT.custom; lo += a; hi += b; });
      const mult = (TEAM[team] || 1) * (when === 'asap' ? 1.15 : 1);
      lo = Math.floor(lo * mult / 100) * 100; hi = Math.ceil(hi * mult / 100) * 100;

      const priced = hi > 0;
      out('package').textContent = !priced ? E.talk : hi <= 3000 ? E.small || E.scope[0] : hi <= 9000 ? E.scope[1] : E.scope[2];
      out('range').textContent = priced ? `${money(lo)} – ${money(hi)}` : '—';
      const w1 = Math.max(1, Math.round(lo / 1000)), w2 = Math.max(w1 + 1, Math.ceil(hi / 700));
      out('time').textContent = priced ? `${w1}–${w2} ${E.weeks || ''}`.trim() : '—';
      const monthly = kinds.includes('maintenance');
      out('monthly').hidden = !monthly; out('monthly').textContent = monthly ? (E.monthly || '') : '';
      const cap = { '500': 500, '2000': 2000, '5000': 5000, more: Infinity }[budget];
      const low = budget !== 'unknown' && priced && cap < lo;
      out('fit').textContent = budget === 'unknown' || !priced ? E.fit.unknown : (low ? E.fit.low : E.fit.ok);
      out('fit').classList.toggle('is-low', low);
      out('list').innerHTML = [`${E.teamL}: ${E.team[team]}`, `${E.whenL}: ${E.when[when]}`, `${E.budgetL}: ${E.budget[budget]}`].map(x => `<li>${esc(x)}</li>`).join('');

      service = kinds.includes('system') ? 'app' : kinds[0] === 'site' ? 'site' : kinds[0] === 'automation' ? 'automation' : kinds[0] === 'maintenance' ? 'maintenance' : 'unsure';
      details = [E.intro,
        `• ${E.need}: ${kinds.map(k => E.kinds[k]).join(', ') || E.talk}`,
        ...(features.length && builds ? [`• ${E.does}: ${features.join(', ')}`] : []),
        ...(priced ? [`• ${E.range || ''}: ${money(lo)} – ${money(hi)}`, `• ${E.time || ''}: ${w1}–${w2} ${E.weeks || ''}`] : []),
        `• ${E.teamL}: ${E.team[team]}`, `• ${E.whenL}: ${E.when[when]}`, `• ${E.budgetL}: ${E.budget[budget]}`].join('\n');
      summary = [T.greeting, '', details, '', T.about, '', T.thanks].join('\n');
      form.querySelector('[data-send="whatsapp"]').href = `https://wa.me/${PHONE}?text=${encodeURIComponent(summary)}`;
      status.textContent = '';
    };

    // Sopstvene stavke postaju označeni „čipovi“ koji se mogu ukloniti.
    const customInput = form.querySelector('[data-custom]');
    const addCustom = () => {
      const text = customInput.value.trim().slice(0, 60);
      if (!text) { customInput.focus(); return; }
      const label = document.createElement('label'); label.className = 'opt is-custom';
      label.innerHTML = `<input type="checkbox" name="feature" value="custom" checked><span>${esc(text)}</span><button type="button" class="chip-x" aria-label="${E.remove}: ${esc(text)}"></button>`;
      label.querySelector('.chip-x').addEventListener('click', event => { event.preventDefault(); label.remove(); compute(); });
      form.querySelector('[data-feature-row]').append(label);
      customInput.value = ''; customInput.focus(); compute();
    };
    form.querySelector('[data-custom-add]')?.addEventListener('click', addCustom);
    customInput?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } });

    const params = new URLSearchParams(location.search);
    const PRESETS = { site: { kind: ['site'], feature: [] }, booking: { kind: ['system'], feature: ['booking', 'clients', 'reminders'] },
      internal: { kind: ['system', 'automation'], feature: ['reports', 'roles', 'import'] }, other: { kind: ['unsure'], feature: [] } };
    const TIER = { tool: ['clients'], business: ['booking', 'clients', 'billing', 'reports', 'roles'], platform: ['booking', 'clients', 'billing', 'reports', 'roles', 'online', 'reminders'], flow: ['import', 'reports'] };
    const preset = PRESETS[params.get('p')] || (params.get('k') && { kind: [params.get('k')], feature: TIER[params.get('t')] || (params.get('k') === 'system' ? ['booking', 'clients'] : []) });
    if (preset) ['kind', 'feature'].forEach(n => form.querySelectorAll(`[name="${n}"]`).forEach(i => { i.checked = preset[n].includes(i.value); }));
    form.addEventListener('change', compute);
    form.addEventListener('submit', event => event.preventDefault());
    form.querySelector('[data-send="copy"]')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(summary); status.textContent = T.copied; }
      catch (_) { status.textContent = T.copyFail; }
    });
    form.querySelector('[data-send="form"]')?.addEventListener('click', event => {
      if (!contactForm) { event.preventDefault(); location.href = `mailto:${MAIL}?subject=${encodeURIComponent(T.subject + 'BARVIS')}&body=${encodeURIComponent(summary)}`; return; }
      const message = contactForm.querySelector('[name="message"]');
      message.value = `${details}\n\n${T.about}\n`;
      message.dispatchEvent(new Event('input', { bubbles: true }));
      if (serviceSelect) serviceSelect.value = service;
      status.textContent = T.moved;
    });
    // Usluge sa cenama vode na procenu sa već označenom vrstom posla.
    document.querySelectorAll('.ledger a[data-kind]').forEach(link => link.addEventListener('click', () => {
      const box = form.querySelector(`[name="kind"][value="${link.dataset.kind}"]`);
      if (!box) return;
      form.querySelectorAll('[name="kind"]').forEach(i => { i.checked = i === box; });
      compute();
    }));
    compute();
  }
  // Kategorije „Za koga“: kontakt forma dobija temu kao početak poruke.
  document.querySelectorAll('.cats a[data-topic][href="#contact"]').forEach(link => link.addEventListener('click', () => {
    const message = contactForm?.querySelector('[name="message"]');
    if (message && !message.value.trim()) message.value = `${link.dataset.topic}: `;
  }));

  if (contactForm) {
    const C = I18N.C || {
      required: 'Popunite ovo polje.', name: 'Upišite ime.', contact: 'Upišite mejl adresu ili broj telefona.',
      message: 'Napišite bar rečenicu-dve o tome šta vam treba.', sending: 'Šaljem…',
      subject: 'Upit sa sajta barvis-studio.dev', nameL: 'Ime', contactL: 'Kontakt', serviceL: 'Usluga',
      ok: '<b>Hvala, upit je poslat.</b> Odgovaram lično, sa konkretnim sledećim korakom.',
      opened: '<p><b>Otvoren je vaš program za poštu sa pripremljenom porukom.</b> Samo pritisnite „Pošalji“.</p><p>Nije se otvorio? Pošaljite istu poruku drugim putem:</p>',
      failed: '<p><b>Slanje ovog puta nije uspelo.</b> Poruka nije izgubljena; pošaljite je drugim putem:</p>',
      copy: 'Kopiraj poruku', copied: 'Kopirano. Nalepite poruku u mejl na ' + MAIL + '.', email: 'Otvori mejl',
    };
    const $ = name => contactForm.querySelector(`[name="${name}"]`);
    const statusBox = contactForm.querySelector('.form-status');
    const submit = contactForm.querySelector('[type="submit"]');
    const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    const isPhone = v => /^[+()\d\s/.-]{6,}$/.test(v) && v.replace(/\D/g, '').length >= 6;

    const setError = (input, text) => {
      const box = contactForm.querySelector(`#${input.id}-err`);
      input.setAttribute('aria-invalid', String(Boolean(text)));
      if (box) { box.textContent = text; box.hidden = !text; }
      return !text;
    };
    const check = input => {
      const v = input.value.trim();
      if (input.name === 'name') return setError(input, v.length >= 2 ? '' : C.name);
      if (input.name === 'contact') return setError(input, isEmail(v) || isPhone(v) ? '' : C.contact);
      if (input.name === 'message') return setError(input, v.length >= 10 ? '' : C.message);
      return true;
    };
    const fields = ['name', 'contact', 'message'].map($);
    // Greška se proverava tek kad korisnik napusti polje, a nestaje čim je ispravi.
    fields.forEach(input => {
      input.addEventListener('blur', () => { if (input.value.trim()) check(input); });
      input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') check(input); });
    });

    const compose = () => {
      const service = serviceSelect.options[serviceSelect.selectedIndex].text;
      return {
        name: $('name').value.trim(), contact: $('contact').value.trim(), service, serviceKey: serviceSelect.value, message: $('message').value.trim(),
        text: `${C.nameL}: ${$('name').value.trim()}\n${C.contactL}: ${$('contact').value.trim()}\n${C.serviceL}: ${service}\n\n${$('message').value.trim()}`,
      };
    };

    const fallback = (data, intro) => {
      const wa = `https://wa.me/${PHONE}?text=${encodeURIComponent(data.text)}`;
      const mail = `mailto:${MAIL}?subject=${encodeURIComponent(`${C.subject}: ${data.service}`)}&body=${encodeURIComponent(data.text)}`;
      statusBox.innerHTML = `${intro}<div class="contact-quick"><a href="${wa}" rel="noopener">WhatsApp</a><a href="${mail}">${C.email}</a><button type="button" data-copy-message>${C.copy}</button></div>`;
      statusBox.querySelector('[data-copy-message]').addEventListener('click', async event => {
        try { await navigator.clipboard.writeText(data.text); event.target.textContent = C.copied; }
        catch (_) { event.target.textContent = MAIL; }
      });
      return mail;
    };

    contactForm.addEventListener('submit', async event => {
      event.preventDefault();
      const valid = fields.map(check).every(Boolean);
      if (!valid) { fields.find(f => f.getAttribute('aria-invalid') === 'true')?.focus(); return; }
      const data = compose();
      if ($('botcheck')?.value) { statusBox.innerHTML = C.ok; contactForm.reset(); return; } // robot: tiho „uspe“

      const endpoint = contactForm.dataset.endpoint;
      if (endpoint) {
        submit.disabled = true;
        const label = submit.innerHTML;
        submit.textContent = C.sending;
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 15000); // server ne odgovara: ponudi rezervne puteve
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            signal: abort.signal,
            body: JSON.stringify({
              name: data.name, contact: data.contact, service: data.serviceKey, service_label: data.service,
              message: data.message, page: location.pathname, lang: document.documentElement.lang, botcheck: '',
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || result.success === false) throw new Error(result.message || response.status);
          statusBox.innerHTML = C.ok;
          contactForm.reset();
        } catch (_) {
          fallback(data, C.failed);
        } finally {
          clearTimeout(timer);
          submit.disabled = false;
          submit.innerHTML = label;
          statusBox.focus();
        }
        return;
      }
      // Bez servisa za slanje: pripremljen mejl + rezervni putevi, ako program za poštu nije podešen.
      const mail = fallback(data, C.opened);
      statusBox.focus();
      location.href = mail;
    });
  }

  // Mobilni meni: pun ekran, zatvara se na Esc, klik na link ili promenu širine.
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#mobile-menu');
  if (toggle && menu) {
    const set = open => {
      toggle.setAttribute('aria-expanded', String(open));
      const label = toggle.querySelector('.menu-label');
      if (label) label.textContent = open ? (toggle.dataset.close || 'Zatvori') : (toggle.dataset.open || 'Meni');
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
