// Không còn phụ thuộc server local — trạng thái đến từ content-claude.js (mỗi tab
// claude.ai tự quan sát DOM rồi gửi message lên đây). Nhiều tab claude.ai cùng lúc
// thì ưu tiên: running > waiting > done > idle.

const LABELS = {
  idle: "Chưa hoạt động",
  running: "Đang trả lời",
  waiting: "Chờ xác nhận",
  done: "Đã xong",
};

const BADGE_COLORS = { idle: "#666666", running: "#f5b414", waiting: "#e63228", done: "#28b446" };

const ICONS = {
  idle: { 16: "icons/gray-16.png", 48: "icons/gray-48.png", 128: "icons/gray-128.png" },
  running: { 16: "icons/yellow-16.png", 48: "icons/yellow-48.png", 128: "icons/yellow-128.png" },
  waiting: { 16: "icons/red-16.png", 48: "icons/red-48.png", 128: "icons/red-128.png" },
  done: { 16: "icons/green-16.png", 48: "icons/green-48.png", 128: "icons/green-128.png" },
};

const PRIORITY = { running: 3, waiting: 4, done: 2, idle: 1 };

const tabStates = new Map(); // tabId -> status string

function aggregate() {
  let best = "idle";
  for (const status of tabStates.values()) {
    if ((PRIORITY[status] || 0) > (PRIORITY[best] || 0)) best = status;
  }
  return best;
}

async function applyStatus(status) {
  const state = { status, message: LABELS[status] || "", updatedAt: Date.now() };
  await chrome.storage.local.set({ lastState: state });
  chrome.action.setIcon({ path: ICONS[status] || ICONS.idle });
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS[status] || BADGE_COLORS.idle });
  chrome.action.setBadgeText({ text: status === "idle" ? "" : "●" });
  chrome.action.setTitle({ title: `Claude: ${LABELS[status] || status}` });
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== "claude-status" || !sender.tab) return;
  tabStates.set(sender.tab.id, msg.status);
  applyStatus(aggregate());
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabStates.delete(tabId)) applyStatus(aggregate());
});

chrome.runtime.onInstalled.addListener(async () => {
  const { widgetSettings } = await chrome.storage.local.get("widgetSettings");
  if (!widgetSettings) {
    await chrome.storage.local.set({
      widgetSettings: { enabled: true, mode: 1, opacity: 1, position: "top-right" },
    });
  }
  applyStatus("idle");
});
