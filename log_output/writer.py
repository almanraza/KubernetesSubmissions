import random
import string
import time
from datetime import datetime, timezone

OUTPUT_FILE = "/shared/log-output.txt"

random_string = "".join(
    random.choices(string.ascii_letters + string.digits, k=36)
)

print(f"Writer started with random string: {random_string}", flush=True)

while True:
    timestamp = datetime.now(timezone.utc).isoformat()
    line = f"{timestamp}: {random_string}"

    with open(OUTPUT_FILE, "a", encoding="utf-8") as file:
        file.write(line + "\n")
        file.flush()

    print(line, flush=True)
    time.sleep(5)