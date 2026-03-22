const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = process.env.PORT || 3000;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf"
};

function resolvePath(urlPath) {
  const cleanPath = urlPath === "/" ? "/index.html" : urlPath;
  const target = path.join(root, cleanPath);
  if (!target.startsWith(root)) {
    return null;
  }
  return target;
}

http
  .createServer((req, res) => {
    const target = resolvePath(req.url.split("?")[0]);

    if (!target) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(target, (error, data) => {
      if (error) {
        res.writeHead(error.code === "ENOENT" ? 404 : 500);
        res.end(error.code === "ENOENT" ? "Not found" : "Server error");
        return;
      }

      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      res.end(data);
    });
  })
  .listen(port, () => {
    console.log(`ACE running at http://localhost:${port}`);
  });
