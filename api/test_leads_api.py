"""Testovi za leads_api: pravi HTTP server na slučajnom portu, privremena baza, lažni SMTP.

Pokretanje:  python -m unittest -v test_leads_api   (iz foldera api/)
"""
import json
import os
import sqlite3
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from unittest import mock

import leads_api

ORIGIN = "https://barvis-studio.dev"
GOOD = {"name": "Ana Test", "contact": "ana@example.com", "service": "app", "service_label": "Poslovna aplikacija po meri",
        "message": "Treba nam zakazivanje za ordinaciju sa 3 terapeuta.", "page": "/", "lang": "sr", "botcheck": ""}


class FakeSMTP:
    sent: list = []
    fail = False

    def __init__(self, host, port, timeout=None):
        self.host = host

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def starttls(self, context=None):
        pass

    def login(self, user, password):
        if FakeSMTP.fail:
            raise leads_api.smtplib.SMTPAuthenticationError(535, b"bad credentials")

    def send_message(self, msg):
        FakeSMTP.sent.append(msg)


class ApiTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = os.path.join(self.tmp.name, "leads.sqlite3")
        env = {"PORT": "0", "DB_PATH": self.db, "ALLOWED_ORIGINS": ORIGIN, "SMTP_USER": "bot@example.com", "SMTP_PASSWORD": "x",
               "NOTIFY_TO": "boris@example.com", "RATE_LIMIT": "3", "RATE_WINDOW": "600", "IP_SALT": "s", "TRUST_CF_HEADER": "1"}
        self.cfg = leads_api.Config(env)
        self.server, self.notifier = leads_api.make_server(self.cfg)
        self.port = self.server.server_address[1]
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        FakeSMTP.sent, FakeSMTP.fail = [], False
        self.smtp = mock.patch.object(leads_api.smtplib, "SMTP", FakeSMTP)
        self.smtp.start()

    def tearDown(self):
        self.smtp.stop()
        self.server.shutdown()
        self.server.server_close()
        self.tmp.cleanup()

    def req(self, method="POST", path="/v1/inquiries", body=GOOD, origin: str | None = ORIGIN, ip="203.0.113.5", ctype="application/json"):
        data = json.dumps(body).encode() if isinstance(body, dict) else body
        headers = {"Content-Type": ctype, "CF-Connecting-IP": ip}
        if origin:
            headers["Origin"] = origin
        r = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=data if method == "POST" else None, headers=headers, method=method)
        try:
            with urllib.request.urlopen(r) as resp:
                raw = resp.read()
                return resp.status, (json.loads(raw) if raw else {}), dict(resp.headers)
        except urllib.error.HTTPError as e:
            raw = e.read()
            return e.code, (json.loads(raw) if raw else {}), dict(e.headers)

    def rows(self):
        db = sqlite3.connect(self.db)
        db.row_factory = sqlite3.Row
        try:
            return db.execute("SELECT * FROM leads").fetchall()
        finally:
            db.close()

    def test_valid_inquiry_is_stored_and_notified(self):
        status, body, headers = self.req()
        self.assertEqual(status, 201)
        self.assertTrue(body["success"])
        self.assertEqual(headers["Access-Control-Allow-Origin"], ORIGIN)
        [row] = self.rows()
        self.assertEqual((row["name"], row["email"], row["phone"], row["service"]), ("Ana Test", "ana@example.com", None, "app"))
        self.assertNotIn("203.0.113.5", row["ip_hash"])
        self.notifier.flush()
        [msg] = FakeSMTP.sent
        self.assertIn("Ana Test", msg["Subject"])
        self.assertIn("ana@example.com", msg["Reply-To"])
        self.assertEqual(msg["To"], "boris@example.com")
        self.assertIn("ordinaciju", msg.get_content())
        self.assertIsNotNone(self.rows()[0]["notified_at"])

    def test_phone_contact_has_no_reply_to(self):
        self.req(body={**GOOD, "contact": "+381 64 123 4567"})
        self.notifier.flush()
        [msg] = FakeSMTP.sent
        self.assertIsNone(msg["Reply-To"])
        self.assertEqual(self.rows()[0]["phone"], "+381 64 123 4567")

    def test_smtp_failure_keeps_lead_and_retries(self):
        FakeSMTP.fail = True
        self.req()
        self.notifier.flush()
        row = self.rows()[0]
        self.assertIsNone(row["notified_at"])
        self.assertEqual(row["notify_attempts"], 1)
        self.assertIn("SMTPAuthenticationError", row["notify_error"])
        FakeSMTP.fail = False
        self.notifier.flush()
        self.assertIsNotNone(self.rows()[0]["notified_at"])
        self.assertEqual(len(FakeSMTP.sent), 1)

    def test_validation_errors(self):
        status, body, _ = self.req(body={**GOOD, "name": "A", "contact": "abc", "message": "kratko"})
        self.assertEqual(status, 400)
        self.assertEqual(set(body["errors"]), {"name", "contact", "message"})
        self.assertEqual(self.rows(), [])

    def test_header_injection_is_neutralised(self):
        self.req(body={**GOOD, "name": "Ana\r\nBcc: x@evil.test", "service_label": "Sajt\nBcc: y@evil.test"})
        self.notifier.flush()
        [msg] = FakeSMTP.sent
        self.assertIsNone(msg["Bcc"])
        self.assertNotIn("\n", msg["Subject"])

    def test_unknown_service_and_lang_are_normalised(self):
        self.req(body={**GOOD, "service": "drop table", "lang": "xx"})
        row = self.rows()[0]
        self.assertEqual((row["service"], row["lang"]), ("unsure", "sr"))

    def test_foreign_or_missing_origin_rejected(self):
        self.assertEqual(self.req(origin="https://evil.example")[0], 403)
        self.assertEqual(self.req(origin=None)[0], 403)
        self.assertEqual(self.rows(), [])

    def test_preflight(self):
        status, _, headers = self.req(method="OPTIONS", body=None)
        self.assertEqual(status, 204)
        self.assertEqual(headers["Access-Control-Allow-Origin"], ORIGIN)
        self.assertIn("POST", headers["Access-Control-Allow-Methods"])
        self.assertEqual(self.req(method="OPTIONS", body=None, origin="https://evil.example")[0], 403)

    def test_honeypot_pretends_success_but_stores_nothing(self):
        status, body, _ = self.req(body={**GOOD, "botcheck": "http://spam"})
        self.assertEqual((status, body["success"]), (201, True))
        self.assertEqual(self.rows(), [])

    def test_rate_limit_per_ip(self):
        for _ in range(3):
            self.assertEqual(self.req(ip="198.51.100.1")[0], 201)
        self.assertEqual(self.req(ip="198.51.100.1")[0], 429)
        self.assertEqual(self.req(ip="198.51.100.2")[0], 201)

    def test_bad_requests(self):
        self.assertEqual(self.req(body=b"not json")[0], 400)
        self.assertEqual(self.req(body=b"[1,2]")[0], 400)
        self.assertEqual(self.req(ctype="text/plain")[0], 415)
        self.assertEqual(self.req(body=b"x" * (leads_api.MAX_BODY + 1))[0], 413)
        self.assertEqual(self.req(path="/admin")[0], 404)

    def test_healthz(self):
        status, body, _ = self.req(method="GET", path="/healthz", body=None)
        self.assertEqual((status, body), (200, {"ok": True}))

    def test_long_fields_are_truncated(self):
        self.req(body={**GOOD, "message": "x" * 20, "name": "N" * 500})
        self.assertEqual(len(self.rows()[0]["name"]), 100)


if __name__ == "__main__":
    unittest.main()
