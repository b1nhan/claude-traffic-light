// Claude Traffic Light — status relay server
// Nhận trạng thái từ Claude Code hooks (HTTP POST) và phát (broadcast) qua
// WebSocket cho desktop app + cho phép browser extension GET trạng thái hiện tại.

const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 7317;

let state = {
  status: "idle",     // "idle" | "running" | "waiting" | "done"
  message: "",
  updatedAt: Date.now(),
};

const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

function broadcast() {
  const payload = JSON.stringify(state);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

function setState(status, message) {
  state = { status, message: message || "", updatedAt: Date.now() };
  broadcast();
  console.log(`[state] -> ${status}${message ? " | " + message : ""}`);
}

const VALID_STATES = new Set(["idle", "running", "waiting", "done"]);

const server = http.createServer((req, res) => {
  // CORS cho phép browser extension / trang bất kỳ gọi vào localhost
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(state));
  }

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("Claude Traffic Light server is running.\n");
  }

  if (req.method === "POST" && req.url === "/status") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const status = String(data.status || "").toLowerCase();
        if (!VALID_STATES.has(status)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "invalid status", valid: [...VALID_STATES] }));
        }
        setState(status, data.message);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, state }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid json" }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify(state)); // gửi trạng thái hiện tại ngay khi kết nối
    ws.on("close", () => clients.delete(ws));
  });
});

server.listen(PORT, () => {
  console.log(`Claude Traffic Light server listening on http://localhost:${PORT}`);
  console.log(`POST /status  { "status": "running" | "waiting" | "done" | "idle" }`);
});
