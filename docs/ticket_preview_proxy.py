#!/usr/bin/env python3
"""Small preview proxy used by the HTTPS VIP on port 8001."""
from __future__ import annotations

import argparse
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


DEFAULT_FRONTEND = "http://127.0.0.1:8000"
DEFAULT_API = "http://127.0.0.1:8765"
DEFAULT_OPENCLAW = "http://127.0.0.1:18789"
DEFAULT_UPSTREAM_TIMEOUT = 180.0


def clean_base(value: str) -> str:
    return str(value or "").rstrip("/")


def positive_float(value, default: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


def openclaw_target_path(path: str) -> str:
    text = str(path or "")
    suffix = text[len("/openclaw-control"):] if text.startswith("/openclaw-control") else text
    return suffix or "/"


def target_for_path(
    path: str,
    *,
    frontend_base: str = DEFAULT_FRONTEND,
    api_base: str = DEFAULT_API,
    openclaw_base: str = DEFAULT_OPENCLAW,
) -> str:
    text = str(path or "")
    if text.startswith("/api/"):
        base = clean_base(api_base)
        target_path = text
    elif text.startswith("/openclaw-control"):
        base = clean_base(openclaw_base)
        target_path = openclaw_target_path(text)
    else:
        base = clean_base(frontend_base)
        target_path = text
    return urljoin(f"{base}/", target_path.lstrip("/"))


def filtered_response_headers(headers) -> list[tuple[str, str]]:
    blocked = {"x-frame-options", "content-security-policy"}
    return [
        (key, value)
        for key, value in headers
        if key.lower() not in blocked
    ]


class ProxyHandler(BaseHTTPRequestHandler):
    frontend_base = clean_base(os.environ.get("OPENCLAW_PREVIEW_FRONTEND", DEFAULT_FRONTEND))
    api_base = clean_base(os.environ.get("OPENCLAW_PREVIEW_API", DEFAULT_API))
    openclaw_base = clean_base(os.environ.get("OPENCLAW_PREVIEW_OPENCLAW", DEFAULT_OPENCLAW))
    upstream_timeout = positive_float(os.environ.get("OPENCLAW_PREVIEW_UPSTREAM_TIMEOUT"), DEFAULT_UPSTREAM_TIMEOUT)

    def target(self) -> str:
        return target_for_path(
            self.path,
            frontend_base=self.frontend_base,
            api_base=self.api_base,
            openclaw_base=self.openclaw_base,
        )

    def proxy(self) -> None:
        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length) if length else None
        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in {"host", "content-length", "accept-encoding", "connection"}
        }
        req = Request(self.target(), data=body, headers=headers, method=self.command)
        try:
            with urlopen(req, timeout=self.upstream_timeout) as resp:
                self.write_response(resp.status, resp.headers.items(), resp.read())
        except HTTPError as exc:
            self.write_response(exc.code, exc.headers.items(), exc.read())
        except URLError as exc:
            self.write_response(502, [("Content-Type", "text/plain; charset=utf-8")], str(exc).encode("utf-8"))

    def write_response(self, status: int, headers, payload: bytes) -> None:
        self.send_response(status)
        response_headers = filtered_response_headers(headers) if self.path.startswith("/openclaw-control") else headers
        for key, value in response_headers:
            if key.lower() not in {"transfer-encoding", "connection", "content-encoding"}:
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:
        self.proxy()

    def do_HEAD(self) -> None:
        self.proxy()

    def do_POST(self) -> None:
        self.proxy()

    def do_PUT(self) -> None:
        self.proxy()

    def do_PATCH(self) -> None:
        self.proxy()

    def do_DELETE(self) -> None:
        self.proxy()

    def do_OPTIONS(self) -> None:
        self.proxy()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=os.environ.get("OPENCLAW_PREVIEW_HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("OPENCLAW_PREVIEW_PORT", "8001")))
    parser.add_argument("--frontend", default=os.environ.get("OPENCLAW_PREVIEW_FRONTEND", DEFAULT_FRONTEND))
    parser.add_argument("--api", default=os.environ.get("OPENCLAW_PREVIEW_API", DEFAULT_API))
    parser.add_argument("--openclaw", default=os.environ.get("OPENCLAW_PREVIEW_OPENCLAW", DEFAULT_OPENCLAW))
    parser.add_argument(
        "--upstream-timeout",
        type=float,
        default=positive_float(os.environ.get("OPENCLAW_PREVIEW_UPSTREAM_TIMEOUT"), DEFAULT_UPSTREAM_TIMEOUT),
    )
    args = parser.parse_args()
    ProxyHandler.frontend_base = clean_base(args.frontend)
    ProxyHandler.api_base = clean_base(args.api)
    ProxyHandler.openclaw_base = clean_base(args.openclaw)
    ProxyHandler.upstream_timeout = args.upstream_timeout
    server = ThreadingHTTPServer((args.host, args.port), ProxyHandler)
    print(
        f"ticket preview proxy listening on http://{args.host}:{args.port} "
        f"frontend={ProxyHandler.frontend_base} api={ProxyHandler.api_base} "
        f"upstream_timeout={ProxyHandler.upstream_timeout}",
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
