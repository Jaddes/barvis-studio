"""BARVIS Studio: generator stranica za sve jezike (v6, redizajn).

Tekstovi: content/<jezik>.py (C, postojeći), content/x_<jezik>.py (X, novi delovi), content/tiers.py (cene i rokovi),
content/who_more.py. Izgled i ponašanje: tools/site/src/ (tokens.css, site.css, sections.css, site.js, start.js, icons.svg).
Pokretanje iz korena repozitorijuma:  python tools/site/build.py
Generiše dist/ (srpski u korenu, ostali jezici u dist/<kod>/). Ručno pisane stranice
(softver-za-fizioterapeute, aplikacija-za-zakazivanje, izrada-sajtova, 404) ne dira, osim otiska keša.
Art direkcija i odluke: docs/BARVIS_STUDIO_ART_DIRECTION.md.
"""
import hashlib
import html
import importlib.util
import json
import os
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / 'dist'
SRC = Path(__file__).parent / 'src'
SITE = 'https://barvis-studio.dev'
DEMO = 'https://demo.barvis-studio.dev/'
MAIL = 'hello@barvis-studio.dev'
PHONE = '38169625066'
# Prazno dok kontrolisani test upita sa prijemom mejla ne prođe (tada: 'https://api.barvis-studio.dev/v1/inquiries').
ENDPOINT = ''
LANGS = ['sr', 'en', 'de', 'fr', 'es', 'it', 'ru', 'zh', 'ja', 'ko', 'hu']
HTML_LANG = {'sr': 'sr-Latn', 'zh': 'zh-Hans'}
OG_LOCALE = {'sr': 'sr_RS', 'en': 'en_GB', 'de': 'de_DE', 'fr': 'fr_FR', 'es': 'es_ES', 'it': 'it_IT', 'ru': 'ru_RU', 'zh': 'zh_CN', 'ja': 'ja_JP', 'ko': 'ko_KR', 'hu': 'hu_HU'}
NATIVE = {'sr': 'Srpski', 'en': 'English', 'de': 'Deutsch', 'fr': 'Français', 'es': 'Español', 'it': 'Italiano', 'ru': 'Русский', 'zh': '中文', 'ja': '日本語', 'ko': '한국어', 'hu': 'Magyar'}
CJK = {'zh', 'ja', 'ko'}
SLUGS = {
    'sr': dict(home='', pricing='cenovnik/', estimate='procena/', start='pokrenite-projekat/', who='za-koga/', fizio='radovi/fizio-alfa/', focus='radovi/barvis-focus/', privacy='privatnost/'),
    'other': dict(home='', pricing='pricing/', estimate='estimate/', start='start-a-project/', who='how-i-work/', fizio='work/fizio-alfa/', focus='work/barvis-focus/', privacy='privacy/'),
}
PAGES = ['home', 'pricing', 'estimate', 'start', 'who', 'fizio', 'focus', 'privacy']
ASSETS = ('site.css', 'site.js', 'start.js')


