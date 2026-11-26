# BARVIS Studio

Sajt studija za poslovni softver iz Novog Sada (Boris Lahos): poslovne aplikacije, sajtovi i automatizacija.

**Uživo:** https://barvis-studio.dev/

Art direkcija, odluke i istinite tvrdnje: [`docs/BARVIS_STUDIO_ART_DIRECTION.md`](docs/BARVIS_STUDIO_ART_DIRECTION.md).

## Izmene sajta

Sve stranice (11 jezika: sr, en, de, fr, es, it, ru, zh, ja, ko, hu), tri srpske landing stranice i 404 generiše `tools/site/build.py`.
Ručno se ne menja ništa u `dist/*.html`.

```sh
python tools/site/check_content.py   # prevodi: ista struktura i iste {zamene} kao srpski
python tools/site/build.py           # piše dist/ (srpski u korenu, ostali u dist/<kod>/) i sitemap.xml
python -m http.server 8790 --directory dist   # pregled na http://127.0.0.1:8790/
```

| Putanja | Sadržaj |
|---|---|
| `tools/site/content/<jezik>.py` | osnovni tekstovi (usluge, proces, FAQ, studije, cenovnik) |
| `tools/site/content/x_<jezik>.py` | tekstovi redizajna v6 (hero, tok „Pokrenite projekat“, procena, forma, studija, privatnost) |
| `tools/site/content/tiers.py` | **jedini izvor cena i rokova** (cenovnik, procena, landing stranice) |
| `tools/site/content/landing_sr.py` | srpske landing stranice za pretragu i 404 |
| `tools/site/src/` | `tokens.css`, `site.css`, `sections.css` → `dist/site.css`; `site.js` (meni, pokret), `start.js` (procena i upit); `icons.svg` |
| `dist/assets/` | slike, fontovi (Geist, Cormorant — OFL), GSAP, Solar ikone (CC BY 4.0) |
| `api/` | BARVIS leads API za formu (Docker + Cloudflare Tunnel na serveru; ne objavljuje se na GitHub Pages) |
| `.github/workflows/pages.yml` | objavljivanje na GitHub Pages pri svakom push-u na `main` |

## Forma za upit

`ENDPOINT` u `build.py` je prazan dok kontrolisani test upita sa prijemom mejla ne prođe: forma tada otvara pripremljen mejl i nudi WhatsApp, kopiranje i telefon.
Sa `ENDPOINT = 'https://api.barvis-studio.dev/v1/inquiries'` upit ide na sopstveni API (vidi `api/README.md`). Ako API ne odgovori za 12 s ili vrati grešku, unos ostaje sačuvan i nude se isti rezervni putevi.
Za proveru stanja bez servera: `?demo=ok` ili `?demo=fail` određuje ishod slanja validno popunjene forme; `?demo=offline` simulira prekid veze.
