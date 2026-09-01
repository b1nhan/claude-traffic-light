const SERVER_HTTP = "http://localhost:7317/status";
const SERVER_WS = "ws://localhost:7317";

const BADGE_COLORS = {
  idle: "#666666",
  running: "#f5b414",
  waiting: "#e63228",
  done: "#28b446",
};

const ICONS = {
  idle: { 16: "icons/gray-16.png", 48: "icons/gray-48.png", 128: "icons/gray-128.png" },
  running: { 16: "icons/yellow-16.png", 48: "icons/yellow-48.png", 128: "icons/yellow-128.png" },
  waiting: { 16: "icons/red-16.png", 48: "icons/red-48.png", 128: "icons/red-128.png" },
  done: { 16: "icons/green-16.png", 48: "icons/green-48.png", 128: "icons/green-128.png" },
};

let ws = null;

async function applyState(state) {
  const status = state.status || "idle";
  await chrome.storage.local.set({ lastState: state });
  chrome.action.setIcon({ path: ICONS[status] || ICONS.idle });
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[status] || BADGE_COLORS.idle });
  chrome.action.setBadgeText({ text: status === "idle" ? "" : "●" });
  chrome.action.setTitle({ title: `Claude: ${status}${state.message ? " — " + state.message : ""}` });
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  try {
    ws = new WebSocket(SERVER_WS);
    ws.onmessage = (evt) => {
      try {
        applyState(JSON.parse(evt.data));
      } catch (e) {
        /* ignore malformed */
      }
    };
    ws.onclose = () => {
      ws = null;
    };
    ws.onerror = () => {
      try { ws.close(); } catch (e) {}
    };
  } catch (e) {
    ws = null;
  }
}

async function pollOnce() {
  try {
    const res = await fetch(SERVER_HTTP);
    if (res.ok) applyState(await res.json());
  } catch (e) {
    // server chưa chạy — bỏ qua
  }
  connect();
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("keepalive", { periodInMinutes: 1 });
  pollOnce();
});
chrome.runtime.onStartup.addListener(pollOnce);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepalive") pollOnce();
});

pollOnce();
