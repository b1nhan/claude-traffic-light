// Wiring IPC <-> WidgetRender (widget-render.js). Logic vẽ thực tế nằm ở widget-render.js
// để dùng chung với preview.html (sandbox chỉnh opacity không cần Electron).

const refs = WidgetRender.getRefs();

let currentStatus = "idle";
let currentMode = 1;
let dotAlpha = 1;
let bgAlpha = 1;

function render() {
  WidgetRender.applyState(refs, currentStatus, dotAlpha, bgAlpha);
}

window.trafficLight.onStateUpdate((state) => {
  currentStatus = state.status || "idle";
  render();
});

window.trafficLight.onModeUpdate && window.trafficLight.onModeUpdate((mode) => {
  currentMode = mode;
  WidgetRender.applyMode(refs, mode);
});

window.trafficLight.onOpacityUpdate && window.trafficLight.onOpacityUpdate(({ dot, bg }) => {
  dotAlpha = dot;
  bgAlpha = bg;
  WidgetRender.applyOpacity(dot, bg);
  render();
});

// Initial requests
window.trafficLight.requestCurrentState();
