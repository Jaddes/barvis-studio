"""BARVIS leads API: prima upite sa barvis-studio.dev, čuva ih u SQLite i šalje mejl obaveštenje.

Samo standardna Python biblioteka (bez zavisnosti). Upiti se čuvaju pre slanja mejla, pa se nijedan ne gubi:
ako SMTP privremeno ne radi, pozadinska nit ponavlja slanje. Tabela `leads` je kasnije ulaz za BARVIS CRM.

Rute:
  POST    /v1/inquiries   JSON {name, contact, service, service_label, message, page, lang, botcheck}
  OPTIONS /v1/inquiries   CORS preflight
  GET     /healthz        {"ok": true}
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import smtplib
import sqlite3
import ssl
import sys
import threading
import time
from collections.abc import Iterator, Mapping
from contextlib import contextmanager
from collections import defaultdict, deque
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

log = logging.getLogger("leads")

SERVICES = {"app", "site", "automation", "maintenance", "unsure"}
LANGS = {"sr", "en", "de", "fr", "es", "it", "ru", "zh", "ja", "ko", "hu"}
MAX_BODY = 20_000
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
PHONE_RE = re.compile(r"^[+()\d\s/.-]{6,}$")
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class Config:
    def __init__(self, env: Mapping[str, str] | None = None):
        env = os.environ if env is None else env
        self.port = int(env.get("PORT", "8000"))
        self.db_path = env.get("DB_PATH", "/data/leads.sqlite3")
        self.allowed_origins = {o.strip().rstrip("/") for o in env.get("ALLOWED_ORIGINS", "https://barvis-studio.dev").split(",") if o.strip()}
        self.smtp_host = env.get("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(env.get("SMTP_PORT", "587"))
        self.smtp_user = env.get("SMTP_USER", "")
        self.smtp_password = env.get("SMTP_PASSWORD", "")
        self.mail_from = env.get("MAIL_FROM", self.smtp_user)
        self.notify_to = env.get("NOTIFY_TO", "")
        self.rate_limit = int(env.get("RATE_LIMIT", "5"))  # upita po IP adresi ...
        self.rate_window = int(env.get("RATE_WINDOW", "600"))  # ... u ovoliko sekundi
        self.ip_salt = env.get("IP_SALT", "")
        # Iza Cloudflare Tunnel-a prava adresa posetioca je u CF-Connecting-IP.
        self.trust_cf_header = env.get("TRUST_CF_HEADER", "1") == "1"
        self.retry_seconds = int(env.get("NOTIFY_RETRY_SECONDS", "300"))

    @property
    def smtp_ready(self) -> bool:
        return bool(self.smtp_user and self.smtp_password and self.notify_to and self.mail_from)


# ---------------------------------------------------------------- baza

SCHEMA = """
CREATE TABLE IF NOT EXISTS leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at      TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  contact         TEXT    NOT NULL,
  email           TEXT,
  phone           TEXT,
  service         TEXT    NOT NULL,
  service_label   TEXT,
  message         TEXT    NOT NULL,
  page            TEXT,
  lang            TEXT,
  ip_hash         TEXT,
  user_agent      TEXT,
  status          TEXT    NOT NULL DEFAULT 'new',
  notified_at     TEXT,
  notify_attempts INTEGER NOT NULL DEFAULT 0,
  notify_error    TEXT
);
CREATE INDEX IF NOT EXISTS leads_pending ON leads (notified_at) WHERE notified_at IS NULL;
"""


class Store:
    def __init__(self, path: str):
        self.path = path
        self.lock = threading.Lock()
        with self._conn() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript(SCHEMA)

    @contextmanager
    def _conn(self) -> Iterator[sqlite3.Connection]:
        # sqlite3-ov „with“ samo potvrđuje transakciju, ne zatvara konekciju; ovde je i zatvaramo.
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def insert(self, lead: dict) -> int:
        cols = ", ".join(lead)
        marks = ", ".join("?" for _ in lead)
        with self.lock, self._conn() as db:
            return int(db.execute(f"INSERT INTO leads ({cols}) VALUES ({marks})", list(lead.values())).lastrowid or 0)

    def pending(self, max_attempts: int = 10) -> list[sqlite3.Row]:
        with self.lock, self._conn() as db:
            return db.execute("SELECT * FROM leads WHERE notified_at IS NULL AND notify_attempts < ? ORDER BY id", (max_attempts,)).fetchall()

    def mark(self, lead_id: int, error: str | None) -> None:
        with self.lock, self._conn() as db:
            if error is None:
                db.execute("UPDATE leads SET notified_at = ?, notify_error = NULL, notify_attempts = notify_attempts + 1 WHERE id = ?", (now(), lead_id))
            else:
                db.execute("UPDATE leads SET notify_error = ?, notify_attempts = notify_attempts + 1 WHERE id = ?", (error[:500], lead_id))


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------- validacija

def clean(value, limit: int, single_line: bool = False) -> str:
    text = CONTROL_RE.sub("", str(value or "")).replace("\r\n", "\n").replace("\r", "\n").strip()
    if single_line:
        text = re.sub(r"\s+", " ", text)
    return text[:limit]


def validate(data: dict) -> tuple[dict, dict]:
    """Vraća (očišćen upit, greške po poljima). Ista pravila kao forma na sajtu."""
    lead = {
        "name": clean(data.get("name"), 100, single_line=True),
        "contact": clean(data.get("contact"), 200, single_line=True),
        "service": clean(data.get("service"), 20, single_line=True),
        "service_label": clean(data.get("service_label"), 100, single_line=True),
        "message": clean(data.get("message"), 5000),
        "page": clean(data.get("page"), 200, single_line=True),
        "lang": clean(data.get("lang"), 5, single_line=True).lower(),
    }
    errors = {}
    if len(lead["name"]) < 2:
        errors["name"] = "required"
    contact = lead["contact"]
    is_email = bool(EMAIL_RE.match(contact))
    is_phone = bool(PHONE_RE.match(contact)) and len(re.sub(r"\D", "", contact)) >= 6
    if not (is_email or is_phone):
        errors["contact"] = "invalid"
    if len(lead["message"]) < 10:
        errors["message"] = "too_short"
    if lead["service"] not in SERVICES:
        lead["service"] = "unsure"
    if lead["lang"] not in LANGS:
        lead["lang"] = "sr"
    lead["email"] = contact if is_email else None
    lead["phone"] = contact if (is_phone and not is_email) else None
    return lead, errors


class RateLimiter:
    def __init__(self, limit: int, window: int):
        self.limit, self.window = limit, window
        self.hits: dict[str, deque] = defaultdict(deque)
        self.lock = threading.Lock()

    def allow(self, key: str) -> bool:
        t = time.monotonic()
        with self.lock:
            q = self.hits[key]
            while q and t - q[0] > self.window:
                q.popleft()
            if len(q) >= self.limit:
                return False
            q.append(t)
            if len(self.hits) > 10_000:  # ne dozvoli da memorija raste bez kraja
                for k in [k for k, v in self.hits.items() if not v or t - v[-1] > self.window]:
                    del self.hits[k]
            return True


# ---------------------------------------------------------------- mejl

SERVICE_NAMES = {"app": "Poslovna aplikacija", "site": "Sajt", "automation": "Automatizacija", "maintenance": "Održavanje", "unsure": "Nije siguran"}


def build_message(cfg: Config, lead) -> EmailMessage:
    msg = EmailMessage()
    service = lead["service_label"] or SERVICE_NAMES.get(lead["service"], lead["service"])
    msg["Subject"] = f"Novi upit #{lead['id']}: {service}, {lead['name']}"
    msg["From"] = formataddr(("BARVIS sajt", cfg.mail_from))
    msg["To"] = cfg.notify_to
    if lead["email"]:
        msg["Reply-To"] = formataddr((lead["name"], lead["email"]))
    msg["Message-ID"] = make_msgid(domain="barvis-studio.dev")
    reply_hint = "Odgovorite na ovaj mejl i poruka ide direktno klijentu." if lead["email"] else f"Klijent je ostavio telefon: {lead['phone']}"
    msg.set_content(
        f"Novi upit sa sajta barvis-studio.dev\n\n"
        f"Ime:     {lead['name']}\n"
        f"Kontakt: {lead['contact']}\n"
        f"Usluga:  {service}\n"
        f"Jezik:   {lead['lang']}   Stranica: {lead['page'] or '-'}\n"
        f"Vreme:   {lead['created_at']} (UTC)\n\n"
        f"{lead['message']}\n\n"
        f"--\n{reply_hint}\nUpit #{lead['id']} je sačuvan u bazi upita.\n"
    )
    return msg


def send_mail(cfg: Config, msg: EmailMessage) -> None:
    with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=20) as smtp:
        smtp.starttls(context=ssl.create_default_context())
        smtp.login(cfg.smtp_user, cfg.smtp_password)
        smtp.send_message(msg)


class Notifier(threading.Thread):
    """Šalje obaveštenja za sve upite koji ga još nisu dobili; budi se odmah po novom upitu ili na svakih retry_seconds."""

    def __init__(self, cfg: Config, store: Store):
        super().__init__(daemon=True, name="notifier")
        self.cfg, self.store = cfg, store
        self.wake = threading.Event()

    def run(self) -> None:
        while True:
            self.flush()
            self.wake.wait(self.cfg.retry_seconds)
            self.wake.clear()

    def flush(self) -> None:
        if not self.cfg.smtp_ready:
            if self.store.pending():
                log.warning("SMTP nije podešen; upiti čekaju u bazi")
            return
        for lead in self.store.pending():
            try:
                send_mail(self.cfg, build_message(self.cfg, lead))
                self.store.mark(lead["id"], None)
                log.info("obaveštenje poslato za upit #%s", lead["id"])
            except Exception as exc:  # mreža, prijava, odbijen mejl: pokušaćemo ponovo
                self.store.mark(lead["id"], f"{type(exc).__name__}: {exc}")
                log.error("slanje za upit #%s nije uspelo: %s", lead["id"], exc)


# ---------------------------------------------------------------- HTTP

class Handler(BaseHTTPRequestHandler):
    server_version = "barvis-leads"
    sys_version = ""
    cfg: Config
    store: Store
    limiter: RateLimiter
    notifier: Notifier

    def log_message(self, format, *args):  # noqa: A002  (bez IP adresa u logu)
        log.info("%s %s", self.command, self.path)

    def _origin(self) -> str | None:
        origin = (self.headers.get("Origin") or "").rstrip("/")
        return origin if origin in self.cfg.allowed_origins else None

    def _send(self, status: int, body: dict | None = None, origin: str | None = None) -> None:
        payload = json.dumps(body or {}, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(payload)

    def _client_ip(self) -> str:
        if self.cfg.trust_cf_header and self.headers.get("CF-Connecting-IP"):
            return self.headers["CF-Connecting-IP"].strip()
        return self.client_address[0]

    def do_OPTIONS(self):
        origin = self._origin()
        if self.path != "/v1/inquiries" or not origin:
            return self._send(403)
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "POST")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Vary", "Origin")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path == "/healthz":
            return self._send(200, {"ok": True})
        self._send(404, {"success": False})

    def do_POST(self):
        if self.path != "/v1/inquiries":
            return self._send(404, {"success": False})
        origin = self._origin()
        if not origin:
            return self._send(403, {"success": False, "error": "origin"})
        if "application/json" not in (self.headers.get("Content-Type") or ""):
            return self._send(415, {"success": False, "error": "content_type"}, origin)
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = -1
        if length <= 0 or length > MAX_BODY:
            return self._send(413, {"success": False, "error": "size"}, origin)
        try:
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError
        except ValueError:
            return self._send(400, {"success": False, "error": "json"}, origin)

        if str(data.get("botcheck") or "").strip():  # robot je popunio skriveno polje: tiho „uspe“
            return self._send(201, {"success": True}, origin)
        ip = self._client_ip()
        if not self.limiter.allow(ip):
            return self._send(429, {"success": False, "error": "rate_limited"}, origin)
        lead, errors = validate(data)
        if errors:
            return self._send(400, {"success": False, "errors": errors}, origin)

        lead.update(
            created_at=now(),
            ip_hash=hashlib.sha256((self.cfg.ip_salt + ip).encode()).hexdigest()[:16],
            user_agent=clean(self.headers.get("User-Agent"), 300, single_line=True),
        )
        lead_id = self.store.insert(lead)
        self.notifier.wake.set()
        log.info("upit #%s sačuvan (%s)", lead_id, lead["service"])
        self._send(201, {"success": True, "id": lead_id}, origin)


def make_server(cfg: Config) -> tuple[ThreadingHTTPServer, Notifier]:
    store = Store(cfg.db_path)
    notifier = Notifier(cfg, store)
    handler = type("BoundHandler", (Handler,), {"cfg": cfg, "store": store, "limiter": RateLimiter(cfg.rate_limit, cfg.rate_window), "notifier": notifier})
    server = ThreadingHTTPServer(("0.0.0.0", cfg.port), handler)
    server.daemon_threads = True
    return server, notifier


def list_leads(cfg: Config, limit: int = 20) -> None:
    """`python leads_api.py list`: poslednji upiti, dok ne postoji CRM."""
    db = sqlite3.connect(cfg.db_path)
    db.row_factory = sqlite3.Row
    try:
        for r in db.execute("SELECT * FROM leads ORDER BY id DESC LIMIT ?", (limit,)):
            state = "poslato" if r["notified_at"] else f"čeka ({r['notify_attempts']}x: {r['notify_error'] or '-'})"
            print(f"#{r['id']}  {r['created_at']}  {r['service']:<11} {r['name']} <{r['contact']}>  [{state}]")
            print("    " + r["message"].replace("\n", "\n    ")[:600])
    finally:
        db.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    cfg = Config()
    if sys.argv[1:] == ["list"]:
        return list_leads(cfg)
    if not cfg.smtp_ready:
        log.warning("SMTP_USER / SMTP_PASSWORD / NOTIFY_TO nisu podešeni: upiti se čuvaju, mejl se ne šalje")
    if not cfg.ip_salt:
        log.warning("IP_SALT nije podešen")
    server, notifier = make_server(cfg)
    notifier.start()
    log.info("slušam na :%s, dozvoljeni izvori: %s", cfg.port, ", ".join(sorted(cfg.allowed_origins)))
    server.serve_forever()


if __name__ == "__main__":
    main()
