/* BARVIS Studio — procena projekta, kontakt forma i mobilni meni.
   Procena koristi samo cene iz cenovnika na stranici („od“ iznosi); tačna cena uvek dolazi u pisanoj ponudi.

   Kontakt forma: ako <form data-contact-form> ima data-endpoint (BARVIS leads API, api/ u ovom repozitorijumu:
   data-endpoint="https://api.barvis-studio.dev/v1/inquiries"), upit se šalje direktno, bez programa za poštu.
   Bez njega (ili ako slanje ne uspe) forma otvara pripremljen mejl, a nudi i WhatsApp i kopiranje poruke. */
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
    copied: 'Summary copied. Paste it into an email or message.', copyFail: 'Copying failed. Use the enquiry form instead.',
    unsureNote: 'In a 30-minute call we work out what makes sense, before any cost.',
    moved: 'The summary is in the enquiry form below. Add a few words about your business and send it.',
  } : {
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
  const E = en ? {
    kinds: { system: 'App or system', site: 'Website', automation: 'Automation', maintenance: 'Maintenance', unsure: 'Not sure yet' },
    prices: { system: ['from', 2000], site: ['from', 500], automation: ['by scope'], maintenance: ['from', 50, '/ mo'] },
    fmt: n => `€${n.toLocaleString('en-GB')}`,
    scope: ['Smaller project', 'Medium project', 'Larger project'], talk: 'We work out the scope together',
    fit: { low: 'Your budget is below the starting price. I will suggest a smaller first version with what matters most, which can grow later.',
      ok: 'Your budget fits the starting price. The written quote gives the exact scope and timeline.',
      unknown: 'No budget yet is fine. The quote shows what each part costs, so you can choose.' },
    team: { '1': 'Just me', '2-5': '2–5 people', '6-15': '6–15 people', '15+': '15+ people' },
    when: { asap: 'As soon as possible', '1-3': 'In 1–3 months', flex: 'No rush' },
    budget: { '500': 'up to €500', '2000': '€500–2,000', '5000': '€2,000–5,000', more: 'more than €5,000', unknown: 'not decided' },
    remove: 'Remove', intro: 'My estimate from your site:', need: 'Need', does: 'Should do', teamL: 'Team', whenL: 'When', budgetL: 'Budget',
  } : {
    kinds: { system: 'Aplikacija ili sistem', site: 'Sajt', automation: 'Automatizacija', maintenance: 'Održavanje', unsure: 'Još ne znam' },
    prices: { system: ['od', 2000], site: ['od', 500], automation: ['prema obimu'], maintenance: ['od', 50, '/ mes.'] },
    fmt: n => `${n.toLocaleString('de-DE')} €`,
    scope: ['Manji projekat', 'Srednji projekat', 'Veći projekat'], talk: 'Obim određujemo zajedno',
    fit: { low: 'Budžet je ispod polazne cene. Predložiću manju prvu verziju sa onim što je najvažnije, koja kasnije može da raste.',
      ok: 'Budžet odgovara polaznoj ceni. U pisanoj ponudi dobijate tačan obim i rok.',
      unknown: 'U redu je ako budžet još ne znate. Ponuda pokazuje koliko košta svaki deo, pa birate.' },
    team: { '1': 'Samo ja', '2-5': '2–5 ljudi', '6-15': '6–15 ljudi', '15+': '15+ ljudi' },
    when: { asap: 'Što pre', '1-3': 'Za 1–3 meseca', flex: 'Nije hitno' },
    budget: { '500': 'do 500 €', '2000': '500–2.000 €', '5000': '2.000–5.000 €', more: 'više od 5.000 €', unknown: 'nije određen' },
    remove: 'Ukloni', intro: 'Moja procena sa vašeg sajta:', need: 'Potrebno', does: 'Treba da radi', teamL: 'Tim', whenL: 'Rok', budgetL: 'Budžet',
  };
  const form = document.querySelector('[data-estimate]');
  if (form) {
    const out = name => form.querySelector(`[data-out="${name}"]`);
    const labelOf = input => input.closest('label')?.querySelector('span')?.textContent.trim() || input.value;
    const status = form.querySelector('.estimate-status');
    const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let summary = '', details = '', service = 'unsure';

    const compute = () => {
      const kinds = [...form.querySelectorAll('[name="kind"]:checked')].map(i => i.value);
      const features = [...form.querySelectorAll('[name="feature"]:checked')].map(labelOf);
      const team = form.querySelector('[name="team"]:checked')?.value || '2-5';
      const when = form.querySelector('[name="when"]:checked')?.value || 'flex';
      const budget = form.querySelector('[name="budget"]:checked')?.value || 'unknown';
      const priced = kinds.filter(k => E.prices[k]);
      // Bez sistema, automatizacije ili „ne znam“ funkcije sistema nemaju smisla: deo se utiša.
      form.querySelector('[data-features]').classList.toggle('is-quiet', !kinds.some(k => k === 'system' || k === 'automation' || k === 'unsure'));

      const weight = features.length + (team === '6-15' ? 2 : team === '15+' ? 3 : 0) + (kinds.includes('system') ? 2 : 0) + (kinds.includes('automation') ? 1 : 0);
      out('package').textContent = !kinds.length || (kinds.length === 1 && kinds[0] === 'unsure') ? E.talk : E.scope[weight <= 3 ? 0 : weight <= 7 ? 1 : 2];
      out('prices').innerHTML = priced.map(k => {
        const [word, n, unit] = E.prices[k];
        return `<p><span>${E.kinds[k]}</span><b>${n ? `<small>${word}</small> ${E.fmt(n)}${unit ? ` <small>${unit}</small>` : ''}` : word}</b></p>`;
      }).join('');
      const floor = priced.filter(k => k !== 'maintenance').map(k => E.prices[k][1] || 0).reduce((a, b) => a + b, 0);
      const cap = { '500': 500, '2000': 2000, '5000': 5000, more: Infinity }[budget];
      const low = budget !== 'unknown' && floor > 0 && cap < floor;
      out('fit').textContent = budget === 'unknown' || !floor ? E.fit.unknown : (low ? E.fit.low : E.fit.ok);
      out('fit').classList.toggle('is-low', low);
      out('list').innerHTML = [`${E.teamL}: ${E.team[team]}`, `${E.whenL}: ${E.when[when]}`, `${E.budgetL}: ${E.budget[budget]}`].map(x => `<li>${esc(x)}</li>`).join('');

      service = kinds.includes('system') ? 'app' : kinds[0] === 'site' ? 'site' : kinds[0] === 'automation' ? 'automation' : kinds[0] === 'maintenance' ? 'maintenance' : 'unsure';
      details = [E.intro,
        `• ${E.need}: ${kinds.map(k => E.kinds[k]).join(', ') || E.talk}`,
        ...(features.length ? [`• ${E.does}: ${features.join(', ')}`] : []),
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
      const label = document.createElement('label'); label.className = 'chip is-custom';
      label.innerHTML = `<input type="checkbox" name="feature" value="custom" checked><span>${esc(text)}</span><button type="button" class="chip-x" aria-label="${E.remove}: ${esc(text)}"></button>`;
      label.querySelector('.chip-x').addEventListener('click', event => { event.preventDefault(); label.remove(); compute(); });
      form.querySelector('[data-feature-row]').append(label);
      customInput.value = ''; customInput.focus(); compute();
    };
    form.querySelector('[data-custom-add]')?.addEventListener('click', addCustom);
    customInput?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } });

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
    const C = en ? {
      required: 'Please fill this in.', name: 'Please enter your name.', contact: 'Enter an email address or phone number.',
      message: 'A sentence or two about what you need, please.', sending: 'Sending…',
      subject: 'Enquiry from barvis-studio.dev', nameL: 'Name', contactL: 'Contact', serviceL: 'Service',
      ok: '<b>Thank you, your enquiry has been sent.</b> I will reply personally with a concrete next step.',
      opened: '<p><b>Your email app should now be open with the message ready.</b> Just press send.</p><p>Didn\'t open? Send the same message another way:</p>',
      failed: '<p><b>Sending did not work this time.</b> Your message is safe; send it another way:</p>',
      copy: 'Copy message', copied: 'Copied. Paste it into an email to ' + MAIL + '.', email: 'Open email',
    } : {
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
              message: data.message, page: location.pathname, lang: en ? 'en' : 'sr', botcheck: '',
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
      if (label) label.textContent = open ? (en ? 'Close' : 'Zatvori') : (en ? 'Menu' : 'Meni');
      else toggle.setAttribute('aria-label', open ? (en ? 'Close menu' : 'Zatvori meni') : (en ? 'Menu' : 'Meni'));
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
