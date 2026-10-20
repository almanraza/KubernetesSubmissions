import random
import string
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 3000

# Generated once when the application starts and kept in memory
random_string = "".join(
    random.choices(string.ascii_letters + string.digits, k=36)
)


def current_status():
    timestamp = datetime.now(timezone.utc).isoformat()
    return f"{timestamp}: {random_string}"


def produce_logs():
    while True:
        print(current_status(), flush=True)
        time.sleep(5)


class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            response = current_status()

            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(response.encode("utf-8"))
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"Not Found")

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    log_thread = threading.Thread(target=produce_logs, daemon=True)
    log_thread.start()

    server = HTTPServer(("0.0.0.0", PORT), RequestHandler)

    print(f"Server started in port {PORT}", flush=True)
    server.serve_forever()