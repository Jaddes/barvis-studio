# BARVIS Studio — art direkcija i plan redizajna

Status: **faza 1 odobrena 2026-11-26; faza 2 urađena lokalno 2026-11-26** (grana `studio-rework`, nije commitovano ni objavljeno). Vidi „Faza 2“ na kraju.
Grana: `studio-rework`. Ništa iz ovog dokumenta nije objavljeno; `main` se objavljuje automatski i ne dira se bez odobrenja.

Reference i snimci postojećeg sajta: `refs/barvis-studio-rework/` (u `.gitignore`).
Prototip: `prototype/` (statičan HTML/CSS/JS, pokreće se iz korena repoa, vidi kraj dokumenta).

---

## 1. Audit postojećeg sajta (v5, main 1d4e14b)

Snimci: `refs/barvis-studio-rework/current/*-desktop.jpg` i `*-mobile.jpg` (početna, cenovnik, procena, kako radim, obe studije, dve ručne landing stranice, EN i JA početna).

| Deo | Šta valja | Problem | Odluka |
|---|---|---|---|
| Generator `tools/site/build.py` + `content/<jezik>.py` | 11 jezika, hreflang, canonical, OG, sitemap, cache-busting | Šabloni su f-stringovi u jednom fajlu; CSS 122 KB nagomilan kroz verzije | **Zadržati** generator i sadržajne fajlove, **zameniti** šablone, CSS i JS novim sistemom |
| Hero | Jasna poruka „Softver po vašoj meri.“, CTA u prvom viewportu | Vizual je generički stek uređaja; nema „Procene za minut“; sat u kickeru je ukras bez funkcije; primarni CTA je „Besplatan razgovor“, ne „Pokrenite projekat“ | Prerada |
| „Sveske, tabele i poruke“ | Prava ideja (haos → red) | Kremasta tabla nije povezana sa stvarnim proizvodom; beleške samo menjaju tekst | Ideja postaje **centralni motion narativ**, vezan za stvarni Fizio Alfa ekran |
| Usluge | Kratko i jasno | Četiri jednake pločice (bento) | Prerada u uredničku listu sa ishodima i cenovnim „od“ |
| Za koga | Dobri konkretni primeri | Čipovi bez hijerarhije | Ide u „Kako radim“ / problem sekciju |
| Radovi | Stvarni projekti, stvarni ekrani | Fizio Alfa i Focus su jednaki; Focus deluje kao klijentski rad | Fizio Alfa = glavni dokaz (full-bleed), Focus = „sopstveni proizvod“ |
| Procena (teaser) | 4 preseta | Jednake kartice; prekida tok | Postaje jedan od tri ulaza u „Pokrenite projekat“ |
| Procena (stranica) | Raspon cene i roka iz istih podataka kao cenovnik | Sve na jednoj strani, **unapred štiklirane opcije pa se rezultat vidi pre nego što korisnik išta izabere**; nema napretka ni vraćanja | Čarobnjak sa progresivnim otkrivanjem (7 koraka) |
| Cenovnik | Redovi vode u procenu sa `?k=&t=` | Tabela bez konteksta „šta pomera cenu“ | Zadržati logiku i cene, preraditi prikaz |
| Proces | 5 koraka | Kremasta traka sa krugovima — šablonski izgled | SVG linija procesa (jedan od 4 motion momenta) |
| O meni | Prava fotografija, stvarni podaci | — | Zadržati sadržaj, nova kompozicija |
| FAQ | 8 pitanja, `<details>` | — | Zadržati |
| Kontakt | Lime završni blok ima energiju; WhatsApp/Viber/telefon | 4 polja + select bez opcionih detalja; posle slanja nema „šta je poslato“; **forma ima `data-endpoint=""` pa ide `mailto:`**; nema politike privatnosti | Novi brzi upit + jasno stanje uspeha/greške + stranica privatnosti |
| Navigacija | — | 7 stavki + „Početna“ pilula; CTA „Besplatan razgovor“ | Nova nav sa „Pokrenite projekat“ |
| Footer | — | „Digital systems, made human.“ crvenom — van sistema | Prerada |
| Tipografija | Inter Tight + Instrument Serif, self-host | **Instrument Serif nema ćirilicu** — ruska verzija pada na sistemski serif | Nova kombinacija (vidi §4) |
| Motion | Svedeno na 4 momenta posle povratne informacije | Lenis uklonjen | Novi narativ, i dalje malo momenata (vidi §7) |
| Ručne SR landing stranice (`softver-za-fizioterapeute/`, `aplikacija-za-zakazivanje/`, `izrada-sajtova/`) | SEO ulazi | Van generatora, drugačiji stil | Prebaciti u generator u fazi 2 |

