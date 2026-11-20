# BARVIS Studio

Sajt nezavisnog studija za digitalne proizvode iz Novog Sada: **Digital systems, made human.**

**Uživo:** https://barvis-studio.dev/

## Struktura

| Putanja | Sadržaj |
|---|---|
| `dist/index.html` | cela stranica |
| `dist/styles.css` | izgled (jedan stil, bez spoljnih zavisnosti) |
| `dist/app.js` | animacije (GSAP + Lenis), slajder snimaka, dugme za video, meni jezika |
| `dist/estimate.js` | procena projekta (paket i okvirna cena iz cenovnika, gotova poruka za mejl/WhatsApp), mobilni meni, aktivna sekcija u navigaciji |
| `dist/assets/` | slike (WebP + JPEG), lokalni fontovi i biblioteke |
| `dist/404.html` | stranica za nepostojeću adresu |
| `.github/workflows/pages.yml` | automatsko objavljivanje na GitHub Pages pri svakom push-u na `main` |

## Lokalno pokretanje

```sh
python -m http.server 8790 --directory dist
```

Zatim otvoriti `http://127.0.0.1:8790/`.

## Odluke

- **Bez spoljnih servera:** fontovi (Inter Tight, Instrument Serif | OFL), GSAP 3.12.7 i Lenis 1.1.20 su u `dist/assets/`.
- **Prevod:** meni 🌐 nudi SR, EN i automatski prevod (Google). Zato stranice nemaju Content-Security-Policy, jer bi blokirala prevodioca; sajt nema formulare ni prijavu.
- **Pristupačnost:** WCAG 2.2 AA (axe bez prekršaja), link za preskakanje, puna navigacija tastaturom, poštuje „smanjeno kretanje“; sadržaj je vidljiv i bez JavaScript-a.
- **Brzina:** bez velike pozadinske fotografije; uvod koristi snimke proizvoda (WebP), a ostale slike se učitavaju tek kad zatrebaju.

Licence biblioteka i fontova su u `dist/assets/vendor/` i `dist/assets/fonts/`.
