import uuid
import time
from datetime import datetime, timezone

random_string = str(uuid.uuid4())  # generated once on startup, kept in memory

while True:
    now = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    print(f"{now}: {random_string}", flush=True)
    time.sleep(5)