Ostaje: sve cene, istinite tvrdnje (vidi §12), svi jezici i URL-ovi, generator, video snimci, slike projekata, fotografija, API za upite.
Uklanja se: sat u heroju, bento pločice, kremasti blokovi, crveni moto, Instrument Serif, unapred popunjena procena.

## 2. Reference (principi, ne izgled)

Snimci: `refs/barvis-studio-rework/references/`. Uzima se samo ritam, hijerarhija i način vođenja do kontakta.

1. **Metalab** (metalab.com) — ogroman urednički serif naslov preko tamnog polja, kratka rečenica „šta radimo“ odvojena od naslova, lista projekata kao tekstualni indeks levo. *Uzimamo:* odnos jedne velike serifne fraze i male, precizne rečenice; projekti kao indeks, ne kao mreža kartica. *Ne uzimamo:* 3D zvezdu, logotipe klijenata.
2. **Locomotive** (locomotive.ca) — mešanje grotesk/serif u istoj liniji, „Let's talk“ stalno u uglu. *Uzimamo:* CTA uvek prisutan ali tih; tipografski ritam u jednoj liniji. *Ne uzimamo:* full-screen fotografiju, njihov znak.
3. **Instrument** (instrument.com) — rad se prikazuje kao stvaran ekran u okviru pregledača, odmah ispod imena. *Uzimamo:* dokaz rada u prvom skrolu, stvarni UI umesto ilustracije. *Ne uzimamo:* džinovski logotip, kolačić-baner.
4. **Cuberto** (cuberto.com) — jasan naslov „šta smo“ + jedna rečenica za koga, bez dvosmislenosti. *Uzimamo:* čitljivost prvog ekrana za netehničkog posetioca. *Ne uzimamo:* centriran šablon, kursor efekte.
5. **Rejouice** (rejouice.com) — mnogo praznog prostora, mali tekstovi u uglovima koji nose informaciju, „Let's talk ↗“. *Uzimamo:* disciplinu praznog prostora i male oznake kao sistem. *Ne uzimamo:* wordmark preko celog ekrana.
6. **basement.studio** — navigacija sa brojačima (Showcase ²⁶), status u zaglavlju. *Uzimamo:* precizne tehničke oznake kao deo identiteta. *Ne uzimamo:* WebGL scenu (naš sajt mora biti razumljiv malom preduzeću i brz na telefonu).

Zajednički zaključak: premium studiji pobeđuju **tipografijom, prostorom i stvarnim radom**, ne dekoracijom. Za BARVIS ključna razlika je da posetilac nije art direktor nego vlasnik ordinacije ili servisa — zato svaka „premium“ odluka mora da prođe test „razume li ovo neko ko vodi termine u svesci?“.

## 3. Vizuelna teza

> **Mali studio koji komplikovan poslovni haos pretvara u jasan sistem.**

Ceo sajt je jedna transformacija: **papir → poruka → tabela → sistem**. Haos je topao, papirnat, nakrivljen (sveska, poruka, tabela). Red je taman, precizan, poravnat na mrežu i obeležen limetom. Kontrast ova dva sveta je identitet — ne gradijenti, ne staklo, ne 3D.

Tri sloja jezika:
- **Urednički** — veliki Cormorant italic samo za jednu frazu po sekciji („po vašoj meri.“, „Više vremena za pacijente.“).
- **Proizvodni** — Geist, tabelarni brojevi, male oznake velikim slovima, tanke linije 1px, mreža. Kao dobar softver.
- **Ljudski** — prava fotografija, prvo lice („pravim“, „odgovaram lično“), konkretni primeri iz posla klijenta.

## 4. Tipografija

| Uloga | Font | Zašto | Licenca |
|---|---|---|---|
| UI, navigacija, tekst, brojevi | **Geist** (variable 300–700) | Precizan, softverski, odlični tabelarni brojevi, latinica + latin-ext + ćirilica | SIL OFL 1.1 |
| Urednički naglasak (samo ≥ 32px) | **Cormorant italic** (500–700) | Visok kontrast spram Geista = „urednički“ ton; ima ćirilicu (Instrument Serif nema); italic „v“ se jasno razlikuje od „u“ (Literata nije prošla taj test za „vašoj“) | SIL OFL 1.1 |

