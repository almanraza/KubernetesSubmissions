import os
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("PORT", "3000"))
COUNTER_FILE = "/shared/ping-pong.txt"


def read_counter():
    try:
        with open(COUNTER_FILE, "r", encoding="utf-8") as file:
            value = file.read().strip()
            return int(value) if value else 0
    except (FileNotFoundError, ValueError):
        return 0


def write_counter(value):
    with open(COUNTER_FILE, "w", encoding="utf-8") as file:
        file.write(str(value))
        file.flush()


class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path not in ["/", "/pingpong"]:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"Not Found\n")
            return

        counter = read_counter() + 1
        write_counter(counter)

        response = f"pong {counter}\n"

        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(response.encode("utf-8"))

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    current_counter = read_counter()
    write_counter(current_counter)

    server = HTTPServer(("0.0.0.0", PORT), RequestHandler)
    print(f"Ping-pong server started in port {PORT}", flush=True)
    server.serve_forever()