const CHUNK_MS = 1000;
const SUBTITLE_LINES = 5;

let ws = null;
let mediaRecorder = null;
let stream = null;
let extraStreams = [];
let capturing = false;
let mode = "mic";
let selectedWindowId = null;
let subtitleLines = [];

const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");
const windowList = document.getElementById("windowList");

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function stopCapture() {
  capturing = false;
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    try { mediaRecorder.stop(); } catch (_) {}
  }
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  extraStreams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
  extraStreams = [];
  if (ws) {
    ws.onclose = null;
    if (ws.readyState === WebSocket.OPEN) ws.close();
    ws = null;
  }
  mediaRecorder = null;
  subtitleLines = [];
  window.electronAPI?.hideOverlay?.();
  document.getElementById("subtitleText").textContent = "等待中...";
  startBtn.textContent = "开始字幕";
  startBtn.className = "btn-start go";
  setStatus("");
}

async function loadWindows() {
  try {
    const sources = await window.electronAPI.getSources();
    windowList.innerHTML = "";
    const screen = sources.find((s) => s.id.includes("screen"));
    if (screen) {
      const div = document.createElement("div");
      div.className = "window-item";
      div.dataset.id = screen.id;
      div.textContent = "整个屏幕";
      div.onclick = () => {
        document.querySelectorAll(".window-item").forEach((e) => e.classList.remove("selected"));
        div.classList.add("selected");
        selectedWindowId = screen.id;
      };
      windowList.appendChild(div);
    }
    sources.filter((s) => !s.id.includes("screen")).forEach((s) => {
      const div = document.createElement("div");
      div.className = "window-item";
      div.dataset.id = s.id;
      div.textContent = s.name.length > 50 ? s.name.slice(0, 50) + "..." : s.name;
      div.onclick = () => {
        document.querySelectorAll(".window-item").forEach((e) => e.classList.remove("selected"));
        div.classList.add("selected");
        selectedWindowId = s.id;
      };
      windowList.appendChild(div);
    });
  } catch (e) {
    windowList.innerHTML = "加载失败";
  }
}

async function startCapture() {
  if (capturing) {
    stopCapture();
    return;
  }

  try {
    extraStreams = [];
    if (mode === "mic") {
      setStatus("正在请求麦克风权限...");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else {
      if (!selectedWindowId) {
        setStatus("请先选择一个播放窗口");
        return;
      }
      setStatus("正在请求窗口共享...");
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: selectedWindowId } },
        video: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: selectedWindowId } },
      });
      extraStreams = [stream];
    }
  } catch (e) {
    setStatus(mode === "mic" ? "需要麦克风权限，请允许后重试" : "无法捕获窗口音频，请选择窗口并允许共享");
    return;
  }

  if (!stream.getAudioTracks()[0]) {
    setStatus("未获取到音频");
    if (stream) stream.getTracks().forEach((t) => t.stop());
    return;
  }

  capturing = true;
  window.electronAPI?.showOverlay?.();
  startBtn.textContent = "停止字幕";
  startBtn.className = "btn-start stop";
  setStatus("字幕已开启");
  document.getElementById("subtitleText").textContent = "正在接收...";

  const wsUrl = "ws://localhost:8765/ws";
  const lang = document.getElementById("targetLang")?.value || "zh";

  function connectWs() {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "config", targetLang: lang }));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "subtitle" && msg.translated) {
          subtitleLines.push(msg.translated);
          if (subtitleLines.length > SUBTITLE_LINES) subtitleLines.shift();
          const display = subtitleLines.join("\n");
          window.electronAPI?.sendSubtitle?.(display);
          document.getElementById("subtitleText").textContent = display;
        }
      } catch (_) {}
    };
    ws.onerror = () => setStatus("连接失败，请先启动后端 (python run.py)");
    ws.onclose = () => {
      if (capturing && stream) setTimeout(connectWs, 2000);
      else if (capturing) {
        stopCapture();
        setStatus("连接已断开");
      }
    };
  }
  connectWs();

  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
  mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 16000 });
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0 && ws?.readyState === WebSocket.OPEN) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = btoa(new Uint8Array(reader.result).reduce((s, b) => s + String.fromCharCode(b), ""));
        ws.send(JSON.stringify({ type: "audio", data: base64 }));
      };
      reader.readAsArrayBuffer(e.data);
    }
  };
  mediaRecorder.start(CHUNK_MS);
}

document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    mode = btn.dataset.mode;
    windowList.classList.toggle("visible", mode === "window");
    if (mode === "window") loadWindows();
    selectedWindowId = null;
  };
});

startBtn.onclick = () => startCapture();

window.electronAPI?.onSubtitlePreview?.((text) => {
  document.getElementById("subtitleText").textContent = text || "等待中...";
});

windowList.classList.toggle("visible", mode === "window");
if (mode === "window") loadWindows();