Testirani i odbačeni: Onest, Commissioner (previše slični Geistu, bez prednosti), Literata italic (v/u čitljivost), Gloock (nema pravi italic ni osnovnu ćirilicu), Instrument Serif (bez ćirilice). Specimen: `refs/.../` → generisan iz scratchpad-a, zaključak ovde.

- Self-host woff2 po podskupu (latin, latin-ext, cyrillic) sa `unicode-range`; preload samo `geist-latin` + `cormorant-italic-latin` na latiničnim jezicima.
- CJK (zh/ja/ko): sistemski fontovi (`PingFang SC`, `Hiragino Sans`, `Yu Gothic`, `Apple SD Gothic Neo`, `Malgun Gothic`, `Noto Sans CJK`). Na CJK jezicima urednički naglasak **nije italic** (italic CJK je lažni kurziv) — ostaje boja + težina.
- Skala (fluid `clamp`): display 56→152px, h2 36→88, h3 22→32, body 16→18, small 13–14, label 11–12 (uppercase, +0.12em). Line-length teksta max 62ch.
- `text-wrap: balance` za naslove, `hyphens: auto` za de/hu/ru (dugačke reči).

## 5. Boje (tokeni u `prototype/tokens.css`)

| Token | Vrednost | Uloga | Kontrast na `--ink-0` |
|---|---|---|---|
| `--ink-0` | `#0c100f` | tamna mineralna osnova | — |
| `--ink-1` | `#121816` | površine | — |
| `--ink-2` | `#1a211e` | podignute površine, polja forme | — |
| `--line` | `#2a332f` | linije 1px | — |
| `--paper` | `#ede7da` | topli tekst | 15.6:1 |
| `--paper-2` | `#b6b1a5` | sekundarni tekst | 8.6:1 |
| `--paper-3` | `#878a82` | oznake, metapodaci | 5.2:1 (AA) |
| `--lime` | `#c8f250` | **jedini akcenat**: primarni CTA, aktivno stanje, „red“ | 14.5:1 |
| `--lime-ink` | `#0c100f` | tekst na limeti | 14.5:1 |
| `--sky` | `#8cc4d6` | **samo semantika**: informacija / sistem / „sledeći korak“ (npr. status forme) | 10.4:1 |
| `--rust` | `#ff8a6b` | **samo greška** | 7.6:1 |
| `--note` | `#efe6cf` | papir haosa (sveska) | — |

Limeta se nikad ne koristi kao velika pozadina sekcije (osim završnog CTA bloka, jedan put po stranici). Nema gradijent blobova; tekstura = 2% šum (SVG `feTurbulence`, statičan, bez blur-a) i mreža 1px samo u „sistemskim“ zonama.

## 6. Mreža i prostor

- Desktop ≥ 1100px: 12 kolona, gutter 24px, margina `clamp(20px, 4vw, 64px)`, max 1440px.
- Tablet 700–1099px: 8 kolona. Telefon: 4 kolone, margina 16–20px.
- Spacing skala (4px baza): 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 176.
- Kontrolisana asimetrija: tekst počinje na koloni 1, mediji „vise“ do ivice ekrana (full-bleed) na kolonama 6–12. Full-bleed momenti: hero sistem, Fizio Alfa studija, završni CTA.
- Nijedna sekcija nema niz jednakih kartica. Liste su urednički redovi (broj · naziv · opis · akcija) sa tankim linijama.

## 7. Motion narativ

**„Od rasutih informacija do uređenog sistema.“** Najviše 4 animirana momenta na početnoj (u skladu sa ranijom povratnom informacijom da sajt ne sme da deluje „AI-animirano“):

