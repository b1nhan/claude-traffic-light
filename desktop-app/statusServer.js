"use strict";

// Server trạng thái nhúng thẳng trong Electron main process — copy logic từ
// server/server.js, đóng gói thành 1 hàm khởi động để desktop-app tự chạy,
// không cần tiến trình node rời (server/ vẫn giữ nguyên để ai muốn chạy độc lập).

const http = require("http");
const { EventEmitter } = require("events");
const { WebSocketServer } = require("ws");

const VALID_STATES = new Set(["idle", "running", "waiting", "done"]);

function startStatusServer(port) {
  const emitter = new EventEmitter();
  let state = { status: "idle", message: "", updatedAt: Date.now() };

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
    emitter.emit("state", state);
  }

  const server = http.createServer((req, res) => {
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

  server.on("error", (err) => emitter.emit("error", err));

  server.listen(port);

  return {
    emitter,
    getState: () => state,
    setState,
    close: () => server.close(),
  };
}

module.exports = { startStatusServer };
