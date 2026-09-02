// Widget nổi trên trang web — bản browser của widget desktop (index.html +
// widget-render.js). Dùng Shadow DOM để CSS trang web không đụng vào widget.
// State/settings lấy từ chrome.storage.local (background.js là nơi ghi lastState
// qua WebSocket; content script chỉ đọc + lắng nghe onChanged, không tự mở WS).

(() => {
  const INFO = {
    waiting: { label: "CHỜ XÁC NHẬN", color: "#E08A72", on: "#C6553F" },
    running: { label: "ĐANG CHẠY", color: "#D9A441", on: "#D9A441" },
    done: { label: "XONG VIỆC", color: "#8FB57F", on: "#7A9E6B" },
    idle: { label: "ĐANG NGHỈ", color: "#7E776B", on: "#5C564C" },
  };

  const POSITION_CSS = {
    "top-left": { top: "20px", left: "20px" },
    "top-center": { top: "20px", left: "50%", transform: "translateX(-50%)" },
    "top-right": { top: "20px", right: "20px" },
    "middle-left": { top: "50%", left: "20px", transform: "translateY(-50%)" },
    "middle-center": { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    "middle-right": { top: "50%", right: "20px", transform: "translateY(-50%)" },
    "bottom-left": { bottom: "20px", left: "20px" },
    "bottom-center": { bottom: "20px", left: "50%", transform: "translateX(-50%)" },
    "bottom-right": { bottom: "20px", right: "20px" },
  };

  let host, root, els;
  let settings = { enabled: true, mode: 1, opacity: 1, position: "top-right" };
  let state = { status: "idle" };

  function build() {
    host = document.createElement("div");
    host.id = "claude-traffic-light-host";
    Object.assign(host.style, { position: "fixed", zIndex: 2147483647 });
    root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        .wrap { display: flex; flex-direction: column; align-items: center; gap: 8px;
          font-family: -apple-system, "Segoe UI", Arial, sans-serif; user-select: none; }
        .dots { border: 3px solid rgba(20,20,19,var(--bg-a,1)); background: rgba(26,25,23,var(--bg-a,1));
          box-shadow: 5px 5px 0 rgba(0,0,0,calc(0.3 * var(--bg-a,1))); padding: 10px; box-sizing: border-box;
          display: flex; flex-direction: column; gap: 7px; }
        .dot { width: 26px; height: 26px; box-shadow: inset -4px -4px 0 rgba(0,0,0,.22), inset 4px 4px 0 rgba(255,255,255,.14);
          opacity: var(--dot-a,1); background: #4A3B37; }
        .label { border: 2px solid rgba(52,48,42,var(--bg-a,1)); background: rgba(13,12,11,var(--bg-a,1));
          padding: 6px 12px; text-align: center; font-weight: 800; font-size: 10px; letter-spacing: .5px;
          white-space: nowrap; opacity: var(--dot-a,1); }
        .minimal-box { border: 3px solid rgba(20,20,19,var(--bg-a,1)); background: rgba(26,25,23,var(--bg-a,1));
          box-shadow: 5px 5px 0 rgba(0,0,0,calc(0.3 * var(--bg-a,1))); padding: 8px; box-sizing: border-box; }
        .dot-minimal { width: 26px; height: 26px; box-shadow: inset -4px -4px 0 rgba(0,0,0,.22), inset 4px 4px 0 rgba(255,255,255,.14);
          opacity: var(--dot-a,1); background: #5C564C; }
        .hidden { display: none !important; }
      </style>
      <div class="wrap">
        <div class="full-layout">
          <div class="dots">
            <div class="dot" data-k="red"></div>
            <div class="dot" data-k="yellow"></div>
            <div class="dot" data-k="green"></div>
          </div>
          <div class="label"></div>
        </div>
        <div class="minimal-box hidden">
          <div class="dot-minimal"></div>
        </div>
      </div>`;
    els = {
      wrap: root.querySelector(".wrap"),
      fullLayout: root.querySelector(".full-layout"),
      minimalBox: root.querySelector(".minimal-box"),
      red: root.querySelector('[data-k="red"]'),
      yellow: root.querySelector('[data-k="yellow"]'),
      green: root.querySelector('[data-k="green"]'),
      label: root.querySelector(".label"),
      dotMinimal: root.querySelector(".dot-minimal"),
    };
    document.documentElement.appendChild(host);
  }

  function applyPosition() {
    Object.assign(host.style, { top: "", left: "", right: "", bottom: "", transform: "" });
    Object.assign(host.style, POSITION_CSS[settings.position] || POSITION_CSS["top-right"]);
  }

  function render() {
    if (!host) return;
    host.style.display = settings.enabled ? "block" : "none";
    applyPosition();

    const info = INFO[state.status] || INFO.idle;
    els.red.style.background = state.status === "waiting" ? info.on : "#4A3B37";
    els.yellow.style.background = state.status === "running" ? info.on : "#463D2C";
    els.green.style.background = state.status === "done" ? info.on : "#334030";
    els.label.textContent = info.label;
    els.label.style.borderColor = info.color;
    els.label.style.color = info.color;
    els.dotMinimal.style.background = info.on;

    els.fullLayout.classList.toggle("hidden", settings.mode === 3);
    els.minimalBox.classList.toggle("hidden", settings.mode !== 3);
    els.label.classList.toggle("hidden", settings.mode !== 1);

    root.host.style.setProperty("--dot-a", settings.opacity);
    root.host.style.setProperty("--bg-a", Math.max(0, settings.opacity - 0.2));
  }

  async function init() {
    const stored = await chrome.storage.local.get(["widgetSettings", "lastState"]);
    if (stored.widgetSettings) settings = stored.widgetSettings;
    if (stored.lastState) state = stored.lastState;
    build();
    render();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.widgetSettings) settings = changes.widgetSettings.newValue;
    if (changes.lastState) state = changes.lastState.newValue;
    render();
  });

  init();
})();
