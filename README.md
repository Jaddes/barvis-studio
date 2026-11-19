# BARVIS Studio

Sajt nezavisnog studija za digitalne proizvode iz Novog Sada: **Digital systems, made human.**

**Uživo:** https://jaddes.github.io/barvis-studio/

## Struktura

| Putanja | Sadržaj |
|---|---|
| `dist/index.html` | cela stranica |
| `dist/styles.css` | izgled (jedan stil, bez spoljnih zavisnosti) |
| `dist/app.js` | animacije (GSAP + Lenis) i kopiranje mejl adrese |
| `dist/assets/` | slike (WebP + JPEG), lokalni fontovi i biblioteke |
| `dist/404.html` | stranica za nepostojeću adresu |
| `.github/workflows/pages.yml` | automatsko objavljivanje na GitHub Pages pri svakom push-u na `main` |

## Lokalno pokretanje

```sh
python -m http.server 8790 --directory dist
```

Zatim otvoriti `http://127.0.0.1:8790/`.

## Odluke

- **Bez spoljnih servera:** fontovi (Inter Tight, Cormorant Garamond | OFL), GSAP 3.12.7 i Lenis 1.1.20 su u `dist/assets/`.
- **Bezbednost:** Content-Security-Policy dozvoljava samo sopstvene fajlove.
- **Pristupačnost:** WCAG 2.2 AA (axe bez prekršaja), link za preskakanje, puna navigacija tastaturom, poštuje „smanjeno kretanje“; sadržaj je vidljiv i bez JavaScript-a.
- **Brzina:** prvo učitavanje ≈ 250 KB, uz prave snimke ekrana (ranije ≈ 1,9 MB + spoljni CDN).

Licence biblioteka i fontova su u `dist/assets/vendor/` i `dist/assets/fonts/`.