1. **Hero ulaz (≤ 700ms, bez blokiranja)** — naslov izlazi iz maske po redovima (ne po rečima), artefakti haosa (sveska, poruka, tabela) padaju na mesto sa blagim nagibom. Navigacija, naslov i CTA su u DOM-u i vidljivi od prvog kadra; animacija samo „dovršava“ poziciju.
2. **Haos → sistem (scroll, pinned ~120vh na desktopu)** — tri artefakta klize i poravnavaju se; SVG linije ih spajaju sa stvarnim Fizio Alfa kalendarom; isti podatak („Maja · sreda 10h“) prelazi iz sveske u termin u kalendaru (označen limetom). Na kraju se pojavljuje oznaka „Fizio Alfa · stvarni projekat“ i link ka studiji. **Ovo objašnjava vrednost** — nije ukras.
3. **Studija slučaja** — clip-path zavesa otvara video/glavni ekran Fizio Alfe (postojeći moment, zadržan).
4. **Proces** — SVG linija se iscrtava kroz 5 koraka dok se skroluje.

Sve ostalo: CSS hover/focus/tap (150–200ms). Nema blur fade-up-a, nema split reči, nema brojača cena, nema beskonačnih animacija.

### GSAP (bez Lenisa)

- **GSAP 3 + ScrollTrigger** (već vendorovani u `dist/assets/vendor/`, standardna GSAP licenca — besplatno i za komercijalnu upotrebu).
- **Lenis: uklonjen** (odluka vlasnika, 2026-11-26). Dizajn ne zavisi od njega, a prirodan skrol je sigurniji za prodajni sajt: anchor linkovi, forme, tastatura i touch rade bez posebnih izuzetaka. Ne uvoditi drugu smooth-scroll biblioteku.
- Anchor linkovi: `scrollIntoView` (smooth, ili trenutno pod reduced-motion), pa fokus na cilj (`tabindex="-1"`).
- Sve animacije u `gsap.matchMedia()` sa granama za desktop i telefon; `ScrollTrigger` instance se gase na `pagehide`; `gsap.ticker` je pauziran kad je `document.hidden`.
- **Reduced motion**: bez scrub-a i pina, prikazuje se **krajnje stanje** (sistem već sastavljen). Isto važi bez JavaScripta (krajnje stanje je podrazumevani CSS).

### Three.js

**Ne.** Centralna ideja (papir → sistem) se izvodi stvarnim ekranima, HTML artefaktima, SVG linijama i GSAP-om. WebGL bi dodao ~150 KB, rizik za LCP/INP na telefonu i ne bi objasnio ništa više.

## 8. Sistem medija

- Samo stvarni ekrani Fizio Alfe i BARVIS Focusa (postojeći `assets/work/*` u 960/1440/2400/3840 webp) i video walkthrough-ovi (izmišljeni podaci, tako i piše).
- Artefakti haosa (sveska, poruka, tabela) su **HTML/CSS**, ne slike: čitljivi su čitačima ekrana kao primer (ili sakriveni kao dekor uz tekstualni opis), prevode se po jeziku i ne koštaju bajtove.
- Svaka slika: `width`/`height`, `srcset` + `sizes`, `loading="lazy"` ispod prvog viewporta, `fetchpriority="high"` samo za LCP sliku heroja. Fallback ako slika ne uspe: okvir sa nazivom ekrana (`img` `onerror` → klasa `is-broken`, CSS prikazuje `alt` tekst u okviru).
- Video: `preload="none"`, poster, kontrole; ako ne može da se pusti — poster + link „Pogledajte demo“.

## 9. SVG strategija

- **Ikone**: Solar (Iconify skup `@iconify-json/solar`), samo *linear* varijanta + `play-bold`, ugrađene kao `<symbol>` sprite pri build-u (bez Iconify runtime-a i spoljnog API-ja → nema zahteva ka trećoj strani). Licenca **CC BY 4.0 — obavezna atribucija** u footeru/privatnosti: „Ikone: Solar, 480 Design, CC BY 4.0“.
- **Autorski SVG** (ručno pisan, mali): linije toka u heroju, markeri (brojevi koraka, „sada“ tačka), linija procesa, mala data grafika u studiji. Bez velikih generisanih ilustracija.
- Dekorativni SVG: `aria-hidden="true" focusable="false"`. Informativni (dijagram toka): `role="img"` + `aria-labelledby` naslov i opis, uz isti sadržaj u tekstu pored.

## 10. Conversion mapa

