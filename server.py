"""Serve the standalone frontend and proxy GET requests to the hosted class API."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.parse import urlsplit
import json
import os

ROOT = Path(__file__).resolve().parent
API_BASE = os.environ.get('API_BASE_URL', 'https://two026-it4200-fall.onrender.com').rstrip('/')
PORT = int(os.environ.get('PORT', '5500'))

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        parts = urlsplit(self.path)
        if parts.path == '/':
            self.path = '/index.html'
            return super().do_GET()
        if parts.path == '/backend' or parts.path.startswith('/backend/'):
            upstream_path = parts.path[len('/backend'):] or '/'
            url = API_BASE + upstream_path + (('?' + parts.query) if parts.query else '')
            try:
                req = Request(url, headers={'Accept': 'application/json', 'User-Agent': 'IT4200Frontend/1.0'})
                with urlopen(req, timeout=35) as res:
                    self.respond(res.status, res.read(), res.headers.get('Content-Type', 'application/json'))
            except HTTPError as exc:
                self.respond(exc.code, exc.read(), exc.headers.get('Content-Type', 'application/json'))
            except (URLError, TimeoutError, OSError) as exc:
                payload = json.dumps({'error': 'Hosted API could not be reached. Please try again.'}).encode()
                self.respond(502, payload, 'application/json')
            return
        if parts.path not in ('/index.html', '/static/app.js', '/static/styles.css'):
            self.send_error(404, 'File not found')
            return
        return super().do_GET()

    def respond(self, status, body, content_type):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    print(f'Frontend: http://localhost:{PORT}')
    print(f'Hosted API: {API_BASE}')
    ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
