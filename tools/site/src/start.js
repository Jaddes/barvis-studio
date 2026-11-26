/* BARVIS Studio — tok „Pokrenite projekat“: izbor puta, procena (čarobnjak) i upit sa svim stanjima.
   Tekstovi, cene i rokovi dolaze sa stranice (<script id="i18n">, generiše tools/site/build.py iz tiers.py).
   Upit: ako forma ima data-endpoint (BARVIS leads API, /v1/inquiries) šalje se direktno; bez njega se otvara
   pripremljen mejl i to se iskreno kaže. ?demo=ok|fail određuje samo ishod slanja validno popunjene forme;
   ?demo=offline simulira prekid veze. */
(() => {
  const I = (() => { try { return JSON.parse(document.getElementById('i18n').textContent); } catch (_) { return null; } })();
  const form = document.querySelector('[data-inquiry]');
  if (!I || !form) return;
  const T = I.X, MAIL = 'hello@barvis-studio.dev', PHONE = '38169625066', ICONS = I.icons;
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
  const ico = n => `<svg class="ico" aria-hidden="true"><use href="${ICONS}#i-${n}"/></svg>`;
  const params = new URLSearchParams(location.search);
  const DEMO = params.get('demo');
  const cap = s => s[0].toUpperCase() + s.slice(1);

  /* ---------- izbor puta (samo na stranici „Pokrenite projekat“) ---------- */
  const panels = $$('[data-panel]');
  const setPath = path => {
    if (!panels.length) return;
    $$('[name="path"]').forEach(r => { r.checked = r.value === path; });
    panels.forEach(p => { p.hidden = !p.dataset.panel.split(' ').includes(path); });
    if (path !== 'procena') {
      const t = $('[data-form-title]'), sub = $('[data-form-sub]'), lab = $('[data-msg-label]'), btn = $('[data-submit]');
      t.textContent = t.dataset['t' + cap(path)]; sub.textContent = sub.dataset['t' + cap(path)];
      lab.textContent = lab.dataset['t' + cap(path)]; btn.firstChild.textContent = btn.dataset['t' + cap(path)] + ' ';
      $$('[data-only]').forEach(el => { el.hidden = el.dataset.only !== path; });
    }
    const u = new URL(location.href); u.searchParams.set('put', path); history.replaceState(null, '', u);
  };
  $$('[name="path"]').forEach(r => r.addEventListener('change', () => setPath(r.value)));

  /* ---------- čarobnjak procene ---------- */
  const wiz = $('[data-wizard]');
  let estimateText = '', estimateService = 'unsure';
  if (wiz) {
    const steps = $$('.wiz-step', wiz);
    const ORDER = ['kind', 'features', 'team', 'when', 'budget', 'result'];
    const SERVICE = { system: 'app', site: 'site', automation: 'automation', maintenance: 'maintenance', unsure: 'unsure' };
    const P = I.P, L = I.L;
    let at = 0;
    const val = n => $(`[name="${n}"]:checked`, wiz)?.value;
    const vals = n => $$(`[name="${n}"]:checked`, wiz);
    const labelOf = i => i.closest('label').querySelector('b').textContent;
    const tierOf = () => {
      const kind = val('kind'), team = val('team') || '2-5';
      if (kind === 'system') {
        const f = vals('feature').map(i => i.value), big = team === '6-15' || team === '15+';
        if (team === '15+' && f.includes('online') && f.includes('roles')) return 'platform';
        return (f.filter(x => x !== 'import').length >= 3 || big) ? 'business' : 'tool';
      }
      if (kind === 'site') return val('site') || 'company';
      if (kind === 'automation') return val('auto') || 'single';
      if (kind === 'maintenance') return val('care') || 'basic';
      return null;
    };
    const out = n => $(`[data-out="${n}"]`, wiz);
    const compute = () => {
      const kind = val('kind'), tier = tierOf(), budget = val('budget') || 'unknown', when = val('when'), team = val('team');
      const why = [];
      let price = '—', time = '—', title = T.talk;
      out('pkg').innerHTML = '';
      out('fit').className = '';
      if (tier) {
        const p = P[tier];
        title = p.name; price = p.price; time = p.time;
        out('pkg').innerHTML = `${esc(T.nearest)} <b>${esc(p.name)}</b>`;
        const capB = { '500': 500, '2000': 2000, '5000': 5000, more: Infinity, unknown: null }[budget];
        if (capB !== null && capB < p.lo) { out('fit').textContent = T.fit_low; out('fit').className = 'fit-low'; }
        else out('fit').textContent = capB !== null ? T.fit_ok : T.fit_unknown;
      } else out('fit').textContent = T.fit_talk;
      if (kind === 'system') {
        const f = vals('feature').map(i => i.value);
        if (f.includes('roles') || team === '6-15' || team === '15+') why.push(T.why_roles);
        if (f.includes('online')) why.push(T.why_online);
        if (f.includes('import')) why.push(T.why_import);
        if (f.length && f.length <= 2) why.push(T.why_small);
      }
      if (when === 'asap') why.push(T.why_asap);
      out('title').textContent = title; out('price').innerHTML = price; out('time').textContent = time;
      out('why').innerHTML = why.map(x => `<li>${ico('alt-arrow-right')}<span>${esc(x)}</span></li>`).join('');
      const feats = kind === 'system' ? vals('feature').map(labelOf) : [];
      const sub = { site: val('site'), automation: val('auto'), maintenance: val('care') }[kind];
      estimateService = SERVICE[kind] || 'unsure';
      const plainPrice = price.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      estimateText = [T.est_head,
        `• ${T.need}: ${L.kind[kind] || T.none}${sub && P[sub] ? ' — ' + P[sub].name : ''}`,
        ...(feats.length ? [`• ${T.does}: ${feats.join(', ')}`] : []),
        ...(tier ? [`• ${T.pkg}: ${P[tier].name}`, `• ${I.labels.price}: ${plainPrice}`, `• ${I.labels.time}: ${time}`] : []),
        `• ${T.x_team}: ${L.team[team] || T.none}`, `• ${T.x_when}: ${L.when[when] || T.none}`, `• ${T.x_budget}: ${L.budget[budget]}`].join('\n');
    };
    const summary = () => {
      const items = [];
      const kind = val('kind'); if (kind) items.push(['kind', L.kind[kind]]);
      const f = kind === 'system' ? vals('feature').length : 0;
      if (f) items.push(['features', `${f} ${T.feats[f === 1 ? 0 : (f < 5 ? 1 : 2)]}`]);
      ['team', 'when', 'budget'].forEach(k => { if (val(k)) items.push([k, L[k][val(k)]]); });
      $('[data-summary]', wiz).innerHTML = at === 0 ? '' : items.map(([q, t]) => `<li><button type="button" data-goto="${q}" aria-label="${esc(T.edit)}: ${esc(t)}">${esc(t)}</button></li>`).join('');
    };
    const show = (i, focus = true) => {
      at = Math.max(0, Math.min(ORDER.length - 1, i));
      const q = ORDER[at];
      steps.forEach(s => { s.hidden = s.dataset.q !== q; });
      if (q === 'features') { const k = val('kind') || 'unsure'; $$('[data-features-for]', wiz).forEach(el => { el.hidden = el.dataset.featuresFor !== k; }); }
      if (q === 'result') compute();
      const n = Math.min(at + 1, 5);
      $('[data-bar]', wiz).style.width = (q === 'result' ? 100 : (at / 5) * 100) + '%';
      $('[data-count]', wiz).textContent = q === 'result' ? T.done : fill(T.count, { n, t: 5 });
      $('[data-step-name]', wiz).textContent = T.steps[q];
      $('[data-back]', wiz).hidden = at === 0;
      $('[data-skip]', wiz).hidden = q === 'kind' || q === 'result';
      $('[data-next]', wiz).hidden = q === 'result';
      $('[data-send-estimate]', wiz).hidden = q !== 'result';
      $('[data-next]', wiz).firstChild.textContent = (q === 'budget' ? I.labels.see : I.labels.next) + ' ';
      summary();
      $('[data-wiz-live]', wiz).textContent = q === 'result' ? T.ready : `${fill(T.count, { n, t: 5 })}: ${$('legend', steps[at])?.textContent || ''}`;
      if (focus) { steps[at].focus({ preventScroll: true }); if (wiz.getBoundingClientRect().top < 0) wiz.scrollIntoView({ block: 'start' }); }
    };
    $('[data-next]', wiz).addEventListener('click', () => {
      if (ORDER[at] === 'kind' && !val('kind')) { $('[data-wiz-live]', wiz).textContent = T.pick; $('.wiz-step:not([hidden]) input', wiz).focus(); return; }
      show(at + 1);
    });
    $('[data-skip]', wiz).addEventListener('click', () => show(at + 1));
    $('[data-back]', wiz).addEventListener('click', () => show(at - 1));
    wiz.addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b) show(ORDER.indexOf(b.dataset.goto)); });
    // Jedan izbor (radio) odmah vodi dalje, osim na koraku sa funkcijama.
    wiz.addEventListener('change', e => { if (e.target.type === 'radio' && ORDER[at] !== 'features') setTimeout(() => show(at + 1), 180); });
    wiz.addEventListener('submit', e => e.preventDefault());
    $('[data-send-estimate]', wiz).addEventListener('click', () => {
      compute();
      $('[data-attached]').hidden = false; $('[data-attached-text]').textContent = estimateText;
      const r = $(`[name="service"][value="${estimateService}"]`, form); if (r) r.checked = true;
      setPath('upit');
      $('[data-form-title]').scrollIntoView({ block: 'start' });
      $('#f-name').focus({ preventScroll: true });
      $('[data-form-live]').textContent = T.moved;
    });
    $('[data-edit-estimate]')?.addEventListener('click', () => { setPath('procena'); show(0); });

    // Iz cenovnika (?k=system&t=business) ili sa početne (?p=booking): odgovori su popunjeni, ali procena kreće od prvog koraka.
    const TIER_FEATURES = { tool: ['clients'], business: ['booking', 'clients', 'billing', 'reports', 'roles'], platform: ['booking', 'clients', 'billing', 'reports', 'roles', 'online', 'reminders'] };
    const PRESETS = { booking: ['system', ['booking', 'clients', 'reminders']], site: ['site', []], internal: ['system', ['reports', 'roles', 'import']], other: ['unsure', []] };
    let k = params.get('k'), t = params.get('t'), feats = TIER_FEATURES[t] || [];
    if (!k && PRESETS[params.get('p')]) [k, feats] = PRESETS[params.get('p')];
    if (k && L.kind[k]) {
      $(`[name="kind"][value="${k}"]`, wiz).checked = true;
      feats.forEach(v => { const i = $(`[name="feature"][value="${v}"]`, wiz); if (i) i.checked = true; });
      const sub = { site: 'site', automation: 'auto', maintenance: 'care' }[k];
      if (sub && t) { const i = $(`[name="${sub}"][value="${t}"]`, wiz); if (i) i.checked = true; }
      if (t === 'platform') $('[name="team"][value="15+"]', wiz).checked = true;
      if (t && P[t]) { const p = $('[data-prefill]', wiz); p.hidden = false; p.textContent = fill(T.prefill, { name: P[t].name }); }
    }
    show(0, false);
  }

  /* ---------- upit: validacija, nacrt, slanje, stanja ---------- */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, PHONE_RE = /^[+()\d\s/.-]{6,}$/;
  const fieldOf = name => form.elements[name];
  const check = name => {
    const v = name === 'service' ? (form.querySelector('[name="service"]:checked')?.value || '') : fieldOf(name).value.trim();
    if (name === 'name') return v.length >= 2 ? '' : T.v_name;
    if (name === 'contact') return !v ? T.v_contact_empty : (EMAIL_RE.test(v) || (PHONE_RE.test(v) && v.replace(/\D/g, '').length >= 6)) ? '' : T.v_contact;
    if (name === 'service') return v ? '' : T.v_service;
    if (name === 'message') return v.length >= 10 ? '' : T.v_message;
    return '';
  };
  const showErr = (name, msg) => {
    const err = form.querySelector(`[data-err="${name}"]`);
    if (name === 'service') { err.hidden = !msg; err.innerHTML = msg ? ico('danger-triangle') + esc(msg) : ''; $$('[name="service"]', form).forEach(i => i.setAttribute('aria-invalid', String(!!msg))); return; }
    const input = fieldOf(name), field = input.closest('.field');
    field.classList.toggle('is-invalid', !!msg); input.setAttribute('aria-invalid', String(!!msg));
    err.hidden = !msg; err.innerHTML = msg ? ico('danger-triangle') + esc(msg) : '';
  };
  const REQUIRED = ['name', 'contact', 'service', 'message'];
  const touched = new Set();
  const KEY = 'barvis-inquiry-draft';
  const saveDraft = () => { try { const fd = new FormData(form); const d = {}; for (const k of new Set(fd.keys())) if (k !== 'botcheck') d[k] = fd.getAll(k); sessionStorage.setItem(KEY, JSON.stringify(d)); } catch (_) {} };
  const loadDraft = () => { try { const d = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (!d) return;
    Object.entries(d).forEach(([k, vs]) => form.querySelectorAll(`[name="${k}"]`).forEach(el => { if (el.type === 'radio' || el.type === 'checkbox') el.checked = vs.includes(el.value); else el.value = vs[0] || ''; })); } catch (_) {} };
  ['name', 'contact', 'message'].forEach(n => {
    fieldOf(n).addEventListener('blur', () => { if (fieldOf(n).value.trim()) touched.add(n); if (touched.has(n)) showErr(n, check(n)); });
    fieldOf(n).addEventListener('input', () => { if (touched.has(n)) showErr(n, check(n)); saveDraft(); });
  });
  // Tastatura na telefonu prati ono što korisnik kuca: broj ili mejl.
  fieldOf('contact').addEventListener('input', e => { e.target.inputMode = /^[+\d(]/.test(e.target.value) ? 'tel' : 'email'; });
  form.addEventListener('change', e => { if (e.target.name === 'service') showErr('service', ''); saveDraft(); });
  loadDraft();
  if (params.get('slicno') === 'fizio') {
    const r = $('[name="service"][value="app"]', form); if (r && !form.querySelector('[name="service"]:checked')) r.checked = true;
    if (!fieldOf('message').value) fieldOf('message').value = I.similar;
  }

  const compose = () => {
    const fd = new FormData(form), get = k => (fd.get(k) || '').toString().trim();
    const svc = form.querySelector('[name="service"]:checked');
    const extra = [[T.x_budget, get('x_budget')], [T.x_when, get('x_when')], [T.x_team, get('x_team')], [T.x_existing, get('x_existing')],
      [T.x_slot, fd.getAll('slot').join(', ')], [T.x_medium, get('medium')]].filter(([, v]) => v);
    const path = $('[name="path"]:checked')?.value || 'upit';
    const lines = [get('message')];
    if (path === 'razgovor') lines.unshift(T.call_wish);
    if (extra.length) lines.push('', ...extra.map(([k, v]) => `${k}: ${v}`));
    const att = $('[data-attached]');
    if (att && !att.hidden) lines.push('', $('[data-attached-text]').textContent);
    return { name: get('name'), contact: get('contact'), service: svc?.value || 'unsure', service_label: svc ? svc.nextElementSibling.textContent : '',
      message: lines.join('\n').trim(), page: location.pathname, lang: I.lang, botcheck: get('botcheck') };
  };
  const plain = d => `${T.greeting}\n\n${d.message}\n\n${T.l_name}: ${d.name}\n${T.l_contact}: ${d.contact}\n${T.l_service}: ${d.service_label}\n`;
  const mailto = d => `mailto:${MAIL}?subject=${encodeURIComponent(T.subject + (d.service_label || T.project))}&body=${encodeURIComponent(plain(d))}`;
  const wa = d => `https://wa.me/${PHONE}?text=${encodeURIComponent(plain(d))}`;

  const result = form.parentElement.querySelector('[data-result]');
  const R = s => result.querySelector(s);
  const renderResult = (kind, d, reason = '') => {
    const head = { ok: ['check-circle', T.ok_title, fill(T.ok_body, { name: esc(d.name.split(' ')[0]), contact: esc(d.contact) })],
      mail: ['letter', T.mail_title, fill(T.mail_body, { mail: MAIL })], fail: ['danger-triangle', T.fail_title, fill(T.fail_body, { reason: esc(reason || T.r_server) })] }[kind];
    result.className = 'result is-' + kind; result.hidden = false;
    R('[data-result-title]').innerHTML = ico(head[0]) + esc(head[1]);
    R('[data-result-body]').innerHTML = head[2];
    R('[data-sent]').innerHTML = (kind === 'fail' ? '' : `<div><dt>${esc(T.l_sent)}</dt><dd>${new Date().toLocaleString(I.locale, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>`)
      + [[T.l_name, d.name], [T.l_contact, d.contact], [T.l_service, d.service_label], [T.l_message, d.message]].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    const subj = encodeURIComponent(T.subject_attach + d.name);
    R('[data-result-actions]').innerHTML = [
      kind === 'fail' ? `<button class="btn btn-primary" type="button" data-retry>${ico('refresh')}${esc(T.retry)}</button>` : '',
      kind !== 'ok' ? `<a class="btn" href="${esc(mailto(d))}">${ico('letter')}${esc(T.by_mail)}</a>` : '',
      `<a class="btn" href="${esc(wa(d))}" rel="noopener">${ico('chat-round-line')}WhatsApp</a>`,
      `<button class="btn" type="button" data-copy>${ico('copy')}${esc(T.copy)}</button>`,
      kind === 'ok' ? `<a class="btn btn-quiet" href="mailto:${MAIL}?subject=${subj}">${ico('paperclip')}${esc(T.attach)}</a>` : '',
      kind === 'mail' ? `<button class="btn btn-quiet" type="button" data-edit>${esc(T.edit_form)}</button>` : '',
      kind === 'ok' ? `<button class="btn btn-quiet" type="button" data-new>${esc(T.new)}</button>` : '',
      kind === 'fail' ? `<a class="btn btn-quiet" href="tel:+${PHONE}">${ico('phone-calling')}${esc(T.call)}</a>` : '',
    ].join('');
    R('[data-result-status]').textContent = '';
    R('[data-copy]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(plain(d)); R('[data-result-status]').textContent = fill(T.copied, { mail: MAIL }); }
      catch (_) { R('[data-result-status]').textContent = fill(T.copy_fail, { mail: MAIL }); }
    });
    R('[data-retry]')?.addEventListener('click', () => { result.hidden = true; form.hidden = false; form.requestSubmit(); });
    R('[data-edit]')?.addEventListener('click', () => { result.hidden = true; form.hidden = false; fieldOf('message').focus(); });
    R('[data-new]')?.addEventListener('click', () => { form.reset(); const a = $('[data-attached]'); if (a) a.hidden = true; try { sessionStorage.removeItem(KEY); } catch (_) {} result.hidden = true; form.hidden = false; fieldOf('name').focus(); });
    form.hidden = kind !== 'fail';
    if (kind === 'ok') { try { sessionStorage.removeItem(KEY); } catch (_) {} }
    result.scrollIntoView({ block: 'start' }); result.focus({ preventScroll: true });
  };

  const send = async d => {
    const fail = reason => Object.assign(new Error('send'), { reason });
    if (DEMO === 'offline' || !navigator.onLine) throw fail(T.r_offline);
    if (DEMO === 'fail') { await new Promise(r => setTimeout(r, 900)); throw fail(T.r_demo); }
    if (DEMO === 'ok') { await new Promise(r => setTimeout(r, 900)); return 'ok'; }
    const endpoint = form.dataset.endpoint;
    if (!endpoint) return 'mail';
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d), signal: ctrl.signal });
      const json = await res.json().catch(() => ({}));
      if (res.status === 400 && json.errors) throw Object.assign(new Error('invalid'), { fields: json.errors });
      if (res.status === 429) throw fail(T.r_rate);
      if (!res.ok || !json.success) throw fail(T.r_server);
      return 'ok';
    } catch (e) { if (e.name === 'AbortError') throw fail(T.r_timeout); if (!e.reason && !e.fields) throw fail(T.r_server); throw e; }
    finally { clearTimeout(timer); }
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const errors = REQUIRED.map(n => [n, check(n)]);
    errors.forEach(([n, m]) => { touched.add(n); showErr(n, m); });
    const bad = errors.filter(([, m]) => m);
    if (bad.length) {
      $('[data-form-live]', form).textContent = bad.length === 1 ? T.check_one : fill(T.check_many, { n: bad.length });
      const first = bad[0][0]; (first === 'service' ? $('[name="service"]', form) : fieldOf(first)).focus();
      return;
    }
    const d = compose(), btn = $('[data-submit]', form);
    btn.classList.add('is-busy'); btn.setAttribute('aria-disabled', 'true'); $('[data-form-live]', form).textContent = T.sending;
    try {
      const kind = await send(d);
      if (kind === 'mail') location.href = mailto(d);
      renderResult(kind, d);
    } catch (err) {
      if (err.fields) { Object.keys(err.fields).forEach(n => REQUIRED.includes(n) && showErr(n, check(n) || T['v_' + n] || T.v_message)); $('[data-form-live]', form).textContent = T.server_fields; }
      else renderResult('fail', d, err.reason);
    } finally { btn.classList.remove('is-busy'); btn.removeAttribute('aria-disabled'); }
  });

  /* ---------- mreža ---------- */
  const offline = $('[data-offline]');
  if (offline) { const net = () => { offline.hidden = navigator.onLine && DEMO !== 'offline'; }; addEventListener('online', net); addEventListener('offline', net); net(); }

  /* ---------- početni put ---------- */
  if (panels.length) { const start = params.get('put') || $('[name="path"]:checked')?.value; setPath(['upit', 'procena', 'razgovor'].includes(start) ? start : 'upit'); }
})();
