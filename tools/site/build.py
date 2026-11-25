"""BARVIS Studio: generator stranica za sve jezike.

Tekstovi su u content/<jezik>.py (jedan rečnik C po jeziku), a ovde su samo šabloni.
Pokretanje iz korena repozitorijuma:  python tools/site/build.py
Generiše dist/ (srpski u korenu, ostali jezici u dist/<kod>/). Ručno pisane stranice
(softver-za-fizioterapeute, aplikacija-za-zakazivanje, izrada-sajtova, 404) ne dira.
"""
import html
import importlib.util
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / 'dist'
SITE = 'https://barvis-studio.dev'
DEMO = 'https://demo.barvis-studio.dev/'
LANGS = ['sr', 'en', 'de', 'fr', 'es', 'it', 'ru', 'zh', 'ja', 'ko', 'hu']
HTML_LANG = {'sr': 'sr-Latn', 'zh': 'zh-Hans'}
OG_LOCALE = {'sr': 'sr_RS', 'en': 'en_GB', 'de': 'de_DE', 'fr': 'fr_FR', 'es': 'es_ES', 'it': 'it_IT', 'ru': 'ru_RU', 'zh': 'zh_CN', 'ja': 'ja_JP', 'ko': 'ko_KR', 'hu': 'hu_HU'}
NATIVE = {'sr': 'Srpski', 'en': 'English', 'de': 'Deutsch', 'fr': 'Français', 'es': 'Español', 'it': 'Italiano', 'ru': 'Русский', 'zh': '中文', 'ja': '日本語', 'ko': '한국어', 'hu': 'Magyar'}
# Putanje stranica: srpski ima srpske adrese, ostali jezici engleske.
SLUGS = {
    'sr': dict(home='', pricing='cenovnik/', estimate='procena/', who='za-koga/', fizio='radovi/fizio-alfa/', focus='radovi/barvis-focus/'),
    'other': dict(home='', pricing='pricing/', estimate='estimate/', who='how-i-work/', fizio='work/fizio-alfa/', focus='work/barvis-focus/'),
}
PAGES = ['home', 'pricing', 'estimate', 'who', 'fizio', 'focus']