```
                    ┌──────────── Pokrenite projekat (/pokrenite-projekat/) ────────────┐
 Nav CTA ──────────►│  1. Brzi upit (≈1 min)   2. Procena (7 koraka)   3. Besplatan razgovor │
 Hero CTA ─────────►│        │                        │                         │           │
 Posle projekta ───►│        ▼                        ▼                         ▼           │
 Cenovnik red ─────►│   forma 4 obavezna    rezultat → „Pošaljite procenu“   forma + 3 željena │
 Procena rezultat ─►│   + opcioni detalji   (prenosi izbor u brzi upit)      termina / dana   │
 Završni CTA ──────►│        └──────────────► ISTA forma, isto stanje uspeha ◄──────────┘     │
                    └───────────────────────────────────────────────────────────────────────┘
                     Uspeh: šta je poslato · sledeći korak · kopiraj · mejl/telefon/WhatsApp/Viber
                     Greška: unos sačuvan · ponovi · pošalji mejlom (pripremljen) · WhatsApp
```

Pravila:
- Jedna stranica `pokrenite-projekat/` (EN `start-a-project/`) sa tri puta kao tabovima (radio grupa, radi bez JS-a kao tri sekcije jedna ispod druge). `?put=upit|procena|razgovor` + `?k=&t=` (iz cenovnika) unapred bira put i popunjava procenu.
- Na početnoj, završni blok sadrži **brzi upit direktno** (bez prelaska na drugu stranicu) — najkraći put.
- „Treba mi sličan sistem“ posle studije → `pokrenite-projekat/?put=upit&slicno=fizio` (popuni „šta vam treba“ = poslovni sistem, i rečenicu „Zanima me sistem sličan Fizio Alfi“).
- Obavezna polja (max 4): ime, mejl ili telefon, šta vam treba (izbor), nekoliko rečenica. Opciono (zatvoreno pod „Dodajte detalje“): budžet, rok, veličina tima, postojeći sistem, prilog (vidi §13 — prilog se šalje mejlom posle, API ne prima fajlove).
- Unos se čuva u `sessionStorage` dok se ne pošalje (vraćanje sa druge stranice, greška mreže).

## 11. Wireframe — početna

```
┌ Header: B BARVIS studio · Usluge Radovi Cenovnik Procena Kako radim O studiju · [SR] [Pokrenite projekat] ┐
│ HERO (100svh)                                                                                       │
│  label: Studio za poslovni softver · Novi Sad · Boris Lahos                                         │
│  H1  Softver                                     ┌───────── sistemska zona (mreža) ─────────┐        │
│      po vašoj meri.  (Cormorant, limeta)          │  [sveska]   [poruka]                     │        │
│  lead: Aplikacije, sajtovi i automatizacije za    │        [tabela]   ── linije ──►          │        │
│        posao koji danas živi u sveskama...        │        Fizio Alfa kalendar (stvarni)     │        │
│  [Pokrenite projekat →]  [Pogledajte radove]      └──────────────────────────────────────────┘        │
│  · Prvi razgovor besplatan · ~30 min · bez obaveze      Procena za minut →                          │
├ PROOF STRIP: Fizio Alfa — stvarni sistem za ordinaciju · Django/PostgreSQL · privatni server · demo ↗ ┤
├ HAOS → SISTEM (pin): 3 koraka teksta levo, artefakti se slažu u kalendar desno                       ┤
├ USLUGE: 4 urednička reda (br · naziv · ishod · od X € · →)                                          ┤
├ RADOVI: Fizio Alfa full-bleed (video/ekran + 3 činjenice + 2 CTA) / Focus manji, „sopstveni proizvod“ ┤
├ KAKO ZAPOČETI: tri puta (upit / procena / razgovor) — 3 reda, ne kartice                            ┤
├ PROCENA ZA MINUT: prvi korak čarobnjaka ugrađen (izbor → nastavlja na /procena/)                     ┤
├ PROCES: SVG linija, 5 koraka sa trajanjem                                                           ┤
├ CENE: 4 grupe, po jedna „od“ cena + link na ceo cenovnik                                            ┤
├ O BORISU: fotografija + činjenice + zašto jedna osoba                                               ┤
├ FAQ                                                                                                  ┤
├ ZAVRŠNI CTA (limeta, jedini put): naslov + brzi upit inline                                         ┤
└ FOOTER: kontakt, privatnost, atribucija ikona, jezici                                                ┘
```

Telefon: hero = label → H1 → lead → CTA (puna širina) → uslovi → sistemska zona ispod (bez pina, kraća sekvenca). Donja traka sa „Pokrenite projekat“ pojavljuje se posle heroja (jednom rukom, 48px), skriva se kad je forma na ekranu.

