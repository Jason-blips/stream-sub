const CHUNK_MS = 250;  // 0.25 秒一块

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
const SUBTITLE_HISTORY = 3;  // 悬浮窗显示最近 N 条
let subtitleLines = [];

const sourceList = document.getElementById("sourceList");
const targetLang = document.getElementById("targetLang");
const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");

function setStatus(msg) {
  statusEl.textContent = msg;
}

function updateWindowAudioCheckbox() {
  const cb = document.getElementById("windowAudioOnly");
  const wrap = cb?.closest(".checkbox-wrap");
  if (wrap) wrap.style.display = selectedSourceId === "microphone" ? "none" : "flex";
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
    const micOnly = document.createElement("div");
    micOnly.className = "source-item";
    micOnly.dataset.id = "microphone";
    micOnly.textContent = "仅麦克风（扬声器外放时靠近可拾音）";
    micOnly.onclick = () => {
      document.querySelectorAll(".source-item").forEach((e) => e.classList.remove("selected"));
      micOnly.classList.add("selected");
      selectedSourceId = "microphone";
      updateWindowAudioCheckbox();
    };
    sourceList.appendChild(micOnly);
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
        updateWindowAudioCheckbox();
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
        updateWindowAudioCheckbox();
      };
      sourceList.appendChild(div);
    });
    if (sourceList.children.length > 0) {
      sourceList.children[0].click();
      updateWindowAudioCheckbox();
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

  const windowAudioOnly = document.getElementById("windowAudioOnly")?.checked && selectedSourceId !== "microphone";
  try {
    extraStreams = [];
    if (selectedSourceId === "microphone") {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else {
      const windowStream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: selectedSourceId } },
        video: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: selectedSourceId } },
      });
      if (windowAudioOnly) {
        stream = windowStream;
        extraStreams = [windowStream];
      } else {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream = mixAudioStreams(windowStream, micStream);
        extraStreams = [windowStream, micStream];
      }
    }
  } catch (e) {
    setStatus(windowAudioOnly ? "无法捕获窗口音频，请选择播放窗口并允许共享" : "无法捕获，请选择播放窗口并允许麦克风");
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
          subtitleLines.push(msg.translated);
          if (subtitleLines.length > SUBTITLE_HISTORY) subtitleLines.shift();
          const display = subtitleLines.join("\n");
          window.electronAPI.sendSubtitle(display);
          document.getElementById("subtitleText").textContent = display;
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
