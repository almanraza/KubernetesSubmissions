const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("Todo app is running\n");
});

server.listen(PORT, () => {
  console.log(`Server started in port ${PORT}`);
});