## 12. Istinite tvrdnje (ne menjati bez odobrenja)

- Fizio Alfa je **projekat za klijenta** (fizioterapeutska ordinacija); „nastao iz razgovora sa timom ordinacije“ — potvrđeno.
- NE tvrditi: ceo tim koristi svakodnevno, sastanci uživo u Novom Sadu, plaćanje po fazama, vreme odgovora, rezultati u brojevima.
- BARVIS Focus = sopstveni proizvod.
- Cene iz `tools/site/content/tiers.py` (Mali alat od 1.500 €, Poslovni sistem od 4.000 €, Veća platforma po proceni, Landing 400–900 €, Sajt firme 900–2.500 €, Sajt sa zakazivanjem/CMS od 2.500 €, Jedna automatizacija 300–1.200 €, Automatizacija procesa od 1.200 €, Održavanje 50/150/400 € mesečno).
- Prvi razgovor: besplatan, ~30 minuta, bez obaveze.
- Boris Lahos, student završne godine Računarstva i automatike, FTN Novi Sad.

## 13. Otvorena pitanja za vlasnika (blokiraju fazu 2, ne prototip)

1. **Vreme odgovora** — ne obećava se (odluka 2026-11-26).
2. **Politika privatnosti** — rešeno: Boris Lahos kao **fizičko lice** (bez PIB/MB), upiti se čuvaju **12 meseci od poslednjeg kontakta**, ranije brisanje na zahtev; saradnja se uređuje zasebno.
3. **API**: `https://api.barvis-studio.dev/healthz` vraća 200 (servis i tunel rade, provera 2026-11-26). SMTP nije potvrđen — `data-endpoint` ostaje prazan do kontrolisanog test-upita sa prijemom mejla. **Bloker za objavu.**
4. **Besplatan razgovor** — nema Cal.com/Google linka; put „Razgovor“ = izbor željenog dela dana + način (video/telefon) ili direktan kontakt. Rešeno.
5. **Prilog** — šalje se mejlom posle upita (link sa pripremljenim naslovom). Odobreno.
6. ~~Lenis~~ — rešeno: uklonjen.

## 14. Poreklo resursa

| Resurs | Izvor | Licenca |
|---|---|---|
| Geist | github.com/vercel/geist-font (preuzeto preko Google Fonts) | SIL OFL 1.1 (`prototype/fonts/Geist-OFL.txt`) |
| Cormorant | github.com/CatharsisFonts/Cormorant (Google Fonts) | SIL OFL 1.1 (`prototype/fonts/Cormorant-OFL.txt`) |
| Solar ikone | 480 Design, `@iconify-json/solar` | CC BY 4.0 — atribucija obavezna |
| GSAP + ScrollTrigger | gsap.com, već u `dist/assets/vendor/` | GSAP standard license (besplatna) |
| Snimci ekrana i video | sopstveni proizvodi (Fizio Alfa sa izmišljenim podacima, BARVIS Focus) | vlasništvo |
| Fotografija Borisa | postojeća `assets/team/` | vlasništvo |
| SVG linije, markeri, artefakti haosa | ručno pisani za ovaj sajt | vlasništvo |

## 15. Performanse i pristupačnost — budžet

- LCP ≤ 2,5 s (LCP = H1 tekst ili Fizio ekran 960w, `fetchpriority="high"`), CLS ≤ 0,1 (sve dimenzije fiksne, fontovi `size-adjust` fallback), INP ≤ 200 ms (bez teških handlera; GSAP samo transform/opacity).
- JS budžet početne: GSAP 72 KB + ST 43 KB (`defer`) + site.js < 20 KB. CSS < 60 KB.
- Skip link, jedan H1, `:focus-visible` limeta prsten 2px + offset 3px, dodirne površine ≥ 44px, AA kontrast (tabela §5), `aria-live` za status forme, fokus na naslov uspeha/greške, labele vidljive (ne placeholder), greške uz polje (`aria-describedby` + `aria-invalid`).

## Faza 1 — šta je u prototipu

- `prototype/index.html` — hero + haos→sistem + dokaz + „kako započeti“ (početna samo do te tačke).
- `prototype/fizio-alfa.html` — kompletna studija slučaja.
- `prototype/pokrenite-projekat.html` — tri puta, brzi upit, procena (7 koraka), stanja uspeha/greške/offline.

