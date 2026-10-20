const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === "/") {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
    });

    response.end(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Todo App</title>
        </head>
        <body>
          <h1>Todo App</h1>
          <p>The Todo application is running successfully.</p>
        </body>
      </html>
    `);

    return;
  }

  response.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8",
  });

  response.end("Not Found\n");
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});