def _module(name):
    spec = importlib.util.spec_from_file_location(f'content_{name}', Path(__file__).parent / 'content' / f'{name}.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


TIERS = _module('tiers')
WHO = _module('who_more')


def load(lang):
    C = _module(lang).C
    t = TIERS.T[lang]
    C['tiers'] = t
    C['more'] = WHO.W[lang]
    C['nav'] = [('top', WHO.W[lang]['home'])] + [x for x in C['nav'] if x[0] != 'top']
    C['faq']['items'][0] = t['faq1']
    C['faq']['items'][-1] = t['faq8']
    C['pricing']['meta_desc'] = t['meta']
    C['js']['E'].update(t['est'])
    C['js']['P'] = {k: [[x[0], x[1], x[2], x[3]] for x in v] for k, v in TIERS.PRICES.items()}
    return C


SEP = {'sr': '.', 'de': '.', 'it': '.', 'en': ',', 'zh': ',', 'ja': ',', 'ko': ',', 'fr': '\u202f', 'ru': '\u202f', 'hu': '\u202f', 'es': '.'}
PREFIX = {'en', 'zh', 'ja', 'ko'}


def num(lang, n):
    if lang == 'es' and n < 10000:
        return str(n)
    return f'{n:,}'.replace(',', SEP[lang])


def eur_range(lang, lo, hi, t):
    """„1.500–4.000 €“, „€1,500–4,000“, „od 12.000 €“…"""
    if hi is None:
        amount = f'€{num(lang, lo)}' if lang in PREFIX else f'{num(lang, lo)} €'
        if lang == 'hu':
            return f'{amount}<small>{t["from_"]}</small>'
        if lang in ('zh', 'ja', 'ko'):
            return f'{amount} <small>{t["from_"]}</small>'
        return f'<small>{t["from_"]}</small> {amount}'
    if lang in PREFIX:
        return f'€{num(lang, lo)}–{num(lang, hi)}'
    return f'{num(lang, lo)}–{num(lang, hi)} €'



def slug(lang, page):
    return SLUGS['sr' if lang == 'sr' else 'other'][page]


def url_path(lang, page):
    return ('' if lang == 'sr' else f'{lang}/') + slug(lang, page)


def rel(from_lang, from_page, to_path):
    """Relativna putanja od stranice (from_lang, from_page) do putanje to_path (u odnosu na dist/)."""
    depth = url_path(from_lang, from_page).count('/')
    return ('../' * depth or './') + to_path


def ico(name):
    return f'<span class="ico ico-{name}" aria-hidden="true"></span>'


def esc(s):
    return html.escape(s, quote=True)


# ------------------------------------------------------------------ delovi stranice
class Page:
    def __init__(self, lang, page, C):
        self.lang, self.page, self.C = lang, page, C

    def r(self, path):  # putanja do fajla u dist/
        return rel(self.lang, self.page, path)

    def to(self, page, anchor=''):  # link na stranicu istog jezika
        target = url_path(self.lang, page)
        here = url_path(self.lang, self.page)
        if target == here:
            return anchor or './'
        return self.r(target) + anchor

    def home(self, anchor):
        return anchor if self.page == 'home' else self.to('home', anchor)

    def lang_links(self):
        out = []
        for l in LANGS:
            cur = ' aria-current="page"' if l == self.lang else ''
            out.append(f'<a href="{self.r(url_path(l, self.page))}" hreflang="{HTML_LANG.get(l, l)}" lang="{HTML_LANG.get(l, l)}"{cur}>{NATIVE[l]}</a>')
        return ''.join(out)

    def head(self, title, desc, extra=''):
        C = self.C
        alts = ''.join(f'\n  <link rel="alternate" hreflang="{HTML_LANG.get(l, l)}" href="{SITE}/{url_path(l, self.page)}">' for l in LANGS)
        canon = f'{SITE}/{url_path(self.lang, self.page)}'
        i18n = json.dumps(C['js'], ensure_ascii=False).replace('</', '<\\/')
        return f'''<!doctype html>
<html lang="{HTML_LANG.get(self.lang, self.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}">
  <meta name="theme-color" content="#0a0d0b">
  <meta name="color-scheme" content="dark">
  <link rel="canonical" href="{canon}">{alts}
  <link rel="alternate" hreflang="x-default" href="{SITE}/{url_path('en', self.page)}">
  <link rel="icon" href="{self.r('favicon.svg')}" type="image/svg+xml">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="{OG_LOCALE[self.lang]}">
  <meta property="og:site_name" content="BARVIS Studio">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(desc)}">
  <meta property="og:url" content="{canon}">
  <meta property="og:image" content="{SITE}/assets/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" href="{self.r('assets/fonts/inter-tight-latin-wght-normal.woff2')}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="{self.r('styles.css')}">
  <script type="application/json" id="i18n">{i18n}</script>{extra}
</head>
'''

    def header(self):
        C, u = self.C, self.C['ui']
        nav = ''.join(f'<a href="{self.home("#" + key) if not key.startswith("@") else self.to(key[1:])}"{" aria-current=\"page\"" if key == "@" + self.page else ""}>{label}</a>' for key, label in C['nav'])
        return f'''<body>
  <a class="skip-link" href="#main">{u['skip']}</a>
  <div class="noise" aria-hidden="true"></div>

  <header class="site-header">
    <a class="brand" href="{self.home('#top')}" aria-label="BARVIS Studio"><span class="brand-mark" aria-hidden="true">B</span><span>BARVIS<small>studio</small></span></a>
    <nav aria-label="{u['menu']}">{nav}</nav>
    <div class="header-end">
      <details class="lang-menu">
        <summary aria-label="{u['lang_label']}"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5s-1.3 6.7-3.9 9.5c-2.6-2.8-3.9-6-3.9-9.5s1.3-6.7 3.9-9.5z"/></svg><span>{self.lang.upper()}</span></summary>
        <div class="lang-list" translate="no">{self.lang_links()}</div>
      </details>
      <a class="header-cta" href="{self.home('#contact')}">{ico('call')} {u['cta_short']}</a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" data-open="{u['menu']}" data-close="{u['close']}"><span class="menu-label">{u['menu']}</span></button>
    </div>
  </header>
  <div class="mobile-menu" id="mobile-menu" hidden>
    <nav aria-label="{u['menu']}">{nav}</nav>
    <div class="mobile-menu-foot"><a class="btn-primary" href="{self.home('#contact')}">{ico('call')} {u['cta_long']}</a>
      <div class="mobile-lang" translate="no"><span>{u['lang_label']}</span><div>{self.lang_links()}</div></div></div>
  </div>
'''

    def footer(self):
        C, f = self.C, self.C['footer']
        cats = ''.join(f'<a href="{self.to("who", "#" + c["id"])}">{c["name"]}</a>' for c in C['who']['cats'][:6])
        studio = ''.join([f'<a href="{self.home("#work")}">{f["work"]}</a>', f'<a href="{self.to("pricing")}">{f["pricing"]}</a>',
                          f'<a href="{self.to("estimate")}">{f["estimate"]}</a>', f'<a href="{self.to("who")}">{f["how"]}</a>', f'<a href="{self.home("#faq")}">{f["faq"]}</a>'])
        return f'''  <footer>
    <div class="footer-brand">
      <a class="brand" href="{self.home('#top')}" aria-label="BARVIS Studio"><span class="brand-mark" aria-hidden="true">B</span><span>BARVIS<small>studio</small></span></a>
      <p class="footer-motto">{f['motto']}</p>
      <p>© 2026 Boris Lahos · Novi Sad</p>
    </div>
    <nav class="footer-col" aria-label="{f['who']}"><p>{f['who']}</p>{cats}</nav>
    <nav class="footer-col" aria-label="Studio"><p>Studio</p>{studio}</nav>
    <nav class="footer-col" aria-label="{f['contact']}"><p>{f['contact']}</p><a href="{self.home('#contact')}">{f['send']}</a><a href="mailto:hello@barvis-studio.dev">hello@barvis-studio.dev</a><a href="https://www.linkedin.com/in/boris-lahos/" rel="me noopener">LinkedIn</a><a href="https://github.com/Jaddes" rel="me noopener">GitHub</a><a href="{DEMO}" rel="noopener">{f['demo']}</a></nav>
  </footer>
'''

    def scripts(self, estimate=False):
        s = [f'  <script src="{self.r("assets/vendor/gsap.min.js")}" defer></script>', f'  <script src="{self.r("assets/vendor/ScrollTrigger.min.js")}" defer></script>',
             f'  <script src="{self.r("estimate.js")}" defer></script>', f'  <script src="{self.r("app.js")}" defer></script>']
        return '\n'.join(s) + '\n</body>\n</html>\n'

    # ---------------------------------------------------------- sekcije
    def sec_head(self, hid, title, text='', extra=''):
        p = f'<p>{text}</p>' if text else ''
        return f'<div class="sec-head"><h2 id="{hid}">{title}</h2>{p}{extra}</div>'

    def hero(self):
        h = self.C['hero']
        proof = ''.join(f'<li>{x.format(fizio=self.to("fizio"))}</li>' for x in h['proof'])
        return f'''    <section class="hero" id="top" aria-labelledby="hero-title">
      <div class="hero-bg" aria-hidden="true"><i class="glow glow-a"></i><i class="glow glow-b"></i><i class="hero-grid"></i></div>
      <div class="hero-body">
        <p class="hero-kicker"><span>{h['kicker'].split(' · ')[0]}</span><span class="hero-clock" data-clock aria-hidden="true">{self.C['tiers']['clock']} · --:--:--</span></p>
        <h1 class="hero-title" id="hero-title" aria-label="{esc(h['title1'] + ' ' + h['title2'])}">
          <span class="line" aria-hidden="true"><span>{h['title1']}</span></span>
          <span class="line serif" aria-hidden="true"><span>{h['title2']}</span></span>
        </h1>
        <p class="hero-lead">{h['lead']}</p>
        <div class="hero-actions">
          <a class="btn-primary" href="#contact">{ico('call')} {h['cta']}</a>
          <a class="btn-ghost" href="#work">{h['work']}</a>
        </div>
        <ul class="hero-proof">{proof}</ul>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <figure class="hv hv-back"><img src="{self.r('assets/work/fizio-calendar-960.webp')}" srcset="{self.srcset('fizio-calendar')}" sizes="(max-width: 760px) 90vw, 42vw" alt="" width="1440" height="900" fetchpriority="high" decoding="async"></figure>
        <figure class="hv hv-front"><img src="{self.r('assets/work/focus-timer-960.webp')}" srcset="{self.srcset('focus-timer')}" sizes="(max-width: 760px) 90vw, 42vw" alt="" width="1440" height="900" decoding="async"></figure>
        <figure class="hv hv-phone"><img src="{self.r('assets/work/fizio-mobile-agenda-520.webp')}" srcset="{self.srcset('fizio-mobile-agenda', (520, 780, 1170))}" sizes="(max-width: 760px) 25vw, 11vw" alt="" width="780" height="1688" decoding="async"></figure>
      </div>
    </section>
'''

    def srcset(self, name, widths=(960, 1440, 2400, 3840)):
        return ', '.join(f'{self.r(f"assets/work/{name}-{w}.webp")} {w}w' for w in widths)

    def chaos(self):
        c = self.C['chaos']
        pos = [(0, 0), (1, 1), (2, 0), (3, 2), (4, 1), (1, 3), (2, 2), (0, 2), (3, 0), (4, 3)]
        kinds = ['paper', 'chat', 'sheet', 'paper', 'chat', 'sheet', 'paper', 'sheet', 'chat', 'paper']
        notes = ''.join(f'<div class="note note-{k}" style="--c:{x};--r:{y};--i:{i}"><span class="raw">{raw}</span><span class="tidy">{tidy}</span></div>'
                        for i, ((x, y), k, raw, tidy) in enumerate(zip(pos, kinds, c['raw'], c['tidy'])))
        days = ''.join(f'<span>{d}</span>' for d in c['days'])
        return f'''    <section class="chaos section-pad" id="red" aria-labelledby="chaos-title">
      <div class="chaos-copy"><h2 id="chaos-title">{c['title']}</h2><p>{c['text']}</p></div>
      <div class="chaos-board" data-chaos aria-hidden="true"><div class="chaos-days">{days}</div><div class="chaos-grid">{notes}</div></div>
    </section>
'''

    def services_intro(self):
        s = self.C['services']
        tiles = ''.join(f'<li><span class="tile-n">{i + 1:02d}</span><b>{t["name"]}</b><p>{t["text"]}</p></li>' for i, t in enumerate(s['tiles']))
        return f'''    <section class="services section-pad" id="services" aria-labelledby="services-title">
      {self.sec_head('services-title', s['title'], s['text'])}
      <ul class="tiles">{tiles}</ul>
      <div class="sec-actions"><a class="btn-primary" href="{self.to('pricing')}">{s['pricing']} {ico('right')}</a><a class="btn-ghost" href="{self.to('estimate')}">{s['estimate']}</a></div>
    </section>
'''

    def who_intro(self):
        w = self.C['who']
        chips = ''.join(f'<li><a href="{self.to("who", "#" + c["id"])}">{c["name"]}</a></li>' for c in w['cats'])
        return f'''    <section class="audience section-pad" id="who" aria-labelledby="who-title">
      <div class="who-intro">
        <div><h2 id="who-title">{w['title']}</h2><p>{w['intro']}</p><a class="btn-ghost" href="{self.to('who')}">{w['more']} {ico('right')}</a></div>
        <ul class="who-chips">{chips}</ul>
      </div>
    </section>
'''

    def work(self):
        wk = self.C['work']
        cards = ''
        for key, img in (('fizio', 'fizio-calendar'), ('focus', 'focus-timer')):
            c = wk[key]
            facts = ''.join(f'<li>{f}</li>' for f in c['facts'])
            demo = f'<a class="work-demo" href="{DEMO}" rel="noopener">{wk["demo"]} {ico("out")}</a>' if key == 'fizio' else ''
            cards += f'''<article class="work-card">
          <a class="work-link" href="{self.to(key)}" aria-label="{c['name']}: {wk['more']}"></a>
          <figure class="work-shot"><img src="{self.r(f'assets/work/{img}-960.webp')}" srcset="{self.srcset(img, (960, 1440, 2400))}" sizes="(max-width: 900px) 92vw, 46vw" alt="{esc(c['alt'])}" width="1440" height="900" loading="lazy" decoding="async"></figure>
          <div class="work-body">
            <p class="work-meta"><span>{c['name']}</span><span>{c['tag']}</span></p>
            <h3>{c['title']}</h3><p>{c['text']}</p><ul class="work-facts">{facts}</ul>
            <div class="work-actions"><span class="work-more">{wk['more']} {ico('right')}</span>{demo}</div>
          </div>
        </article>'''
        return f'''    <section class="work section-pad" id="work" aria-labelledby="work-title">
      {self.sec_head('work-title', wk['title'], wk['text'])}
      <div class="work-grid">{cards}</div>
    </section>
'''

    def estimate_teaser(self):
        e = self.C['estimate']
        cards = ''.join(f'<a class="preset" href="{self.to("estimate")}?p={k}"><b>{n}</b><span>{d}</span>{ico("right")}</a>' for k, n, d in e['presets'])
        return f'''    <section class="estimate-teaser section-pad" id="estimate" aria-labelledby="estimate-title">
      {self.sec_head('estimate-title', e['teaser_title'], e['teaser_text'])}
      <div class="presets">{cards}</div>
      <div class="sec-actions"><a class="btn-ghost" href="{self.to('estimate')}">{e['teaser_more']} {ico('right')}</a></div>
    </section>
'''

    def process(self, detailed=False):
        p = self.C['process']
        steps = p['steps_detail'] if detailed else p['steps']
        dur = self.C['tiers']['dur']
        lis = ''.join(f'<li><span class="step-n">{i + 1:02d}</span><b>{a}</b><p>{b}</p>{f'<span class="step-time">{dur[i]}</span>' if detailed else ''}</li>' for i, (a, b) in enumerate(steps))
        cls = 'steps steps-index' if detailed else 'steps'
        return f'''    <section class="process section-pad" id="process" aria-labelledby="process-title">
      {self.sec_head('process-title', p['title'], p.get('text', '') if detailed else '')}
      <ol class="{cls}" data-steps>{lis}</ol>
    </section>
'''

    def about(self):
        a = self.C['about']
        facts = ''.join(f'<li><b>{x}</b><span>{y}</span></li>' for x, y in a['facts'])
        return f'''    <section class="about section-pad" id="about" aria-labelledby="about-title">
      <div class="about-grid">
        <figure class="about-photo"><picture><source type="image/webp" srcset="{self.r('assets/team/boris-lahos-480.webp')} 480w, {self.r('assets/team/boris-lahos-800.webp')} 800w" sizes="(max-width: 760px) 60vw, 22vw"><img src="{self.r('assets/team/boris-lahos-800.jpg')}" alt="Boris Lahos" width="800" height="1000" loading="lazy" decoding="async"></picture></figure>
        <div class="about-copy"><h2 id="about-title">{a['title']}</h2><p>{a['text']}</p><ul class="about-facts">{facts}</ul>
          <div class="about-links"><a class="btn-ghost" href="https://www.linkedin.com/in/boris-lahos/" rel="me noopener">LinkedIn {ico('out')}</a><a class="btn-ghost" href="https://github.com/Jaddes" rel="me noopener">GitHub {ico('out')}</a></div></div>
      </div>
    </section>
'''

    def faq(self):
        f = self.C['faq']
        items = ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in f['items'])
        return f'''    <section class="faq section-pad" id="faq" aria-labelledby="faq-title">
      {self.sec_head('faq-title', f['title'], '', f'<a class="btn-ghost" href="{self.home("#contact")}">{f["more"]} {ico("out")}</a>')}
      <div class="faq-list faq-cols">{items}</div>
    </section>
'''

    def contact(self):
        c = self.C['contact']
        steps = ''.join(f'<li>{x}</li>' for x in c['steps'])
        opts = ''.join(f'<option value="{v}"{" selected" if v == "unsure" else ""}>{n}</option>' for v, n in c['services'])
        wa = c['wa_text']
        return f'''    <section class="contact section-pad" id="contact" aria-labelledby="contact-title">
      <h2 id="contact-title">{c['title']}</h2>
      <div class="contact-bottom">
        <div class="contact-steps">
          <p>{c['intro']}</p><ol>{steps}</ol>
          <p class="contact-promise">{c['promise']}</p>
          <div class="contact-direct"><p>{c['direct']}</p>
            <a class="contact-mail" href="mailto:hello@barvis-studio.dev">hello@barvis-studio.dev</a>
            <div class="contact-quick"><a href="https://wa.me/38169625066?text={wa}" rel="noopener">WhatsApp</a><a href="viber://chat?number=%2B38169625066">Viber</a><a href="tel:+38169625066">+381 69 625 066</a></div>
            <button class="copy-mail" type="button" data-copy="hello@barvis-studio.dev" data-copied="{esc(c['copied'])}" data-copy-failed="{esc(c['copy_failed'])}" hidden>{c['copy']}</button>
            <p class="copy-status" role="status" aria-live="polite"></p>
          </div>
        </div>
        <form class="contact-form" id="upit" data-contact-form data-endpoint="" action="mailto:hello@barvis-studio.dev" method="post" enctype="text/plain" novalidate>
          <div class="form-row">
            <div class="field"><label for="cf-name">{c['name']}</label><input id="cf-name" name="name" type="text" autocomplete="name" required aria-describedby="cf-name-err"><p class="field-error" id="cf-name-err" hidden></p></div>
            <div class="field"><label for="cf-contact">{c['contact']}</label><input id="cf-contact" name="contact" type="text" autocomplete="email" required aria-describedby="cf-contact-err"><p class="field-error" id="cf-contact-err" hidden></p></div>
          </div>
          <div class="field"><label for="cf-service">{c['service']}</label><select id="cf-service" name="service">{opts}</select></div>
          <div class="field"><label for="cf-message">{c['message']}</label><textarea id="cf-message" name="message" rows="6" required aria-describedby="cf-message-err" placeholder="{esc(c['placeholder'])}"></textarea><p class="field-error" id="cf-message-err" hidden></p></div>
          <div class="hp" aria-hidden="true"><label for="cf-botcheck">x</label><input id="cf-botcheck" name="botcheck" type="text" tabindex="-1" autocomplete="off"></div>
          <div class="form-foot"><button class="btn-dark" type="submit">{c['submit']} {ico('out')}</button><p class="form-note">{c['note']}</p></div>
          <div class="form-status" role="status" aria-live="polite" tabindex="-1"></div>
        </form>
      </div>
    </section>
'''

    # ---------------------------------------------------------- stranice
    def page_home(self):
        C = self.C
        body = (self.hero() + self.chaos() + self.services_intro() + self.who_intro() + self.work() + self.estimate_teaser()
                + self.process() + self.about() + self.faq() + self.contact())
        return self.head(C['meta']['title'], C['meta']['desc']) + self.header() + f'\n  <main id="main" tabindex="-1">\n{body}  </main>\n\n' + self.footer() + self.scripts()

    def subpage(self, title, desc, inner):
        return self.head(title, desc) + self.header() + f'\n  <main id="main" tabindex="-1" class="subpage">\n{inner}  </main>\n\n' + self.footer() + self.scripts()

    def page_head(self, kicker, title, lead):
        return f'''    <section class="page-head" id="top">
      <a class="back-link" href="{self.to('home')}">{ico('left')} {self.C['ui']['home']}</a>
      <p class="eyebrow">{kicker}</p><h1>{title}</h1><p class="page-lead">{lead}</p>
    </section>
'''

    def page_pricing(self):
        p, t, lang = self.C['pricing'], self.C['tiers'], self.lang
        groups = ''
        for kind in TIERS.ORDER:
            name, desc = t['group'][kind]
            rows = ''
            for key, lo, hi, weeks in TIERS.PRICES[kind]:
                tname, tdesc = t['tier'][key]
                if kind == 'maintenance':
                    price = (f'€{num(lang, lo)}' if lang in PREFIX else f'{num(lang, lo)} €') + f' <small>/ {t["month"]}</small>'
                    when = '—'
                else:
                    price = eur_range(lang, lo, hi, t)
                    when = f'{weeks[0]}–{weeks[1]} {t["weeks"]}'
                rows += f'''<a class="tier" href="{self.to('estimate')}?k={kind}&amp;t={key}"><span class="tier-name">{tname}</span><span class="tier-desc">{tdesc}</span><span class="tier-time">{when}</span><span class="tier-price">{price}</span>{ico('right')}</a>'''
            groups += f'''<section class="tier-group" id="{kind}" aria-labelledby="g-{kind}"><header><h2 id="g-{kind}">{name}</h2><p>{desc}</p></header>
          <div class="tier-head" aria-hidden="true"><span>{t['cols'][0]}</span><span>{t['cols'][1]}</span><span>{t['cols'][2]}</span><span>{t['cols'][3]}</span></div>{rows}</section>'''
        inner = self.page_head(p['kicker'], p['title'], t['lead']) + f'''    <section class="pricing-table section-pad" aria-label="{esc(p['kicker'])}">
      {groups}
      <p class="pricing-note">{t['note']}</p>
      <div class="sec-actions"><a class="btn-primary" href="{self.to('estimate')}">{p['cta']} {ico('right')}</a></div>
    </section>
''' + self.faq()
        return self.subpage(p['meta_title'], p['meta_desc'], inner)

    def page_estimate(self):
        e, t = self.C['estimate'], self.C['tiers']
        q = e['q']
        opt = lambda name, typ, items, checked: ''.join(f'<label class="opt"><input type="{typ}" name="{name}" value="{v}"{" checked" if v in checked else ""}><span>{n}</span></label>' for v, n in items)
        row = lambda i, title, body, extra='': f'<fieldset class="q"{extra}><legend><span class="q-n">{i:02d}</span>{title}</legend><div class="q-body">{body}</div></fieldset>'
        form = f'''    <section class="estimate section-pad" id="estimate-tool" aria-label="{esc(e['kicker'])}">
      <form class="estimate-grid" data-estimate novalidate>
        <div class="estimate-steps">
          {row(1, q[0] + f' <small>{e["any"]}</small>', f'<div class="opts">{opt("kind", "checkbox", e["kinds"], ("system",))}</div>')}
          {row(2, q[1] + f' <small>{e["any"]}</small>', f'<div class="opts" data-feature-row>{opt("feature", "checkbox", e["features"], ("booking", "clients"))}</div><div class="custom-add"><input type="text" maxlength="60" placeholder="{esc(e["custom"])}" aria-label="{esc(e["custom"])}" data-custom><button type="button" class="chip-add" data-custom-add>{ico("plus")}{e["add"]}</button></div>', ' data-features')}
          {row(3, q[2], f'<div class="opts">{opt("team", "radio", e["team"], ("2-5",))}</div>')}
          {row(4, q[4], f'<div class="opts">{opt("when", "radio", e["when"], ("flex",))}</div>')}
          {row(5, q[3], f'<div class="opts">{opt("budget", "radio", e["budget"], ("unknown",))}</div>')}
        </div>
        <aside class="estimate-result" aria-live="polite">
          <p class="estimate-label">{e['result']}</p>
          <p class="estimate-package" data-out="package"></p>
          <dl class="estimate-figures"><div><dt>{t['est']['range']}</dt><dd data-out="range"></dd></div><div><dt>{t['est']['time']}</dt><dd data-out="time"></dd></div></dl>
          <p class="estimate-monthly" data-out="monthly" hidden></p>
          <p class="estimate-fit" data-out="fit"></p>
          <ul class="estimate-list" data-out="list"></ul>
          <div class="estimate-actions"><a class="btn-primary" data-send="form" href="#contact">{e['send']} {ico('down')}</a><a class="btn-ghost" data-send="whatsapp" href="#contact" rel="noopener">WhatsApp</a></div>
          <button class="estimate-copy" type="button" data-send="copy">{e['copy']}</button>
          <p class="estimate-status" role="status"></p>
        </aside>
      </form>
    </section>
'''
        inner = self.page_head(e['kicker'], e['title'], e['lead']) + form + self.contact()
        return self.subpage(e['meta_title'], e['meta_desc'], inner)
    def page_who(self):
        w = self.C['who']
        m = self.C['more']
        rows = ''
        for i, c in enumerate(w['cats']):
            gets = ''.join(f'<li>{g}</li>' for g in m['gets'][i])
            draft = m['draft'].format(name=c['name'], problem=c['problem'], solution=c['solution'][0].lower() + c['solution'][1:])
            rows += f'''<details class="who-row" id="{c['id']}"><summary><span class="row-n">{i + 1:02d}</span><b>{c['name']}</b><span class="row-problem">{c['problem']}</span><span class="row-toggle" aria-hidden="true"></span></summary>
          <div class="row-body"><div class="row-cols"><p><span>{w['problem']}</span>{c['problem']}</p><p><span>{w['solution']}</span>{c['solution']}</p><div><span>{m['gets_label']}</span><ul>{gets}</ul></div></div>
            <div class="row-draft" data-draft><label for="draft-{c['id']}">{m['draft_label']}</label><textarea id="draft-{c['id']}" rows="6">{esc(draft)}</textarea>
              <div class="row-send"><a class="btn-primary" data-draft-wa href="https://wa.me/38169625066" rel="noopener">{ico('chat')} {m['send_wa']}</a><a class="btn-ghost" data-draft-mail href="mailto:hello@barvis-studio.dev">{m['send_mail']}</a></div></div></div></details>'''
        exp = ''.join(f'<a class="exp-card" href="{self.to(x["page"])}"><img src="{self.r("assets/work/" + ("fizio-calendar" if x["page"] == "fizio" else "focus-timer") + "-960.webp")}" alt="" width="1440" height="900" loading="lazy" decoding="async"><span class="exp-copy"><b>{x["name"]}</b><span>{x["text"]}</span><span class="exp-more">{w["exp_more"]} {ico("right")}</span></span></a>' for x in w['exp'])
        inner = (self.page_head(w['kicker'], w['page_title'], w['page_lead'])
                 + f'    <section class="who-index section-pad" aria-label="{esc(w["kicker"])}"><div class="who-rows">{rows}</div><p class="who-note">{w["note"]}</p></section>\n'
                 + self.process(detailed=True)
                 + f'    <section class="experience section-pad" aria-labelledby="exp-title">{self.sec_head("exp-title", w["exp_title"], w["exp_text"])}<div class="exp-grid">{exp}</div></section>\n'
                 + f'    <section class="cta-band section-pad"><h2>{w["cta_title"]}</h2><div class="sec-actions"><a class="btn-primary" href="{self.home("#contact")}">{self.C["ui"]["cta_long"]} {ico("out")}</a><a class="btn-ghost" href="{self.to("estimate")}">{w["cta_estimate"]}</a></div></section>\n')
        return self.subpage(w['meta_title'], w['meta_desc'], inner)

    def page_case(self, key):
        cs = self.C['cases'][key]
        other = 'focus' if key == 'fizio' else 'fizio'
        facts = ''.join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in cs['facts'])
        video = f"{'fizio' if key == 'fizio' else 'focus'}-walkthrough{'' if self.lang == 'sr' else '-en'}"
        shots = ''
        for img, cls, alt, cap in cs['shots']:
            widths = (960, 1440, 2400, 3093) if img == 'fizio-reminders' else (960, 1440, 2400, 3840)
            w, h = (3840, 2400) if img.endswith('phones') else ((3093, 1899) if img == 'fizio-reminders' else (1440, 900))
            shots += f'''<figure class="shot{(' ' + cls) if cls else ''}"><picture><source type="image/webp" srcset="{self.srcset(img, widths)}" sizes="(max-width: 760px) 92vw, 60vw"><img src="{self.r(f'assets/work/{img}-960.webp')}" alt="{esc(alt)}" width="{w}" height="{h}" loading="lazy" decoding="async"></picture><figcaption>{cap}</figcaption></figure>'''
        tags = ''.join(f'<li>{t}</li>' for t in cs['tags'])
        extra = ''
        if key == 'fizio':
            extra = f'<a class="btn-ghost" href="{DEMO}" rel="noopener">{self.C["work"]["demo"]} {ico("out")}</a>'
            if self.lang == 'sr':
                extra += f'<a class="btn-ghost" href="{self.r("softver-za-fizioterapeute/")}">Softver za fizioterapeute</a>'
        nav = f'<nav class="case-nav" aria-label="{esc(self.C["work"]["title"])}"><a href="{self.home("#work") if self.page == "home" else self.to("home", "#work")}">{ico("left")} {self.C["ui"]["all_work"]}</a><a href="{self.to(other)}">{self.C["ui"]["next"]}: {self.C["work"][other]["name"]} {ico("right")}</a></nav>'
        inner = f'''    <article class="case{' case-focus' if key == 'focus' else ''}" id="case-{key}" aria-labelledby="case-title">
      {nav}
      <div class="project-meta"><span>{cs['tag']}</span></div>
      <div class="case-intro"><h1 id="case-title">{cs['title']}</h1><dl class="case-facts">{facts}</dl></div>
      <div class="case-media">
        <figure class="case-video"><video controls playsinline preload="none" data-poster="{self.r(f'assets/work/{video}-poster.webp')}" width="1280" height="800" aria-describedby="video-desc"><source src="{self.r(f'assets/work/{video}.mp4')}" type="video/mp4"></video><figcaption id="video-desc">{cs['video']}</figcaption></figure>
        <div class="case-gallery">{shots}</div>
      </div>
      <ul class="case-tags">{tags}</ul>
      <div class="case-cta"><p>{cs['cta_text']}</p><a class="btn-primary" href="{self.to('home', '#contact')}" data-service="app">{cs['cta']} {ico('out')}</a>{extra}</div>
      {nav}
    </article>
'''
        return self.head(cs['meta_title'], cs['meta_desc']) + self.header() + f'\n  <main id="main" tabindex="-1" class="case-page">\n{inner}  </main>\n\n' + self.footer() + self.scripts()


def write(lang, page, text):
    out = DIST / url_path(lang, page) / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding='utf-8')


def main():
    urls = []
    only = [x for x in os.environ.get('BUILD_LANGS', '').split(',') if x]
    for lang in (only or LANGS):
        C = load(lang)
        for page in PAGES:
            p = Page(lang, page, C)
            text = {'home': p.page_home, 'pricing': p.page_pricing, 'estimate': p.page_estimate, 'who': p.page_who,
                    'fizio': lambda: p.page_case('fizio'), 'focus': lambda: p.page_case('focus')}[page]()
            write(lang, page, text)
            urls.append(f'{SITE}/{url_path(lang, page)}')
    for extra in ('softver-za-fizioterapeute/', 'aplikacija-za-zakazivanje/', 'izrada-sajtova/'):
        urls.append(f'{SITE}/{extra}')
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n'
    (DIST / 'sitemap.xml').write_text(sitemap, encoding='utf-8')
    print(f'ok: {len(LANGS)} jezika, {len(urls)} stranica')


if __name__ == '__main__':
    main()