Pokretanje: `python -m http.server 8766` iz korena repoa → `http://localhost:8766/prototype/`.
Simulacija odgovora servera: `pokrenite-projekat.html?demo=ok` ili `?demo=fail` određuje samo **ishod slanja** — poruka o uspehu/grešci pojavljuje se tek kada se **validno popunjena** forma pošalje (ime, mejl ili telefon, izbor „Šta vam treba“, bar 10 znakova poruke). `?demo=offline` odmah prikazuje traku „Niste povezani“, a slanje završava u stanju greške sa sačuvanim unosom. Bez parametra forma ima `data-endpoint=""` i otvara pripremljen mejl (iskren fallback dok API nije proveren kontrolisanim testom).

Provereno (2026-11-26, Edge headless): validacija i fokus na prvo pogrešno polje, uspeh, greška sa sačuvanim unosom, procena iz cenovnika (`?k=system&t=business`) kreće od koraka 1, nazad/preskoči, rezultat → upit sa priloženom procenom, ceo brzi upit samo tastaturom, mobilni meni (fokus, Escape), donja CTA traka, stranice bez JavaScripta, axe (WCAG 2.1 AA + best practice) bez nalaza na sve tri stranice sa i bez reduced-motion.

Napomena za fazu 2: API (`api/leads_api.py`) prihvata `lang` samo `sr`/`en` — proširiti na svih 11 jezika.
Posle odobrenja: šabloni prelaze u `tools/site/build.py`, tekstovi u `content/<jezik>.py`, pa ostale stranice (faza 2).


## Faza 2 — prelazak u generator (2026-11-26)

- `tools/site/build.py` (v6) generiše 8 stranica × 11 jezika = 88 + 3 ručne SR landing stranice u sitemap-u: početna, cenovnik, procena (`procena/`, `estimate/`), **Pokrenite projekat** (`pokrenite-projekat/`, `start-a-project/`), kako radim, Fizio Alfa, BARVIS Focus, **politika privatnosti** (`privatnost/`, `privacy/`).
- Izgled i ponašanje: `tools/site/src/` (tokens.css, site.css, sections.css → `dist/site.css`; site.js, start.js; icons.svg → `dist/assets/icons.svg`; favicon.svg). Fontovi Geist i Cormorant u `dist/assets/fonts/`.
- Novi tekstovi: `tools/site/content/x_<jezik>.py` (11 jezika). Provera strukture i {zamena} prema srpskom: `python tools/site/check_content.py`.
- Forma: `ENDPOINT = ''` u build.py dok kontrolisani test upita sa prijemom mejla ne prođe; tada upisati `https://api.barvis-studio.dev/v1/inquiries` i ponovo pokrenuti build.
- API: `lang` prihvata svih 11 jezika (13 testova prolazi).
- SR landing stranice (`softver-za-fizioterapeute/`, `aplikacija-za-zakazivanje/`, `izrada-sajtova/`) i 404 generiše isti build (`content/landing_sr.py`); cene na njima dolaze iz `tiers.py` (ranije su stajali zastareli „od 2.000 €“ i „od 500 €“). Stari `styles.css`, `app.js`, `estimate.js` i fontovi Inter Tight / Instrument Serif su uklonjeni.
- Provereno: 24/24 testa toka (validacija, uspeh, greška, procena iz cenovnika, tastatura, mobilni meni, bez JS-a), axe bez nalaza na 12 stranica (sr, en, ru, ja, de, sa i bez reduced-motion), lab merenje na usporenom 4G: LCP 1,5–2,4 s, CLS ≤ 0,04. Stvarni 75. percentil (CrUX) se meri tek posle objave.
- Automatski provereno i: prelom bez vodoravnog skrola na 640 px (zum 200%) i 320 px (zum 400%) na 16 stranica, forced-colors (fokus i izbor dobijaju sistemske boje), stablo pristupačnosti forme (sva polja imaju ime).
- Commit: grana `studio-rework`, 06a4b25 (+ cfaf424). Nije spojeno u `main`.
- Ostaje pre objave: kontrolisani API test sa prijemom mejla; pregled prevoda od izvornih govornika (posebno zh/ja/ko/hu) ili objava samo proverenih jezika; ručna provera pravim čitačem ekrana (NVDA/VoiceOver); merge u `main` i smoke test javnog sajta.
