# BARVIS leads API

Prima upite iz kontakt forme sa barvis-studio.dev, čuva ih u SQLite bazi i šalje obaveštenje mejlom
(Reply-To je mejl klijenta, pa se odgovara jednim klikom). Tabela `leads` je kasnije ulaz za BARVIS CRM.

- Samo standardna Python biblioteka, bez paketa.
- Upit se prvo čuva, pa tek onda šalje mejl. Ako SMTP ne radi, slanje se ponavlja na 5 minuta (do 10 pokušaja).
- Zaštita: samo `Origin: https://barvis-studio.dev`, 5 upita po IP adresi na 10 minuta, skriveno polje za robote,
  provera i skraćivanje svih polja, najviše 20 KB po zahtevu. IP adrese se čuvaju samo kao heš.
- Javno je dostupan samo preko Cloudflare Tunnel-a; na serveru nema otvorenih portova.
  Kontejneri rade bez root-a, sa read-only sistemom, u svojoj Docker mreži odvojenoj od ostalih aplikacija.

| Ruta | |
|---|---|
| `POST /v1/inquiries` | `{name, contact, service, service_label, message, page, lang, botcheck}` → `201 {"success": true, "id": N}` |
| `GET /healthz` | `{"ok": true}` |

## Testovi

```sh
cd api && python -m unittest -v test_leads_api
```

## Postavljanje na server (jednom)

1. **Gmail lozinka za aplikaciju:** Google nalog → Bezbednost → Verifikacija u 2 koraka → Lozinke za aplikacije.
2. **Cloudflare Tunnel:** Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared, ime `barvis-leads`.
   Kopirati token (dugačak niz posle `--token`). U „Public Hostname“: subdomain `api`, domain `barvis-studio.dev`,
   service `HTTP` → `leads:8000`.
3. **Fajlovi na serveru** (korisnik `boris`, bez sudo):
   ```sh
   mkdir -p ~/apps/barvis-leads && cd ~/apps/barvis-leads
   # kopirati Dockerfile, compose.yaml, leads_api.py, .env.example, tunnel.env.example
   cp .env.example .env && chmod 600 .env && nano .env                     # SMTP_*, NOTIFY_TO, IP_SALT
   cp tunnel.env.example tunnel.env && chmod 600 tunnel.env && nano tunnel.env  # TUNNEL_TOKEN
   docker compose up -d --build                  # samo API, dostupan samo na serveru
   docker compose --profile tunnel up -d         # + tunel: API postaje javan na api.barvis-studio.dev
   curl -s http://127.0.0.1:18090/healthz
   ```
4. **Provera spolja:**
   ```sh
   curl -s https://api.barvis-studio.dev/healthz
   ```
5. **Sajt:** na svim `<form data-contact-form>` upisati `data-endpoint="https://api.barvis-studio.dev/v1/inquiries"`.

## Pregled upita (dok ne postoji CRM)

```sh
docker compose exec leads python leads_api.py list
```

Rezervna kopija: `docker compose cp leads:/data/leads.sqlite3 ./leads-$(date +%F).sqlite3`.
