const CHUNK_MS = 2000;

function mixAudioStreams(streamA, streamB) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = ctx.createMediaStreamDestination();
  ctx.createMediaStreamSource(streamA).connect(dest);
  ctx.createMediaStreamSource(streamB).connect(dest);
  return dest.stream;
}

let ws = null;
let mediaRecorder = null;
let stream = null;
let extraStreams = [];
let capturing = false;
let selectedSourceId = null;

const sourceList = document.getElementById("sourceList");
const targetLang = document.getElementById("targetLang");
const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");

function setStatus(msg) {
  statusEl.textContent = msg;
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
  window.electronAPI.hideOverlay();
  document.getElementById("subtitleText").textContent = "等待字幕...";
  startBtn.textContent = "开始字幕";
  startBtn.className = "btn btn-primary";
  setStatus("");
}

async function loadSources() {
  try {
    const sources = await window.electronAPI.getSources();
    sourceList.innerHTML = "";
    const screenFirst = sources.find((s) => s.id.includes("screen"));
    if (screenFirst) {
      const div = document.createElement("div");
      div.className = "source-item";
      div.dataset.id = screenFirst.id;
      div.textContent = "整个屏幕";
      div.onclick = () => {
        document.querySelectorAll(".source-item").forEach((e) => e.classList.remove("selected"));
        div.classList.add("selected");
        selectedSourceId = screenFirst.id;
      };
      sourceList.appendChild(div);
    }
    sources.filter((s) => !s.id.includes("screen")).forEach((s) => {
      const div = document.createElement("div");
      div.className = "source-item";
      div.dataset.id = s.id;
      div.textContent = s.name.length > 40 ? s.name.slice(0, 40) + "..." : s.name;
      div.onclick = () => {
        document.querySelectorAll(".source-item").forEach((e) => e.classList.remove("selected"));
        div.classList.add("selected");
        selectedSourceId = s.id;
      };
      sourceList.appendChild(div);
    });
    if (sourceList.children.length > 0) {
      sourceList.children[0].click();
    }
  } catch (e) {
    sourceList.innerHTML = "加载失败";
  }
}

async function startCapture() {
  if (capturing) {
    stopCapture();
    return;
  }
  if (!selectedSourceId) {
    setStatus("请先选择播放窗口");
    return;
  }

  try {
    extraStreams = [];
    const [windowStream, micStream] = await Promise.all([
      navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: selectedSourceId } },
        video: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: selectedSourceId } },
      }),
      navigator.mediaDevices.getUserMedia({ audio: true }),
    ]);
    stream = mixAudioStreams(windowStream, micStream);
    extraStreams = [windowStream, micStream];
  } catch (e) {
    setStatus("无法捕获，请选择播放英剧的窗口并允许麦克风");
    return;
  }

  if (!stream.getAudioTracks()[0]) {
    setStatus("未捕获到音频");
    if (stream) stream.getTracks().forEach((t) => t.stop());
    return;
  }

  capturing = true;
  window.electronAPI.showOverlay();
  startBtn.textContent = "停止字幕";
  startBtn.className = "btn btn-stop";
  setStatus("字幕已开启");
  document.getElementById("subtitleText").textContent = "正在接收...";

  const wsUrl = "ws://localhost:8765/ws";
  const lang = targetLang.value;

  function connectWs() {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "config", targetLang: lang }));
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "subtitle" && msg.translated) {
          window.electronAPI.sendSubtitle(msg.translated);
          document.getElementById("subtitleText").textContent = msg.translated;
        }
      } catch (_) {}
    };
    ws.onerror = () => setStatus("连接后端失败，请先启动 backend");
    ws.onclose = () => {
      if (capturing && stream) setTimeout(connectWs, 1500);
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

startBtn.onclick = () => startCapture();
window.electronAPI.onSubtitlePreview?.((text) => {
  document.getElementById("subtitleText").textContent = text || "等待字幕...";
});
loadSources();
