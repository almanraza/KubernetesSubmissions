import os
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("PORT", "3000"))

LOG_OUTPUT_FILE = "/shared/log-output.txt"
PING_PONG_FILE = "/shared/ping-pong.txt"


def read_file(path, default_value):
    try:
        with open(path, "r", encoding="utf-8") as file:
            return file.read().strip()
    except FileNotFoundError:
        return default_value


class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/":
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"Not Found\n")
            return

        log_output = read_file(
            LOG_OUTPUT_FILE,
            "Waiting for log writer..."
        )

        ping_pong_count = read_file(
            PING_PONG_FILE,
            "0"
        )

        response = (
            f"{log_output}\n"
            f"Ping / Pongs: {ping_pong_count}\n"
        )

        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(response.encode("utf-8"))

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), RequestHandler)
    print(f"HTTP server started in port {PORT}", flush=True)
    server.serve_forever()