def _module(name):
    spec = importlib.util.spec_from_file_location(f'content_{name}', Path(__file__).parent / 'content' / f'{name}.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


TIERS = _module('tiers')
WHO = _module('who_more')
LAND = _module('landing_sr')


def version(name):
    return hashlib.sha256((DIST / name).read_bytes()).hexdigest()[:10]


def build_assets():
    css = ''.join((SRC / f).read_text(encoding='utf-8') + '\n' for f in ('tokens.css', 'site.css', 'sections.css'))
    (DIST / 'site.css').write_text(css.replace("url('fonts/", "url('assets/fonts/"), encoding='utf-8')
    for f in ('site.js', 'start.js'):
        shutil.copyfile(SRC / f, DIST / f)
    shutil.copyfile(SRC / 'icons.svg', DIST / 'assets' / 'icons.svg')
    shutil.copyfile(SRC / 'favicon.svg', DIST / 'favicon.svg')


def load(lang):
    C = _module(lang).C
    try:
        X = _module(f'x_{lang}').X
    except FileNotFoundError:
        X = _module('x_en').X
    t = TIERS.T[lang]
    C['tiers'], C['more'], C['X'] = t, WHO.W[lang], X
    C['faq']['items'][0] = t['faq1']
    C['faq']['items'][-1] = t['faq8']
    C['pricing']['meta_desc'] = t['meta']
    return C


SEP = {'sr': '.', 'de': '.', 'it': '.', 'en': ',', 'zh': ',', 'ja': ',', 'ko': ',', 'fr': ' ', 'ru': ' ', 'hu': ' ', 'es': '.'}
PREFIX = {'en', 'zh', 'ja', 'ko'}


def num(lang, n):
    if lang == 'es' and n < 10000:
        return str(n)
    return f'{n:,}'.replace(',', SEP[lang])


def amount(lang, n):
    return f'€{num(lang, n)}' if lang in PREFIX else f'{num(lang, n)} €'


def eur_range(lang, lo, hi, t):
    """„1.500–4.000 €“, „€1,500–4,000“, „od 1.500 €“…"""
    if hi is None:
        a = amount(lang, lo)
        if lang == 'hu':
            return f'{a}<small>{t["from_"]}</small>'
        if lang in CJK:
            return f'{a} <small>{t["from_"]}</small>'
        return f'<small>{t["from_"]}</small> {a}'
    if lang in PREFIX:
        return f'€{num(lang, lo)}–{num(lang, hi)}'
    return f'{num(lang, lo)}–{num(lang, hi)} €'


def tier_display(lang, key, t, X):
    """Cena i rok jednog paketa, isto kao na cenovniku."""
    for kind, rows in TIERS.PRICES.items():
        for k, lo, hi, weeks in rows:
            if k != key:
                continue
            if kind == 'maintenance':
                return eur_range(lang, lo, None, t) + f' <small>/ {t["month"]}</small>', X['js']['now'], lo
            if TIERS.SHOW.get(k) == 'quote':
                return t['quote'], f'{weeks[0]}+ {t["weeks"]}', lo
            price = eur_range(lang, lo, None if TIERS.SHOW.get(k) == 'from' else hi, t)
            return price, f'{weeks[0]}–{weeks[1]} {t["weeks"]}', lo
    raise KeyError(key)


def slug(lang, page):
    return SLUGS['sr' if lang == 'sr' else 'other'][page]


def url_path(lang, page):
    return ('' if lang == 'sr' else f'{lang}/') + slug(lang, page)


def esc(s):
    return html.escape(s, quote=True)


def strip(s):
    return re.sub(r'<[^>]+>', '', s)


# ------------------------------------------------------------------ stranica
class Page:
    def __init__(self, lang, page, C):
        self.lang, self.page, self.C, self.X = lang, page, C, C['X']

    def r(self, path):
        depth = url_path(self.lang, self.page).count('/')
        return ('../' * depth or './') + path

    def to(self, page, anchor=''):
        if url_path(self.lang, page) == url_path(self.lang, self.page):
            return anchor or './'
        return self.r(url_path(self.lang, page)) + anchor

    def home(self, anchor):
        return anchor if self.page == 'home' else self.to('home', anchor)

    def start(self, query=''):
        return self.to('start') + (('?' + query) if query else '')

    def ico(self, name, cls=''):
        return f'<svg class="ico{(" " + cls) if cls else ""}" aria-hidden="true"><use href="{self.r("assets/icons.svg")}#i-{name}"/></svg>'

    def img(self, name, alt, sizes, widths=(960, 1440, 2400), w=1440, h=900, lazy=True, extra=''):
        srcset = ', '.join(f'{self.r(f"assets/work/{name}-{x}.webp")} {x}w' for x in widths)
        load = 'loading="lazy" ' if lazy else 'fetchpriority="high" '
        return f'<img src="{self.r(f"assets/work/{name}-{widths[0]}.webp")}" srcset="{srcset}" sizes="{sizes}" width="{w}" height="{h}" alt="{esc(alt)}" {load}decoding="async"{extra}>'

    def screen(self, title, inner, alt='', cls=''):
        return f'<div class="screen{(" " + cls) if cls else ""}" data-alt="{esc(alt)}"><div class="screen-bar" aria-hidden="true"><i></i><i></i><i></i><span>{title}</span></div>{inner}</div>'

    def lang_links(self):
        return ''.join(f'<a href="{self.r(url_path(l, self.page))}" hreflang="{HTML_LANG.get(l, l)}" lang="{HTML_LANG.get(l, l)}"{" aria-current=\"page\"" if l == self.lang else ""}>{NATIVE[l]}</a>' for l in LANGS)

    # ---------------------------------------------------------- okvir
    def head(self, title, desc, i18n=None, preload=''):
        canon = getattr(self, 'canon', None) or f'{SITE}/{url_path(self.lang, self.page)}'
        alts = '' if getattr(self, 'no_alts', False) else ''.join(f'\n  <link rel="alternate" hreflang="{HTML_LANG.get(l, l)}" href="{SITE}/{url_path(l, self.page)}">' for l in LANGS) + f'\n  <link rel="alternate" hreflang="x-default" href="{SITE}/{url_path("en", self.page)}">'
        robots = '\n  <meta name="robots" content="noindex">' if getattr(self, 'noindex', False) else ''
        fonts = ['geist-cyrillic', 'cormorant-italic-cyrillic'] if self.lang == 'ru' else ['geist-latin'] + ([] if self.lang in CJK else ['cormorant-italic-latin'])
        pre = ''.join(f'\n  <link rel="preload" href="{self.r(f"assets/fonts/{f}.woff2")}" as="font" type="font/woff2" crossorigin>' for f in fonts)
        data = f'\n  <script type="application/json" id="i18n">{json.dumps(i18n, ensure_ascii=False).replace("</", "<\\/")}</script>' if i18n else ''
        return f'''<!doctype html>
<html lang="{HTML_LANG.get(self.lang, self.lang)}" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}">
  <meta name="theme-color" content="#0c100f">
  <meta name="color-scheme" content="dark">
  <link rel="canonical" href="{canon}">{alts}{robots}
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
  <meta name="twitter:title" content="{esc(title)}">
  <meta name="twitter:description" content="{esc(desc)}">{pre}{preload}
  <link rel="stylesheet" href="{self.r('site.css')}?v={version('site.css')}">
  <script>document.documentElement.classList.replace('no-js', 'js');</script>{data}
</head>
'''

    def brand(self):
        return (f'<a class="brand" href="{self.home("#main")}" aria-label="{esc(self.X["nav"]["home"])}"><svg class="brand-mark" viewBox="0 0 22 22" aria-hidden="true">'
                '<rect x="2.5" y="3" width="9" height="9" rx="1.5" fill="none" stroke="#878a82" transform="rotate(-12 7 7.5)"/>'
                '<rect x="10" y="2" width="8" height="8" rx="1.5" fill="none" stroke="#878a82" transform="rotate(9 14 6)"/>'
                '<rect x="5" y="11" width="11" height="9" rx="1.5" fill="#c8f250"/></svg>BARVIS <small>studio</small></a>')

    def nav_items(self):
        n = self.X['nav']
        items = [(self.home('#usluge'), n['services'], False), (self.home('#radovi'), n['work'], self.page in ('fizio', 'focus')),
                 (self.to('pricing'), n['pricing'], self.page == 'pricing'), (self.to('estimate'), n['estimate'], self.page == 'estimate'),
                 (self.to('who'), n['how'], self.page == 'who'), (self.home('#o-studiju'), n['about'], False)]
        return items

    def header(self, cta=None):
        n = self.X['nav']
        cta = cta or self.start()
        nav = ''.join(f'<li><a href="{h}"{" aria-current=\"page\"" if cur else ""}>{l}</a></li>' for h, l, cur in self.nav_items())
        mnav = ''.join(f'<li><a href="{h}"{" aria-current=\"page\"" if cur else ""}><span>{i + 1:02d}</span>{l}</a></li>' for i, (h, l, cur) in enumerate(self.nav_items()))
        others = ''.join(f'<a href="{self.r(url_path(l, self.page))}" lang="{HTML_LANG.get(l, l)}">{NATIVE[l]}</a>' for l in LANGS if l != self.lang)
        return f'''<body data-page="{self.page}">
  <a class="skip-link" href="#main">{n['skip']}</a>
  <div class="grain" aria-hidden="true"></div>
  <header class="site-header">
    {self.brand()}
    <nav class="main-nav" aria-label="{esc(n['main'])}"><ul>{nav}</ul></nav>
    <div class="header-end">
      <details class="lang">
        <summary aria-label="{esc(n['lang'])}: {NATIVE[self.lang]}">{self.ico('globus')}{self.lang.upper()}</summary>
        <div class="lang-list" translate="no">{self.lang_links()}</div>
      </details>
      <a class="btn btn-primary header-cta" href="{cta}">{n['cta']}</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="mobile-menu">{self.ico('hamburger-menu')}{n['menu']}</button>
    </div>
  </header>
  <div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="{esc(n['menu'])}" hidden>
    <button class="menu-btn menu-close" type="button">{self.ico('close-circle')}{n['close']}</button>
    <nav aria-label="{esc(n['main'])}"><ul>{mnav}</ul></nav>
    <div class="mobile-menu-foot">
      <a class="btn btn-primary" href="{cta}">{n['cta']} {self.ico('arrow-right')}</a>
      <details><summary>{n['lang']}: {NATIVE[self.lang]}</summary><div class="langs" translate="no">{others}</div></details>
    </div>
  </div>
'''

    def thumb(self, href=None, label=None, estimate=True):
        n = self.X['nav']
        est = f'<a class="btn btn-icon" href="{self.to("estimate")}" tabindex="-1" aria-label="{esc(n["estimate"])}">{self.ico("calculator")}</a>' if estimate else ''
        return f'''  <div class="thumb-bar" data-thumb aria-hidden="true"><a class="btn btn-primary" href="{href or self.start()}" tabindex="-1">{label or n['cta']}</a>{est}</div>
'''

    def footer(self):
        f, n, w = self.X['footer'], self.X['nav'], self.X['paths']['items']
        return f'''  <footer class="site-footer" id="o-studiju-footer">
    <div class="wrap grid">
      <div class="foot-brand">{self.brand()}<p>{f['text']}</p></div>
      <nav class="foot-col" aria-labelledby="ft-studio"><h2 id="ft-studio">{f['studio']}</h2><ul><li><a href="{self.home('#radovi')}">{n['work']}</a></li><li><a href="{self.to('pricing')}">{n['pricing']}</a></li><li><a href="{self.to('who')}">{n['how']}</a></li><li><a href="{DEMO}" rel="noopener">{f['demo']}</a></li></ul></nav>
      <nav class="foot-col" aria-labelledby="ft-start"><h2 id="ft-start">{f['start']}</h2><ul><li><a href="{self.start('put=upit')}">{w[0][0]}</a></li><li><a href="{self.to('estimate')}">{w[1][0]}</a></li><li><a href="{self.start('put=razgovor')}">{w[2][0]}</a></li></ul></nav>
      <nav class="foot-col" aria-labelledby="ft-contact"><h2 id="ft-contact">{f['contact']}</h2><ul><li><a href="mailto:{MAIL}">{MAIL}</a></li><li><a href="tel:+{PHONE}">+381 69 625 066</a></li><li><a href="https://www.linkedin.com/in/boris-lahos/" rel="me noopener">LinkedIn</a></li><li><a href="https://github.com/Jaddes" rel="me noopener">GitHub</a></li></ul></nav>
      <div class="foot-legal"><span>© 2026 Boris Lahos · Novi Sad</span><a href="{self.to('privacy')}">{f['privacy']}</a><span>{f['icons']}</span></div>
    </div>
  </footer>
'''

    def scripts(self, motion=True, start=False):
        s = []
        if motion:
            s += [f'  <script src="{self.r("assets/vendor/gsap.min.js")}" defer></script>', f'  <script src="{self.r("assets/vendor/ScrollTrigger.min.js")}" defer></script>']
        s.append(f'  <script src="{self.r("site.js")}?v={version("site.js")}" defer></script>')
        if start:
            s.append(f'  <script src="{self.r("start.js")}?v={version("start.js")}" defer></script>')
        return '\n'.join(s) + '\n</body>\n</html>\n'

    def doc(self, title, desc, main, i18n=None, preload='', motion=True, start=False, cta=None, thumb=None):
        return (self.head(title, desc, i18n, preload) + self.header(cta) + f'\n  <main id="main" tabindex="-1">\n{main}  </main>\n\n'
                + (thumb if thumb is not None else self.thumb()) + self.footer() + self.scripts(motion, start))

    # ---------------------------------------------------------- i18n za start.js
    def i18n(self):
        C, X, t = self.C, self.X, self.C['tiers']
        P = {}
        for kind, rows in TIERS.PRICES.items():
            for key, *_ in rows:
                price, time, lo = tier_display(self.lang, key, t, X)
                P[key] = dict(name=t['tier'][key][0], price=price, time=time, lo=lo)
        E = C['js']['E']
        return dict(lang=self.lang, locale=C['js']['locale'], icons=self.r('assets/icons.svg'), X=X['js'], P=P,
                    L=dict(kind={k: b for k, b, _ in X['wiz']['kinds']}, team=E['team'], when=E['when'], budget=E['budget']),
                    labels=dict(price=X['wiz']['price'], time=X['wiz']['time'], next=X['wiz']['next'], see=X['wiz']['see']),
                    similar=X['case']['similar_msg'])

    # ---------------------------------------------------------- forma za upit (start stranica i početna)
    def inquiry(self, full=True):
        F, X = self.X['form'], self.X
        opt = F['optional']
        services = ''.join(f'<label class="pick"><input type="radio" name="service" value="{v}"{" required" if i == 0 else ""}><span>{l}</span></label>' for i, (v, l) in enumerate(F['services']))
        chips = lambda name, items: ''.join(f'<label class="pick"><input type="radio" name="{name}" value="{esc(v)}"><span>{v}</span></label>' for v in items)
        budget = chips('x_budget', [b for _, b in self.C['estimate']['budget']])
        when = chips('x_when', [w for _, w in self.C['estimate']['when']])
        team = chips('x_team', F['team_opts'])
        slots = ''.join(f'<label class="pick"><input type="checkbox" name="slot" value="{esc(s)}"><span>{s}</span></label>' for s in F['slots'])
        medium = ''.join(f'<label class="pick"><input type="radio" name="medium" value="{esc(m)}"><span>{m}</span></label>' for m in F['medium'])
        attached = f'<div class="attached" data-attached hidden><header><span>{F["attached"]}</span><button type="button" data-edit-estimate>{F["edit"]}</button></header><pre data-attached-text></pre></div>' if full else ''
        call = f'''<fieldset class="chips" data-only="razgovor" hidden><legend>{F['slots_legend']} <span class="opt-tag">{opt}</span></legend>{slots}{medium}</fieldset>''' if full else ''
        err = lambda n: f'<p class="field-error" id="f-{n}-err" data-err="{n}" hidden></p>'
        return f'''<form class="form" id="upit" data-inquiry data-endpoint="{ENDPOINT}" action="mailto:{MAIL}" method="post" enctype="text/plain" novalidate>
              {attached}
              <div class="form-row">
                <div class="field"><label for="f-name">{F['name']}</label><input class="input" id="f-name" name="name" type="text" autocomplete="name" required minlength="2" maxlength="100" aria-describedby="f-name-err">{err('name')}</div>
                <div class="field"><label for="f-contact">{F['contact']}</label><input class="input" id="f-contact" name="contact" type="text" inputmode="email" autocomplete="email" required maxlength="200" aria-describedby="f-contact-hint f-contact-err"><p class="hint" id="f-contact-hint">{F['contact_hint']}</p>{err('contact')}</div>
              </div>
              <fieldset class="chips" aria-describedby="f-service-err"><legend>{F['service']}</legend>{services}{err('service').replace('class="field-error"', 'class="field-error" style="width:100%"')}</fieldset>
              <div class="field"><label for="f-message" data-msg-label data-t-upit="{esc(F['msg_upit'])}" data-t-razgovor="{esc(F['msg_razgovor'])}">{F['msg_upit']}</label>
                <textarea class="textarea" id="f-message" name="message" rows="5" required minlength="10" maxlength="5000" aria-describedby="f-message-hint f-message-err" placeholder="{esc(self.C['contact']['placeholder'])}"></textarea>
                <p class="hint" id="f-message-hint">{F['msg_hint']}</p>{err('message')}</div>
              {call}
              <details class="more">
                <summary><span>{F['more']} <small>{F['more_small']}</small></span>{self.ico('alt-arrow-down')}</summary>
                <div class="more-body">
                  <fieldset class="chips"><legend>{F['budget']}</legend>{budget}</fieldset>
                  <fieldset class="chips"><legend>{F['when']}</legend>{when}</fieldset>
                  <fieldset class="chips"><legend>{F['team']}</legend>{team}</fieldset>
                  <div class="field"><label for="f-existing">{F['existing']} <span class="opt-tag">{opt}</span></label><input class="input" id="f-existing" name="x_existing" type="text" maxlength="200" placeholder="{esc(F['existing_ph'])}"></div>
                  <div class="field"><span class="flabel">{F['attach']} <span class="opt-tag">{opt}</span></span><p class="hint">{F['attach_hint']}</p></div>
                </div>
              </details>
              <div class="hp" aria-hidden="true"><label for="f-botcheck">{F['hp']}</label><input id="f-botcheck" name="botcheck" type="text" tabindex="-1" autocomplete="off"></div>
              <div class="form-foot">
                <button class="btn btn-primary" type="submit" data-submit data-t-upit="{esc(F['submit_upit'])}" data-t-razgovor="{esc(F['submit_razgovor'])}">{F['submit_upit']} {self.ico('arrow-right', 'ico-move')}</button>
                <p class="privacy-note">{F['privacy'].format(privacy=self.to('privacy'))}</p>
              </div>
              <p class="vh" role="status" aria-live="polite" data-form-live></p>
            </form>
            <div class="result" data-result tabindex="-1" hidden><h3 data-result-title></h3><div data-result-body></div><dl class="sent" data-sent></dl><div class="result-actions" data-result-actions></div><p class="status-line" role="status" aria-live="polite" data-result-status></p></div>'''

    # ---------------------------------------------------------- početna
    def sec_hero(self):
        h, a, n = self.X['hero'], self.X['art'], self.X['nav']
        C = self.C['hero']
        terms = ''.join(f'<li>{self.ico(i)}{t}</li>' for i, t in zip(('check-circle', 'clock-circle', 'shield-check'), h['terms']))
        note = ''.join(f'<p>{x}</p>' for x in a['note'][:2] + a['note'][3:])
        chat = f'<p>{a["chat"][0][0]}<small>{a["chat"][0][1]}</small></p><p class="me">{a["chat"][1][0]}</p>'
        cols = (0, 2, 3)  # hero: ime, iznos, plaćeno
        rows = ''.join('<tr>' + ''.join(f'<td{" class=\"miss\"" if not r[j] and j == 3 else ""}>{r[j]}</td>' for j in cols) + '</tr>' for r in a['rows'][:2])
        sheet = f'<table><caption>{a["file"]}</caption><tr>' + ''.join(f'<th>{a["cols"][j]}</th>' for j in cols) + f'</tr>{rows}</table>'
        return f'''    <section class="hero" aria-labelledby="hero-title">
      <div class="wrap grid">
        <div class="hero-copy">
          <p class="hero-who"><img src="{self.r('assets/team/boris-lahos-480.webp')}" alt="" width="36" height="36"><span><b>Boris Lahos</b> · {h['who']}</span></p>
          <h1 class="hero-title" id="hero-title"><span class="row"><span>{C['title1']}</span></span> <span class="row"><span class="ed">{C['title2']}</span></span></h1>
          <p class="lead">{h['lead']}</p>
          <div class="hero-actions"><a class="btn btn-primary" href="{self.start()}">{n['cta']} {self.ico('arrow-right', 'ico-move')}</a><a class="btn" href="#radovi">{h['work']}</a></div>
          <ul class="hero-terms" aria-label="{esc(h['terms_label'])}">{terms}</ul>
          <p class="hero-estimate"><a class="link-arrow" href="{self.to('estimate')}">{self.ico('calculator')}{h['estimate']}</a></p>
        </div>
        <div class="stage">
          <div class="stage-grid" aria-hidden="true"></div>
          <figure class="screen screen-main" data-alt="{esc(h['alt'])}"><div class="screen-bar" aria-hidden="true"><i></i><i></i><i></i><span>Fizio Alfa</span></div>
            {self.img('fizio-calendar', h['alt'], '(min-width: 1100px) 42vw, 86vw', lazy=False)}</figure>
          <figure class="screen screen-phone" aria-hidden="true"><img src="{self.r('assets/work/fizio-mobile-agenda-520.webp')}" srcset="{self.r('assets/work/fizio-mobile-agenda-520.webp')} 520w, {self.r('assets/work/fizio-mobile-agenda-780.webp')} 780w" sizes="(min-width: 1100px) 9vw, 18vw" width="780" height="1688" alt="" loading="lazy" decoding="async"></figure>
          <div class="art art-note" aria-hidden="true"><b>{a['day']}</b>{note}</div>
          <div class="art art-chat" aria-hidden="true">{chat}</div>
          <div class="art art-sheet" aria-hidden="true">{sheet}</div>
          <svg class="stage-lines" aria-hidden="true" focusable="false" data-lines data-to="0.34,0.30 0.47,0.56 0.62,0.80"></svg>
          <p class="stage-caption">{h['caption']} <a href="{self.to('fizio')}">{h['caption_link']}</a></p>
        </div>
      </div>
    </section>
'''

    def sec_proof(self):
        p = self.X['proof']
        facts = ''.join(f'<li>{f}</li>' for f in p['facts'])
        return f'''    <section class="proof" aria-label="{esc(p['label'])}"><div class="wrap"><p>{p['text']}</p><ul>{facts}</ul><a class="link-arrow" href="{self.to('fizio')}">{p['link']} {self.ico('arrow-right')}</a></div></section>
'''

    def sec_story(self):
        s, a = self.X['story'], self.X['art']
        steps = ''.join(f'<li data-step="{i}"><h3><span>{i + 1:02d}</span>{h}</h3><p>{p.format(fizio=self.to("fizio"))}</p></li>' for i, (h, p) in enumerate(s['steps']))
        note = ''.join(f'<p>{x}</p>' for x in a['note'])
        chat = ''.join(f'<p{" class=\"me\"" if not who else ""}>{m}{f"<small>{who}</small>" if who else ""}</p>' for m, who in a['chat'])
        th = ''.join(f'<th>{c}</th>' for c in a['cols'])
        rows = ''.join('<tr>' + ''.join(f'<td{" class=\"miss\"" if not c and j == 3 else ""}>{c}</td>' for j, c in enumerate(r)) + '</tr>' for r in a['rows'])
        recs = ''.join(f'<div class="record"><span class="who"><i>{"".join(w[0] for w in n.split()[:2])}</i>{n}</span><span>{what}</span><time>{when}</time><span class="chip{(" chip-" + k) if k else ""}">{chip}</span></div>' for n, what, when, chip, k in a['records'])
        return f'''    <section class="section story" id="usluge-problem" aria-labelledby="story-title" data-story>
      <div class="wrap grid">
        <div class="story-head"><p class="label"><span class="dot"></span>{s['label']}</p><h2 id="story-title">{s['title']}</h2></div>
        <ol class="story-steps">{steps}</ol>
        <div class="story-stage" aria-hidden="true">
          <div class="s-before">
            <div class="art art-note s-note"><b>{a['day']}</b>{note}</div>
            <div class="art art-chat s-chat">{chat}</div>
            <div class="art art-sheet s-sheet"><table><caption>{a['file']}</caption><tr>{th}</tr>{rows}</table></div>
          </div>
          <div class="records">{recs}</div>
          <figure class="story-result">{self.screen(s['screen'], self.img('fizio-client', '', '(min-width: 1100px) 50vw, 92vw', widths=(960, 1440)))}
            <figcaption><span>{s['caption']}</span><span>{s['fake']}</span></figcaption></figure>
        </div>
      </div>
    </section>
'''

    def sec_services(self):
        S, X, t = self.C['services'], self.X['services'], self.C['tiers']
        keys = [('system', 'tool'), ('site', 'landing'), ('automation', 'single'), ('maintenance', 'basic')]
        rows = ''
        for i, (tile, (k, tier)) in enumerate(zip(S['tiles'], keys)):
            price = tier_display(self.lang, tier, t, self.X)[0]
            if TIERS.SHOW.get(tier) != 'from' and k != 'maintenance':
                lo = dict((x[0], x[1]) for x in TIERS.PRICES[k])[tier]
                price = eur_range(self.lang, lo, None, t)
            rows += f'<li><a class="row-link" href="{self.to("estimate")}?k={k}&amp;t={tier}"><span class="n">{i + 1:02d}</span><h3>{tile["name"]}</h3><p>{tile["text"]}</p><span class="price">{price}<span class="go">{self.ico("arrow-right")}</span></span></a></li>'
        return f'''    <section class="section" id="usluge" aria-labelledby="services-title">
      <div class="wrap grid">
        <div class="sec-head"><p class="label"><span class="dot"></span>{X['label']}</p><h2 id="services-title">{S['title']}</h2><p>{S['text']}</p></div>
        <ul class="rows">{rows}</ul>
        <div class="sec-actions"><a class="btn" href="{self.to('pricing')}">{X['all']} {self.ico('arrow-right')}</a></div>
      </div>
    </section>
'''

    def sec_work(self):
        W, X = self.C['work'], self.X['work']
        f, fo = W['fizio'], W['focus']
        facts = lambda c: ''.join(f'<li class="chip">{x}</li>' for x in c['facts'])
        return f'''    <section class="section" id="radovi" aria-labelledby="work-title" style="padding-top:0">
      <div class="wrap grid">
        <div class="sec-head"><p class="label"><span class="dot"></span>{X['label']}</p><h2 id="work-title">{X['title']}</h2><p>{W['text']}</p></div>
        <article class="work-feature" aria-labelledby="w-fizio">
          <a class="work-media" href="{self.to('fizio')}" tabindex="-1" aria-hidden="true">{self.screen('Fizio Alfa', self.img('fizio-dashboard', '', '(min-width: 1100px) 58vw, 92vw'))}</a>
          <div class="work-copy"><p class="label">{f['name']} · {X['client']}</p><h3 id="w-fizio">{f['title']}</h3><p>{f['text']}</p><ul>{facts(f)}</ul>
            <div class="actions"><a class="btn btn-primary" href="{self.to('fizio')}">{X['case']} {self.ico('arrow-right', 'ico-move')}</a><a class="btn" href="{self.start('put=upit&amp;slicno=fizio')}">{X['similar']}</a><a class="btn btn-quiet" href="{DEMO}" rel="noopener">{W['demo']} {self.ico('arrow-right-up')}</a></div></div>
        </article>
        <article class="work-second" aria-labelledby="w-focus">
          <div class="work-copy"><p class="label">{fo['name']} · {X['own']}</p><h3 id="w-focus">{fo['title']}</h3><p>{fo['text']}</p><ul>{facts(fo)}</ul>
            <div class="actions"><a class="btn" href="{self.to('focus')}">{X['case']} {self.ico('arrow-right')}</a></div></div>
          <a class="work-media" href="{self.to('focus')}" tabindex="-1" aria-hidden="true">{self.screen('BARVIS Focus', self.img('focus-timer', '', '(min-width: 1100px) 50vw, 92vw'))}</a>
        </article>
      </div>
    </section>
'''

    def sec_paths(self):
        p = self.X['paths']
        hrefs = [self.start('put=upit'), self.to('estimate'), self.start('put=razgovor')]
        items = ''.join(f'<li class="path{" is-primary" if i == 0 else ""}"><a href="{h}"><span class="n">{i + 1:02d}</span><h3{f" data-badge=\"{esc(p["badge"])}\"" if i == 0 else ""}>{t}</h3><p>{d}</p><span class="meta"><span class="num">{tm}</span><span class="go">{self.ico("arrow-right")}</span></span></a></li>'
                        for i, ((t, d, tm), h) in enumerate(zip(p['items'], hrefs)))
        return f'''    <section class="section" id="kako-zapoceti" aria-labelledby="paths-title" style="padding-top:0">
      <div class="wrap grid">
        <div class="paths-head"><p class="label"><span class="dot"></span>{p['label']}</p><h2 id="paths-title">{p['title']}</h2><p class="lead">{p['lead']}</p></div>
        <ul class="paths">{items}</ul>
      </div>
    </section>
'''

    def sec_teaser(self):
        T, E = self.X['teaser'], self.C['estimate']
        cards = ''.join(f'<li><a href="{self.to("estimate")}?p={k}"><b>{n}</b><span>{d}</span><span class="go">{self.ico("arrow-right")}</span></a></li>' for k, n, d in E['presets'])
        return f'''    <section class="section" id="procena" aria-labelledby="teaser-title" style="padding-top:0">
      <div class="wrap grid">
        <div class="sec-head"><p class="label"><span class="dot"></span>{T['label']}</p><h2 id="teaser-title">{T['title']}</h2><p>{T['text']}</p></div>
        <ul class="presets">{cards}</ul>
      </div>
    </section>
'''

    def sec_process(self, detailed=False):
        p, dur = self.C['process'], self.C['tiers']['dur']
        steps = p['steps_detail'] if detailed else p['steps']
        lis = ''.join(f'<li><span class="step-n">{i + 1:02d}</span><b>{a}</b><p>{b}</p><span class="step-time">{dur[i]}</span></li>' for i, (a, b) in enumerate(steps))
        text = f'<p>{p["text"]}</p>' if p.get('text') else ''
        return f'''    <section class="section" id="proces" aria-labelledby="process-title"{' style="padding-top:0"' if not detailed else ''}>
      <div class="wrap grid">
        <div class="sec-head"><p class="label"><span class="dot"></span>{self.X['process']['label']}</p><h2 id="process-title">{p['title']}</h2>{text}</div>
        <div class="process-wrap"><svg class="process-line" aria-hidden="true" focusable="false" preserveAspectRatio="none" viewBox="0 0 100 2"><line class="base" x1="0" y1="1" x2="100" y2="1" vector-effect="non-scaling-stroke"/><line class="draw" x1="0" y1="1" x2="100" y2="1" pathLength="1" vector-effect="non-scaling-stroke"/></svg>
          <ol class="steps">{lis}</ol></div>
      </div>
    </section>
'''

    def sec_prices(self):
        X, t = self.X['prices'], self.C['tiers']
        items = ''
        for kind in TIERS.ORDER:
            first = TIERS.PRICES[kind][0]
            price = eur_range(self.lang, first[1], None, t) + (f' <small>/ {t["month"]}</small>' if kind == 'maintenance' else '')
            items += f'<li><a href="{self.to("pricing", "#" + kind)}"><b>{t["group"][kind][0]}</b><span class="amt">{price}</span><span class="d">{t["group"][kind][1]}</span></a></li>'
        return f'''    <section class="section" id="cene" aria-labelledby="prices-title" style="padding-top:0">
      <div class="wrap grid">
        <div class="sec-head"><p class="label"><span class="dot"></span>{X['label']}</p><h2 id="prices-title">{X['title']}</h2><p>{X['text']}</p></div>
        <ul class="price-groups">{items}</ul>
        <div class="sec-actions"><a class="btn" href="{self.to('pricing')}">{self.X['services']['all']} {self.ico('arrow-right')}</a><a class="btn btn-quiet" href="{self.to('estimate')}">{self.X['services']['estimate']}</a></div>
      </div>
    </section>
'''

    def sec_about(self):
        a, X = self.C['about'], self.X['about']
        facts = ''.join(f'<div><dt>{x}</dt><dd>{y}</dd></div>' for x, y in a['facts'])
        return f'''    <section class="section" id="o-studiju" aria-labelledby="about-title" style="padding-top:0">
      <div class="wrap grid">
        <figure class="about-photo"><picture><source type="image/webp" srcset="{self.r('assets/team/boris-lahos-480.webp')} 480w, {self.r('assets/team/boris-lahos-800.webp')} 800w" sizes="(min-width: 1100px) 28vw, 80vw"><img src="{self.r('assets/team/boris-lahos-800.jpg')}" alt="Boris Lahos" width="800" height="1000" loading="lazy" decoding="async"></picture></figure>
        <div class="about-copy"><p class="label"><span class="dot"></span>{X['label']}</p><h2 id="about-title">{a['title']}</h2><p>{a['text']}</p>
          <dl class="facts">{facts}</dl>
          <p class="why-one"><b>{X['why']}</b>{X['why_text']}</p>
          <div class="about-links"><a class="btn" href="https://www.linkedin.com/in/boris-lahos/" rel="me noopener">LinkedIn {self.ico('arrow-right-up')}</a><a class="btn" href="https://github.com/Jaddes" rel="me noopener">GitHub {self.ico('arrow-right-up')}</a></div></div>
      </div>
    </section>
'''

    def sec_faq(self):
        f = self.C['faq']
        items = ''.join(f'<details><summary>{q}{self.ico("alt-arrow-down")}</summary><p>{a}</p></details>' for q, a in f['items'])
        return f'''    <section class="section" id="pitanja" aria-labelledby="faq-title" style="padding-top:0">
      <div class="wrap grid">
        <div class="sec-head faq-head"><p class="label"><span class="dot"></span>{self.X['faq']['label']}</p><h2 id="faq-title">{f['title']}</h2></div>
        <div class="faq-list">{items}</div>
      </div>
    </section>
'''

    def sec_final_form(self):
        F = self.X['final']
        return f'''    <section class="cta-final with-form" id="kontakt" aria-labelledby="final-title">
      <div class="wrap grid">
        <div class="cta-copy"><h2 id="final-title">{F['title']}</h2><p>{F['text']}</p>
          <p class="other"><span>{F['other']}</span><a href="{self.to('estimate')}">{F['estimate']}</a><a href="{self.start('put=razgovor')}">{F['call']}</a><a href="mailto:{MAIL}">{MAIL}</a></p></div>
        <div class="cta-form">
            {self.inquiry(full=False)}
        </div>
      </div>
    </section>
'''

    def page_home(self):
        body = (self.sec_hero() + self.sec_proof() + self.sec_story() + self.sec_services() + self.sec_work() + self.sec_paths()
                + self.sec_teaser() + self.sec_process() + self.sec_prices() + self.sec_about() + self.sec_faq() + self.sec_final_form())
        pre = (f'\n  <link rel="preload" as="image" href="{self.r("assets/work/fizio-calendar-960.webp")}" imagesrcset="{self.r("assets/work/fizio-calendar-960.webp")} 960w, '
               f'{self.r("assets/work/fizio-calendar-1440.webp")} 1440w, {self.r("assets/work/fizio-calendar-2400.webp")} 2400w" imagesizes="(min-width: 1100px) 42vw, 86vw" fetchpriority="high">')
        ld = {'@context': 'https://schema.org', '@type': 'ProfessionalService', 'name': 'BARVIS Studio', 'url': f'{SITE}/{url_path(self.lang, "home")}', 'email': MAIL,
              'telephone': '+381 69 625 066', 'founder': {'@type': 'Person', 'name': 'Boris Lahos'}, 'areaServed': 'RS',
              'address': {'@type': 'PostalAddress', 'addressLocality': 'Novi Sad', 'addressCountry': 'RS'}, 'image': f'{SITE}/assets/og-image.jpg'}
        pre += f'\n  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>'
        return self.doc(self.C['meta']['title'], self.C['meta']['desc'], body, self.i18n(), pre, start=True)

    # ---------------------------------------------------------- Pokrenite projekat / Procena
    def page_start(self, initial):
        X, C, t = self.X, self.C, self.C['tiers']
        S, W, F, A = X['start'], X['wiz'], X['form'], X['aside']
        tick = f'<span class="box">{self.ico("tick")}</span>'
        opt = lambda typ, name, v, b, small='': f'<label class="opt"><input type="{typ}" name="{name}" value="{v}">{tick}<b>{b}</b>{f"<small>{small}</small>" if small else ""}</label>'
        kinds = ''.join(opt('radio', 'kind', v, b, s) for v, b, s in W['kinds'])
        feats = ''.join(opt('checkbox', 'feature', v, l) for v, l in C['estimate']['features'])
        sub = lambda name, keys: ''.join(opt('radio', name, k, t['tier'][k][0], t['tier'][k][1]) for k in keys)
        team = ''.join(opt('radio', 'team', v, C['js']['E']['team'][v], W['team_more'] if v == '15+' else '') for v, _ in C['estimate']['team'])
        when = ''.join(opt('radio', 'when', v, l, W['asap_small'] if v == 'asap' else '') for v, l in C['estimate']['when'])
        budget = ''.join(opt('radio', 'budget', v, l) for v, l in C['estimate']['budget'])
        step = lambda q, legend, hint, body, hidden=True: f'<fieldset class="wiz-step" data-q="{q}" tabindex="-1"{" hidden" if hidden else ""}><legend>{legend}</legend><p class="hint">{hint}</p>{body}</fieldset>'
        choices = ''.join(f'<label class="choice"><input type="radio" name="path" value="{v}"{" checked" if v == initial else ""}><b>{b}</b><span class="t">{tm}</span><span>{d}</span></label>'
                          for v, (b, tm, d) in zip(('upit', 'procena', 'razgovor'), S['choices']))
        hide_est = '' if initial == 'procena' else ' hidden'
        hide_form = ' hidden' if initial == 'procena' else ''
        wizard = f'''<section class="panel" id="panel-procena" data-panel="procena" aria-labelledby="procena-title"{hide_est}>
            <h2 class="panel-title" id="procena-title">{W['title']}</h2><p class="panel-sub">{W['sub']}</p>
            <p class="no-js-note">{W['nojs']}</p>
            <form class="wizard js-only" data-wizard novalidate>
              <div class="wiz-progress" aria-hidden="true"><div class="bar"><i data-bar></i></div><p><span data-count></span><span data-step-name></span></p></div>
              <p class="hint" data-prefill hidden></p>
              <ul class="wiz-summary" data-summary aria-label="{esc(W['answers'])}"></ul>
              {step('kind', W['q_kind'], W['h_kind'], f'<div class="wiz-opts two">{kinds}</div>', False)}
              {step('features', W['q_feat'], W['h_feat'], f'<div class="wiz-opts two" data-features-for="system">{feats}</div><div class="wiz-opts" data-features-for="site" hidden>{sub("site", ("landing", "company", "pro"))}</div><div class="wiz-opts" data-features-for="automation" hidden>{sub("auto", ("single", "flow"))}</div><div class="wiz-opts" data-features-for="maintenance" hidden>{sub("care", ("basic", "standard", "growth"))}</div><p class="hint" data-features-for="unsure" hidden>{W["unsure"]}</p>')}
              {step('team', W['q_team'], W['h_team'], f'<div class="wiz-opts two">{team}</div>')}
              {step('when', W['q_when'], W['h_when'], f'<div class="wiz-opts">{when}</div>')}
              {step('budget', W['q_budget'], W['h_budget'], f'<div class="wiz-opts two">{budget}</div>')}
              <section class="wiz-step estimate-out" data-q="result" tabindex="-1" aria-labelledby="res-title" hidden>
                <div><p class="label"><span class="dot"></span>{W['res_label']}</p><h3 id="res-title" class="panel-title" style="margin-top:10px" data-out="title"></h3></div>
                <p class="pkg" data-out="pkg"></p>
                <dl class="figures"><div><dt>{W['price']}</dt><dd data-out="price"></dd></div><div><dt>{W['time']}</dt><dd data-out="time"></dd></div></dl>
                <p data-out="fit"></p><ul class="why" data-out="why"></ul><p class="final-note">{W['note']}</p>
              </section>
              <div class="wiz-nav">
                <button class="btn" type="button" data-back>{self.ico('arrow-left')}{W['back']}</button>
                <button class="btn btn-quiet" type="button" data-skip>{W['skip']}</button>
                <button class="btn btn-primary" type="button" data-next>{W['next']} {self.ico('arrow-right', 'ico-move')}</button>
                <button class="btn btn-primary" type="button" data-send-estimate hidden>{W['send']} {self.ico('arrow-right', 'ico-move')}</button>
              </div>
              <p class="vh" aria-live="polite" data-wiz-live></p>
            </form>
          </section>'''
        after = ''.join(f'<li>{s}</li>' for s in A['steps'])
        main = f'''    <section class="start-top"><div class="wrap"><p class="label"><span class="dot"></span>{S['label']}</p><h1>{S['title']}</h1><p class="lead">{S['lead']}</p></div></section>
    <div class="wrap">
      <fieldset class="choose js-only"><legend>{S['legend']}</legend>{choices}</fieldset>
      <div class="start-grid">
        <div>
          <p class="offline-banner" data-offline role="status" hidden>{self.ico('danger-triangle')}{S['offline']}</p>
          {wizard}
          <section class="panel" id="panel-upit" data-panel="upit razgovor" aria-labelledby="upit-title"{hide_form}>
            <h2 class="panel-title" id="upit-title" data-form-title data-t-upit="{esc(F['title_upit'])}" data-t-razgovor="{esc(F['title_razgovor'])}">{F['title_razgovor'] if initial == 'razgovor' else F['title_upit']}</h2>
            <p class="panel-sub" data-form-sub data-t-upit="{esc(F['sub_upit'])}" data-t-razgovor="{esc(F['sub_razgovor'])}">{F['sub_upit']}</p>
            {self.inquiry()}
          </section>
        </div>
        <aside class="aside" aria-label="{esc(A['label'])}">
          <div class="aside-block"><h2>{A['after']}</h2><ol class="after-list">{after}</ol></div>
          <div class="aside-block"><h2>{A['direct']}</h2><ul class="direct">
            <li><a href="mailto:{MAIL}">{self.ico('letter')}{MAIL}</a></li><li><a href="tel:+{PHONE}">{self.ico('phone-calling')}+381 69 625 066<small>{A['call']}</small></a></li>
            <li><a href="https://wa.me/{PHONE}" rel="noopener">{self.ico('chat-round-line')}WhatsApp</a></li><li><a href="viber://chat?number=%2B{PHONE}">{self.ico('chat-round-line')}Viber</a></li></ul></div>
          <div class="aside-block"><h2>{A['data']}</h2><p>{A['data_text']}</p><p><a class="link-arrow" href="{self.to('privacy')}">{A['data_link']} {self.ico('arrow-right')}</a></p></div>
        </aside>
      </div>
    </div>
'''
        title, desc = (S['est_meta_title'], S['est_meta_desc']) if self.page == 'estimate' else (S['meta_title'], S['meta_desc'])
        return self.doc(title, desc, main, self.i18n(), motion=False, start=True, thumb='')

    # ---------------------------------------------------------- cenovnik
    def page_head(self, label, title, lead):
        return f'    <section class="page-head"><div class="wrap"><p class="label"><span class="dot"></span>{label}</p><h1>{title}</h1><p class="lead">{lead}</p></div></section>\n'

    def page_pricing(self):
        p, t, X = self.C['pricing'], self.C['tiers'], self.X
        groups = ''
        for kind in TIERS.ORDER:
            name, desc = t['group'][kind]
            rows = ''
            for key, lo, hi, weeks in TIERS.PRICES[kind]:
                price, when, _ = tier_display(self.lang, key, t, X)
                if kind == 'maintenance':
                    when = '—'
                tname, tdesc = t['tier'][key]
                rows += f'<a class="tier" href="{self.to("estimate")}?k={kind}&amp;t={key}" aria-label="{esc(tname)}: {esc(strip(price))}. {esc(X["pricing"]["row_cta"])}"><span class="t-name">{tname}</span><span class="t-desc">{tdesc}</span><span class="t-time">{when}</span><span class="t-price">{price}<span class="go">{self.ico("arrow-right")}</span></span></a>'
            groups += f'<section class="tier-group" id="{kind}" aria-labelledby="g-{kind}"><header><h2 id="g-{kind}">{name}</h2><p>{desc}</p></header>{rows}</section>'
        main = self.page_head(X['pricing']['label'], p['title'], t['lead']) + f'''    <section class="wrap" aria-label="{esc(p['kicker'])}">{groups}
      <div class="notes-grid"><div><h2>{X['pricing']['moves']}</h2><p>{t['note']}</p></div><div><h2>{X['pricing']['smaller']}</h2><p>{X['pricing']['smaller_text']}</p></div></div>
      <div class="sec-actions"><a class="btn btn-primary" href="{self.to('estimate')}">{p['cta']} {self.ico('arrow-right', 'ico-move')}</a><a class="btn" href="{self.start('put=razgovor')}">{X['final']['call']}</a></div>
    </section>
''' + '    <div style="height:var(--section)"></div>\n' + self.sec_faq()
        return self.doc(p['meta_title'], p['meta_desc'], main)

    # ---------------------------------------------------------- kako radim
    def page_who(self):
        w, m, X = self.C['who'], self.C['more'], self.X
        rows = ''
        for i, c in enumerate(w['cats']):
            gets = ''.join(f'<li>{g}</li>' for g in m['gets'][i])
            draft = m['draft'].format(name=c['name'], problem=c['problem'], solution=c['solution'][0].lower() + c['solution'][1:])
            rows += f'''<details class="who-row" id="{c['id']}"><summary><span class="n">{i + 1:02d}</span><b>{c['name']}</b><span class="p">{c['problem']}</span>{self.ico('alt-arrow-down')}</summary>
          <div class="who-body"><div class="who-cols"><p><span>{w['problem']}</span>{c['problem']}</p><p><span>{w['solution']}</span>{c['solution']}</p><div><span>{m['gets_label']}</span><ul>{gets}</ul></div></div>
            <div class="who-draft" data-draft><label for="draft-{c['id']}">{m['draft_label']}</label><textarea class="textarea" id="draft-{c['id']}" rows="6">{esc(draft)}</textarea>
              <div class="actions"><a class="btn btn-primary" data-draft-wa href="https://wa.me/{PHONE}" rel="noopener">{self.ico('chat-round-line')}{m['send_wa']}</a><a class="btn" data-draft-mail href="mailto:{MAIL}">{m['send_mail']}</a></div></div></div></details>'''
        main = (self.page_head(X['how']['label'], w['page_title'], w['page_lead'])
                + f'    <section class="wrap" aria-label="{esc(w["kicker"])}"><div class="who-rows">{rows}</div><p class="hint" style="margin-top:20px">{w["note"]}</p></section>\n'
                + self.sec_process(detailed=True)
                + f'''    <section class="cta-final" aria-labelledby="how-cta"><div class="wrap"><h2 id="how-cta">{w['cta_title']}</h2><p>{X['final']['text']}</p>
      <div class="actions"><a class="btn btn-primary" href="{self.start()}">{X['nav']['cta']} {self.ico('arrow-right', 'ico-move')}</a><a class="btn" href="{self.to('estimate')}">{w['cta_estimate']}</a></div></div></section>
''')
        return self.doc(w['meta_title'], w['meta_desc'], main)

    # ---------------------------------------------------------- studije slučaja
    def film(self, key, caption, name):
        video = f"{key}-walkthrough{'' if self.lang == 'sr' else '-en'}"
        K = self.X['case']
        cap = caption.split('</b>')
        return f'''      <div class="case-film">
        <figure class="film" data-film data-fallback="{esc(K['video_fail'])}">
          <img src="{self.r(f'assets/work/{video}-poster.webp')}" alt="" width="2560" height="1600" loading="lazy" decoding="async">
          <video playsinline preload="none" width="1280" height="800" aria-describedby="film-cap"><source src="{self.r(f'assets/work/{video}.mp4')}" type="video/mp4"></video>
          <button class="film-play" type="button" aria-label="{esc(K['play'].format(name=name))}">{self.ico('play')}</button>
        </figure>
        <p class="film-cap wrap" id="film-cap"><span>{caption}</span></p>
      </div>
'''

    def case_top(self, key, label, title_html, facts):
        K, other = self.X['case'], ('focus' if key == 'fizio' else 'fizio')
        dl = ''.join(f'<div><dt>{a}</dt><dd>{b}</dd></div>' for a, b in facts)
        return f'''      <header class="case-top"><div class="wrap">
        <nav class="crumbs" aria-label="{esc(self.X['nav']['work'])}"><a href="{self.home('#radovi')}">{self.ico('arrow-left')}{K['all']}</a><a href="{self.to(other)}">{K['next']}: {self.C['work'][other]['name']} {self.ico('arrow-right')}</a></nav>
        <div class="grid"><div class="case-title"><p class="label"><span class="dot"></span>{label}</p><h1 id="case-title" style="margin-top:18px">{title_html}</h1></div>
          <dl class="case-facts">{dl}</dl></div></div></header>
'''

    def case_next(self, key):
        K, other = self.X['case'], ('focus' if key == 'fizio' else 'fizio')
        tag = self.X['work']['own'] if other == 'focus' else self.X['work']['client']
        return f'    <div class="wrap case-next"><a href="{self.home("#radovi")}">{self.ico("arrow-left")}{K["all"]}</a><a href="{self.to(other)}" style="text-align:right"><span><small>{K["next"]} · {tag}</small>{self.C["work"][other]["name"]}</span>{self.ico("arrow-right")}</a></div>\n'

    def page_fizio(self):
        K, cs = self.X['case'], self.C['cases']['fizio']
        nb, na = K['nodes_before'], K['nodes_after']
        before_svg = f'''<svg viewBox="0 0 420 220" role="img" aria-labelledby="fb-t fb-d"><title id="fb-t">{K['before_title']}</title><desc id="fb-d">{K['before_desc']}</desc>
                <g class="node"><rect x="10" y="20" width="120" height="46" rx="8"/><text x="70" y="48" text-anchor="middle">{nb[0]}</text></g>
                <g class="node"><rect x="290" y="20" width="120" height="46" rx="8"/><text x="350" y="48" text-anchor="middle">{nb[1]}</text></g>
                <g class="node"><rect x="150" y="160" width="120" height="46" rx="8"/><text x="210" y="188" text-anchor="middle">{nb[2]}</text></g>
                <path class="edge-bad" d="M130 43 H290"/><path class="edge-bad" d="M70 66 C70 120, 130 183, 150 183"/><path class="edge-bad" d="M350 66 C350 120, 290 183, 270 183"/>
                <text class="warn" x="210" y="36" text-anchor="middle">{K['manual']}</text><text class="warn" x="40" y="128">{K['manual']}</text><text class="warn" x="300" y="128">{K['manual']}</text></svg>'''
        after_svg = f'''<svg viewBox="0 0 420 220" role="img" aria-labelledby="fa-t fa-d"><title id="fa-t">{K['after_title']}</title><desc id="fa-d">{K['after_desc']}</desc>
                <g class="hub"><rect x="140" y="84" width="140" height="52" rx="10"/><text class="t" x="210" y="115" text-anchor="middle">Fizio Alfa</text></g>
                <g class="node"><rect x="10" y="14" width="110" height="40" rx="8"/><text x="65" y="39" text-anchor="middle">{na[0]}</text></g>
                <g class="node"><rect x="300" y="14" width="110" height="40" rx="8"/><text x="355" y="39" text-anchor="middle">{na[1]}</text></g>
                <g class="node"><rect x="10" y="166" width="110" height="40" rx="8"/><text x="65" y="191" text-anchor="middle">{na[2]}</text></g>
                <g class="node"><rect x="300" y="166" width="110" height="40" rx="8"/><text x="355" y="191" text-anchor="middle">{na[3]}</text></g>
                <path class="edge" d="M120 34 C150 34, 160 84, 180 84"/><path class="edge" d="M300 34 C270 34, 260 84, 240 84"/><path class="edge" d="M120 186 C150 186, 160 136, 180 136"/><path class="edge" d="M300 186 C270 186, 260 136, 240 136"/></svg>'''
        lst = lambda items, icon: ''.join(f'<li>{self.ico(icon)}{x}</li>' for x in items)
        shots = [('fizio-calendar', 1440, 900, cs['shots'][0][2]), ('fizio-quick-price', 1440, 900, cs['shots'][2][2]), ('fizio-client', 1440, 900, cs['shots'][3][2]), ('fizio-phones', 3840, 2400, cs['shots'][1][2])]
        feats = ''
        for i, ((lab, h, p), (img, w, hh, alt)) in enumerate(zip(K['features'], shots)):
            if img == 'fizio-phones':
                shot = f'<figure class="feature-shot">{self.img(img, alt, "(min-width: 1100px) 50vw, 92vw", w=w, h=hh)}<figcaption>{K["push"]}</figcaption></figure>'
            else:
                shot = f'<figure class="feature-shot">{self.screen(lab, self.img(img, alt, "(min-width: 1100px) 60vw, 92vw"), alt)}</figure>'
            feats += f'<li class="feature{" is-phones" if img == "fizio-phones" else ""}"><div class="wrap grid"><div class="feature-copy"><p class="label">{lab}</p><h3>{h}</h3><p>{p}</p></div>{shot}</div></li>'
        role = ''.join(f'<li><span class="n">{i + 1:02d}</span><span><b>{a}</b>{b}</span></li>' for i, (a, b) in enumerate(K['role']))
        stack = ''.join(f'<li class="chip">{x}</li>' for x in ('Django', 'PostgreSQL', 'Docker', 'Web Push', K['private']))
        title = f'Fizio Alfa <span class="sub">{strip(cs["title"].split("<br>")[0])} <span class="ed">{strip(cs["title"].split("<br>")[1])}</span></span>'
        main = f'''    <article aria-labelledby="case-title">
{self.case_top('fizio', K['label'] + ' · ' + self.X['work']['client'], title, K['fizio_facts'])}{self.film('fizio', cs['video'], 'Fizio Alfa')}
      <section class="chapter" aria-labelledby="ch-context"><div class="wrap grid">
        <div class="chapter-head"><p class="label"><span class="dot"></span>{K['ctx_label']}</p><h2 id="ch-context">{K['ctx_title']}</h2></div>
        <div class="chapter-body">{''.join(f'<p>{x}</p>' for x in K['ctx_body'])}</div>
        <div class="flow">
          <figure class="before"><figcaption><b>{K['before']}</b><span class="label">{K['before_tag']}</span></figcaption>{before_svg}<ul class="flow-list">{lst(K['before_list'], 'danger-triangle')}</ul></figure>
          <figure class="after"><figcaption><b>{K['after']}</b><span class="label" style="color:var(--lime)">{K['after_tag']}</span></figcaption>{after_svg}<ul class="flow-list">{lst(K['after_list'], 'check-circle')}</ul></figure>
        </div></div></section>
      <section class="chapter" aria-labelledby="ch-solution">
        <div class="wrap grid"><div class="chapter-head" style="margin-bottom:0"><p class="label"><span class="dot"></span>{K['sol_label']}</p><h2 id="ch-solution">{K['sol_title']}</h2></div><div class="chapter-body"><p>{K['sol_body']}</p></div></div>
        <ol class="features" style="margin-top:56px">{feats}</ol>
      </section>
      <section class="chapter" aria-labelledby="ch-role"><div class="wrap grid">
        <div class="chapter-head"><p class="label"><span class="dot"></span>{K['role_label']}</p><h2 id="ch-role">{K['role_title']}</h2></div>
        <ol class="role">{role}</ol>
        <ul class="stack" aria-label="{esc(K['stack'])}">{stack}</ul>
        <p class="honest">{K['honest']}</p>
      </div></section>
    </article>
    <section class="cta-final" aria-labelledby="cta-title"><div class="wrap">
      <h2 id="cta-title">{K['cta_title']}</h2><p>{K['cta_text']}</p>
      <div class="actions"><a class="btn btn-primary" href="{self.start('put=upit&amp;slicno=fizio')}">{self.X['work']['similar']} {self.ico('arrow-right', 'ico-move')}</a><a class="btn" href="{self.to('estimate')}?k=system&amp;t=business">{K['cta_estimate']}</a><a class="btn" href="{DEMO}" rel="noopener">{self.C['work']['demo']} {self.ico('arrow-right-up')}</a></div>
    </div></section>
{self.case_next('fizio')}'''
        ld = {'@context': 'https://schema.org', '@type': 'CreativeWork', 'name': 'Fizio Alfa', 'about': strip(cs['meta_desc']), 'creator': {'@type': 'Person', 'name': 'Boris Lahos'}, 'inLanguage': HTML_LANG.get(self.lang, self.lang)}
        return self.doc(cs['meta_title'], cs['meta_desc'], main, self.i18n(), f'\n  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>',
                        cta=self.start('put=upit&amp;slicno=fizio'), thumb=self.thumb(self.start('put=upit&amp;slicno=fizio'), self.X['work']['similar'], False))

    def page_focus(self):
        K, cs = self.X['case'], self.C['cases']['focus']
        parts = cs['title'].split('<br>')
        title = f'BARVIS Focus <span class="sub">{strip(parts[0])} <span class="ed">{strip(parts[1]) if len(parts) > 1 else ""}</span></span>'
        dims = {'focus-phones': (3840, 2400)}
        feats = ''
        for img, cls, alt, cap in cs['shots']:
            h, _, p = cap.partition('</b>')
            w, hh = dims.get(img, (1440, 900))
            inner = self.img(img, alt, '(min-width: 1100px) 60vw, 92vw', w=w, h=hh)
            shot = f'<figure class="feature-shot">{inner if img.endswith("phones") else self.screen("BARVIS Focus", inner, alt)}</figure>'
            feats += f'<li class="feature{" is-phones" if img.endswith("phones") else ""}"><div class="wrap grid"><div class="feature-copy"><h3>{strip(h)}</h3><p>{p.strip()}</p></div>{shot}</div></li>'
        tags = ''.join(f'<li class="chip">{x}</li>' for x in cs['tags'])
        main = f'''    <article aria-labelledby="case-title">
{self.case_top('focus', K['focus_label'], title, cs['facts'][:2] + cs['facts'][3:])}
      <div class="wrap"><p class="lead" style="max-width:62ch;margin-top:40px">{K['focus_intro']}</p></div>
{self.film('focus', cs['video'], 'BARVIS Focus')}
      <section class="chapter" aria-labelledby="focus-features"><h2 class="vh" id="focus-features">{strip(self.C['work']['focus']['title'])}</h2><ol class="features">{feats}</ol>
        <div class="wrap grid"><p class="hint" style="grid-column:1/-1;margin-top:24px">{cs['facts'][2][0]}: {cs['facts'][2][1]}</p><ul class="stack">{tags}</ul></div></section>
    </article>
    <section class="cta-final" aria-labelledby="cta-title"><div class="wrap"><h2 id="cta-title">{K['focus_cta_title']}</h2><p>{K['focus_cta_text']}</p>
      <div class="actions"><a class="btn btn-primary" href="{self.start('put=upit')}">{cs['cta']} {self.ico('arrow-right', 'ico-move')}</a><a class="btn" href="{self.to('estimate')}">{self.X['final']['estimate']}</a></div></div></section>
{self.case_next('focus')}'''
        return self.doc(cs['meta_title'], cs['meta_desc'], main)

    # ---------------------------------------------------------- privatnost
    def page_privacy(self):
        P = self.X['privacy']
        secs = ''.join(f'<section><h2>{h}</h2>{"".join(f"<p>{p}</p>" for p in ps)}</section>' for h, ps in P['sections'])
        main = self.page_head(P['label'], P['title'], P['meta_desc']) + f'    <div class="wrap"><div class="prose"><p class="updated">{P["updated"]}</p>{secs}</div></div>\n'
        return self.doc(P['meta_title'], P['meta_desc'], main, motion=False)


# ------------------------------------------------------------------ SR landing stranice i 404
def tier_kind(key):
    return next(kind for kind, rows in TIERS.PRICES.items() if any(r[0] == key for r in rows))


class Landing(Page):
    """Srpske stranice za pretragu (softver za fizioterapeute, zakazivanje, izrada sajtova): isti sistem, bez prevoda."""
    def __init__(self, key, C):
        super().__init__('sr', 'home', C)
        self.key, self.L, self.K = key, LAND.L[key], LAND.COMMON
        self.canon, self.no_alts = f'{SITE}/{self.L["slug"]}', True

    def r(self, path):
        return '../' + path

    def to(self, page, anchor=''):
        return self.r(url_path('sr', page)) + anchor

    def home(self, anchor):
        return self.r('') + anchor

    def lang_links(self):
        return ''.join(f'<a href="{self.r(url_path(l, "home"))}" hreflang="{HTML_LANG.get(l, l)}" lang="{HTML_LANG.get(l, l)}"' + (' aria-current="page"' if l == 'sr' else '') + f'>{NATIVE[l]}</a>' for l in LANGS)

    def build(self):
        L, K, t, X = self.L, self.K, self.C['tiers'], self.X
        sec_label, sec_target = L['second']
        cta = self.start('put=upit' + (f'&amp;slicno={L["slicno"]}' if L['slicno'] else ''))
        terms = ''.join(f'<li>{self.ico(i)}{x}</li>' for i, x in zip(('check-circle', 'clock-circle', 'shield-check'), X['hero']['terms']))
        pains = ''.join(f'<li><span class="n">{lab}</span><h3>{h}</h3><p>{p}</p></li>' for lab, h, p in L['pains'])
        gets = ''.join(f'<li>{self.ico("check-circle")}<span><b>{a}</b> {b}</span></li>' for a, b in L['gets'])
        if L['shot']:
            img, alt = L['shot']
            phones = img.endswith('phones')
            inner = self.img(img, alt, '(min-width: 1100px) 55vw, 92vw', w=3840 if phones else 1440, h=2400 if phones else 900)
            shot = f'<figure class="feature-shot">{inner if phones else self.screen("Fizio Alfa", inner, alt)}</figure>'
        else:
            alt = 'Fizio Alfa: pregled dana u ordinaciji'
            shot = f'<figure class="feature-shot">{self.screen("Fizio Alfa", self.img("fizio-dashboard", alt, "(min-width: 1100px) 55vw, 92vw"), alt)}</figure>'
        rows = ''
        for key in L['tiers']:
            price, when, _ = tier_display('sr', key, t, X)
            kind = tier_kind(key)
            if kind == 'maintenance':
                when = '—'
            name, desc = t['tier'][key]
            rows += (f'<a class="tier" href="{self.to("estimate")}?k={kind}&amp;t={key}"><span class="t-name">{name}</span><span class="t-desc">{desc}</span>'
                     f'<span class="t-time">{when}</span><span class="t-price">{price}<span class="go">{self.ico("arrow-right")}</span></span></a>')
        est = f'{self.to("estimate")}?k={L["estimate"][0]}&amp;t={L["estimate"][1]}'
        main = (
            f'    <section class="page-head"><div class="wrap"><p class="label"><span class="dot"></span>{L["label"]}</p><h1>{L["h1"]}</h1><p class="lead">{L["lead"]}</p>\n'
            f'      <div class="hero-actions" style="margin-top:28px"><a class="btn btn-primary" href="{cta}">{X["nav"]["cta"]} {self.ico("arrow-right", "ico-move")}</a><a class="btn" href="{self.to(sec_target)}">{sec_label}</a></div>\n'
            f'      <ul class="hero-terms" aria-label="{esc(X["hero"]["terms_label"])}">{terms}</ul></div></section>\n'
            f'    <section class="section" aria-labelledby="pains-title" style="padding-top:0"><div class="wrap grid">\n'
            f'      <div class="sec-head"><h2 id="pains-title">{L["pains_title"]}</h2><p>{L["pains_text"]}</p></div><ul class="points">{pains}</ul></div></section>\n'
            f'    <section class="section" aria-labelledby="gets-title" style="padding-top:0"><div class="wrap grid landing-gets">\n'
            f'      <div class="feature-copy"><h2 id="gets-title" class="gets-title">{L["gets_title"]}</h2><ul class="gets">{gets}</ul></div>{shot}</div></section>\n'
            f'    <section class="section" aria-labelledby="price-title" style="padding-top:0"><div class="wrap">\n'
            f'      <div class="sec-head"><p class="label"><span class="dot"></span>{K["from_tiers"]}</p><h2 id="price-title">{K["price_title"]}</h2><p>{L["price_note"]}</p></div>\n'
            f'      <div class="tier-group" style="padding-top:0">{rows}</div>\n'
            f'      <div class="sec-actions"><a class="btn" href="{self.to("pricing")}">{K["more_prices"]} {self.ico("arrow-right")}</a><a class="btn btn-quiet" href="{est}">{X["services"]["estimate"]}</a></div></div></section>\n'
            f'    <section class="cta-final with-form" id="contact" aria-labelledby="final-title"><div class="wrap grid">\n'
            f'      <div class="cta-copy"><p class="label" style="color:#26301a">{K["next_label"]}</p><h2 id="final-title">{L["final"]}</h2><p>{K["final_text"]}</p>\n'
            f'        <p class="other"><a href="mailto:{MAIL}">{MAIL}</a><a href="https://wa.me/{PHONE}" rel="noopener">WhatsApp</a><a href="viber://chat?number=%2B{PHONE}">Viber</a><a href="tel:+{PHONE}">+381 69 625 066</a></p></div>\n'
            f'      <div class="cta-form">{self.inquiry(full=False)}</div></div></section>\n')
        pre = f'\n  <script type="application/ld+json">{json.dumps(L["ld"], ensure_ascii=False)}</script>' if L.get('ld') else ''
        return self.doc(L['title'], L['desc'], main, self.i18n(), pre, start=True, cta=cta)


class NotFound(Page):
    """404: GitHub Pages je služi na bilo kojoj dubini adrese, zato su sve putanje apsolutne."""
    def __init__(self, C):
        super().__init__('sr', 'home', C)
        self.canon, self.no_alts, self.noindex = f'{SITE}/404.html', True, True

    def r(self, path):
        return '/' + path

    def to(self, page, anchor=''):
        return '/' + url_path('sr', page) + anchor

    def home(self, anchor):
        return '/' + anchor

    def lang_links(self):
        return ''.join(f'<a href="/{url_path(l, "home")}" lang="{HTML_LANG.get(l, l)}">{NATIVE[l]}</a>' for l in LANGS)

    def build(self):
        N = LAND.NOT_FOUND
        main = (f'    <section class="page-head" style="min-height:70vh"><div class="wrap"><p class="label"><span class="dot"></span>{N["label"]}</p><h1>{N["h1"]}</h1><p class="lead">{N["lead"]}</p>\n'
                f'      <p class="hint" lang="en">{N["en"]}</p>\n'
                f'      <div class="hero-actions" style="margin-top:28px"><a class="btn btn-primary" href="/">{N["home"]} {self.ico("arrow-right", "ico-move")}</a><a class="btn" href="{self.start()}">{N["start"]}</a><a class="btn btn-quiet" href="/en/" lang="en">{N["en_home"]}</a></div></div></section>\n')
        return self.doc(N['title'], N['lead'], main, motion=False, thumb='')


def write(lang, page, text):
    out = DIST / url_path(lang, page) / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding='utf-8')


def main():
    build_assets()
    urls = []
    only = [x for x in os.environ.get('BUILD_LANGS', '').split(',') if x]
    for lang in (only or LANGS):
        C = load(lang)
        for page in PAGES:
            p = Page(lang, page, C)
            text = {'home': p.page_home, 'pricing': p.page_pricing, 'estimate': lambda: p.page_start('procena'), 'start': lambda: p.page_start('upit'),
                    'who': p.page_who, 'fizio': p.page_fizio, 'focus': p.page_focus, 'privacy': p.page_privacy}[page]()
            write(lang, page, text)
            urls.append(f'{SITE}/{url_path(lang, page)}')
    # SR landing stranice za pretragu i 404, u istom sistemu.
    C = load('sr')
    for key, L in LAND.L.items():
        out = DIST / L['slug'] / 'index.html'
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(Landing(key, C).build(), encoding='utf-8')
        urls.append(f'{SITE}/{L["slug"]}')
    (DIST / '404.html').write_text(NotFound(C).build(), encoding='utf-8')
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n'
    (DIST / 'sitemap.xml').write_text(sitemap, encoding='utf-8')
    print(f'ok: {len(only or LANGS)} jezika, {len(urls)} stranica')


if __name__ == '__main__':
    main()
