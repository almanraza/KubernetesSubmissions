const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;

const CACHE_DIRECTORY =
  process.env.IMAGE_CACHE_DIRECTORY || "/mnt/cache";

const IMAGE_FILE = path.join(CACHE_DIRECTORY, "current.jpg");
const TEMP_IMAGE_FILE = path.join(CACHE_DIRECTORY, "current.tmp");

const CACHE_DURATION_MS = 10 * 60 * 1000;

let refreshPromise = null;

/*
 * Creates the persistent cache directory if it does not exist.
 */
function ensureCacheDirectory() {
  fs.mkdirSync(CACHE_DIRECTORY, { recursive: true });
}

/*
 * Returns true when the cached image exists and is less than
 * ten minutes old.
 */
function isImageFresh() {
  try {
    const stats = fs.statSync(IMAGE_FILE);
    const age = Date.now() - stats.mtimeMs;

    return age < CACHE_DURATION_MS;
  } catch {
    return false;
  }
}

/*
 * Downloads a file while following redirects.
 * Lorem Picsum normally redirects the initial request to
 * the selected image.
 */
function downloadFile(url, destination, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects from image service"));
      return;
    }

    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "todo-app/1.12",
          Accept: "image/*",
        },
      },
      (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();

          const redirectedUrl = new URL(
            response.headers.location,
            url
          ).toString();

          downloadFile(
            redirectedUrl,
            destination,
            redirectCount + 1
          )
            .then(resolve)
            .catch(reject);

          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(
            new Error(
              `Image request failed with status ${response.statusCode}`
            )
          );
          return;
        }

        const file = fs.createWriteStream(destination);

        response.pipe(file);

        file.on("finish", () => {
          file.close(resolve);
        });

        file.on("error", (error) => {
          file.close(() => {
            fs.rm(destination, { force: true }, () => {});
          });

          reject(error);
        });
      }
    );

    request.setTimeout(30000, () => {
      request.destroy(
        new Error("Image download timed out after 30 seconds")
      );
    });

    request.on("error", reject);
  });
}

/*
 * Downloads a new image to a temporary file and then renames it.
 * The rename prevents clients from seeing a partially downloaded file.
 */
async function refreshImage() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    ensureCacheDirectory();

    const randomValue = `${Date.now()}-${crypto.randomUUID()}`;
    const imageUrl =
      `https://picsum.photos/1200?random=${encodeURIComponent(randomValue)}`;

    console.log(`Downloading a new image from ${imageUrl}`);

    await downloadFile(imageUrl, TEMP_IMAGE_FILE);
    fs.renameSync(TEMP_IMAGE_FILE, IMAGE_FILE);

    console.log(`New image saved to ${IMAGE_FILE}`);
  })();

  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/*
 * Gets the cached image.
 *
 * Cache behavior:
 * 1. No image: download one and return it.
 * 2. Image younger than ten minutes: return it.
 * 3. Image older than ten minutes:
 *    - keep the old image in memory;
 *    - download and save a new image;
 *    - return the old image one final time.
 *
 * Therefore, the following request receives the new image.
 */
async function getImageForResponse() {
  ensureCacheDirectory();

  if (!fs.existsSync(IMAGE_FILE)) {
    await refreshImage();

    return {
      data: fs.readFileSync(IMAGE_FILE),
      cacheStatus: "new",
    };
  }

  if (isImageFresh()) {
    return {
      data: fs.readFileSync(IMAGE_FILE),
      cacheStatus: "fresh",
    };
  }

  const oldImage = fs.readFileSync(IMAGE_FILE);

  try {
    await refreshImage();

    return {
      data: oldImage,
      cacheStatus: "expired-served-once",
    };
  } catch (error) {
    console.error("Could not refresh image:", error);

    return {
      data: oldImage,
      cacheStatus: "stale-refresh-failed",
    };
  }
}

function sendHtml(response) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>Todo Application</title>

  <style>
    body {
      margin: 0;
      padding: 40px 20px;
      font-family: Arial, sans-serif;
      background: #f4f6f8;
      color: #202124;
    }

    .container {
      max-width: 900px;
      margin: auto;
      padding: 24px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }

    h1 {
      margin-top: 0;
    }

    .hourly-image {
      display: block;
      width: 100%;
      max-height: 600px;
      object-fit: cover;
      border-radius: 8px;
      background: #dddddd;
    }

    .todo-form {
      display: flex;
      gap: 8px;
      margin-top: 24px;
    }

    .todo-form input {
      flex: 1;
      padding: 12px;
      font-size: 16px;
    }

    .todo-form button {
      padding: 12px 18px;
      cursor: pointer;
    }

    .help-text {
      color: #5f6368;
      font-size: 14px;
    }
  </style>
</head>

<body>
  <main class="container">
    <h1>Todo Application</h1>

    <p class="help-text">
      The image is cached on persistent storage for ten minutes.
    </p>

    <img
      class="hourly-image"
      src="/image"
      alt="Random cached picture from Lorem Picsum"
    >

    <form class="todo-form">
      <input
        type="text"
        maxlength="140"
        placeholder="Write a todo..."
      >
      <button type="submit">Create todo</button>
    </form>

    <ul>
      <li>Learn Kubernetes</li>
      <li>Complete exercise 1.12</li>
    </ul>
  </main>
</body>
</html>`;

  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
  });

  response.end(html);
}

async function requestHandler(request, response) {
  const url = new URL(
    request.url,
    `http://${request.headers.host || "localhost"}`
  );

  if (request.method === "GET" && url.pathname === "/") {
    sendHtml(response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/image") {
    try {
      const image = await getImageForResponse();

      response.writeHead(200, {
        "Content-Type": "image/jpeg",

        /*
         * Prevent the browser from keeping its own ten-minute cache.
         * The application and persistent volume are responsible for caching.
         */
        "Cache-Control": "no-store",

        "X-Image-Cache-Status": image.cacheStatus,
      });

      response.end(image.data);
    } catch (error) {
      console.error("Image request failed:", error);

      response.writeHead(503, {
        "Content-Type": "text/plain; charset=utf-8",
      });

      response.end("Image is temporarily unavailable");
    }

    return;
  }

  /*
   * Local exercise-only endpoint for testing container recovery.
   *
   * Kubernetes should restart the container after the process exits.
   */
  if (
    request.method === "POST" &&
    url.pathname === "/shutdown"
  ) {
    response.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
    });

    response.end("Shutting down the container for testing\n");

    console.log("Shutdown requested. Exiting in one second.");

    setTimeout(() => {
      process.exit(1);
    }, 1000);

    return;
  }

  if (request.method === "GET" && url.pathname === "/healthz") {
    response.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
    });

    response.end("OK");
    return;
  }

  response.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8",
  });

  response.end("Not found");
}

ensureCacheDirectory();

const server = http.createServer((request, response) => {
  requestHandler(request, response).catch((error) => {
    console.error("Unhandled request error:", error);

    if (!response.headersSent) {
      response.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8",
      });
    }

    response.end("Internal server error");
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started in port ${PORT}`);
  console.log(`Image cache directory: ${CACHE_DIRECTORY}`);
});