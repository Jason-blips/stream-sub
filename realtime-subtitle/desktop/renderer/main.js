const CHUNK_MS = 2000;
const RECONNECT_MAX = 3;

function mixAudioStreams(streamA, streamB) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const dest = ctx.createMediaStreamDestination();
  const gainA = ctx.createGain();
  const gainB = ctx.createGain();
  gainA.gain.value = 1;
  gainB.gain.value = 1;
  const srcA = ctx.createMediaStreamSource(streamA);
  const srcB = ctx.createMediaStreamSource(streamB);
  srcA.connect(gainA).connect(dest);
  srcB.connect(gainB).connect(dest);
  return dest.stream;
}

let ws = null;
let mediaRecorder = null;
let stream = null;
let extraStreams = [];
let capturing = false;
let selectedSourceId = null;
let reconnectCount = 0;

const sourceList = document.getElementById("sourceList");
const targetLang = document.getElementById("targetLang");
const wsUrlInput = document.getElementById("wsUrl");
const startBtn = document.getElementById("startBtn");
const statusEl = document.getElementById("status");

async function loadSources() {
  try {
    const sources = await window.electronAPI.getSources();
    sourceList.innerHTML = "";
    const specialSources = [
      { id: "microphone", name: "麦克风（你说的话）", hint: "本地输入" },
      { id: "microphone+screen", name: "麦克风 + 整个屏幕（你说的话 + 播放的声音）", hint: "混合" },
    ];
    specialSources.forEach((s) => {
      const div = document.createElement("div");
      div.className = "source-item";
      div.dataset.id = s.id;
      div.innerHTML = `<span class="name">${escapeHtml(s.name)}</span><span class="hint">${s.hint}</span>`;
      div.onclick = () => {
        document.querySelectorAll(".source-item").forEach((e) => e.classList.remove("selected"));
        div.classList.add("selected");
        selectedSourceId = s.id;
      };
      sourceList.appendChild(div);
    });
    sources.forEach((s) => {
      const div = document.createElement("div");
      div.className = "source-item";
      div.dataset.id = s.id;
      div.innerHTML = `
        <span class="name">${escapeHtml(s.name)}</span>
        <span class="hint">${s.id.includes("screen") ? "屏幕" : "窗口"}</span>
      `;
      div.onclick = () => {
        document.querySelectorAll(".source-item").forEach((e) => e.classList.remove("selected"));
        div.classList.add("selected");
        selectedSourceId = s.id;
      };
      sourceList.appendChild(div);
    });
  } catch (e) {
    sourceList.innerHTML = '<div style="padding:20px;text-align:center;color:#dc2626;">加载失败</div>';
  }
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function stopCapture() {
  capturing = false;
  reconnectCount = 0;
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

async function startCapture() {
  if (!selectedSourceId) {
    setStatus("请先选择一个窗口");
    return;
  }

  if (capturing) {
    stopCapture();
    return;
  }

  try {
    extraStreams = [];
    if (selectedSourceId === "microphone") {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else if (selectedSourceId === "microphone+screen") {
      const sources = await window.electronAPI.getSources();
      const screenSource = sources.find((s) => s.id.includes("screen"));
      if (!screenSource) {
        setStatus("未找到屏幕，请选择「麦克风」或窗口");
        return;
      }
      const [screenStream, micStream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          audio: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: screenSource.id } },
          video: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: screenSource.id } },
        }),
        navigator.mediaDevices.getUserMedia({ audio: true }),
      ]);
      stream = mixAudioStreams(screenStream, micStream);
      extraStreams = [screenStream, micStream];
    } else {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: selectedSourceId } },
        video: { mandatory: { chromeMediaSource: "desktop", chromeMediaSourceId: selectedSourceId } },
      });
    }
  } catch (e) {
    setStatus("无法捕获。麦克风需授权；窗口/屏幕请重试");
    return;
  }

  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack) {
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
  window.electronAPI.sendSubtitle("【测试】若看到此句，悬浮窗应正常");

  let wsUrl = wsUrlInput.value.trim() || "ws://localhost:8765/ws";
  if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
    wsUrl = "ws://localhost:8765/ws";
  }
  const lang = targetLang.value;

  function connectWs() {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      reconnectCount = 0;
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
    ws.onerror = () => {
      if (reconnectCount === 0) setStatus("连接后端失败，请确认服务已启动");
    };
    ws.onclose = () => {
      if (capturing && stream && reconnectCount < RECONNECT_MAX) {
        reconnectCount++;
        setTimeout(connectWs, 1500);
      } else if (capturing) {
        stopCapture();
        setStatus("连接已断开");
      }
    };
  }
  connectWs();

  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";
  mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 16000 });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0 && ws?.readyState === WebSocket.OPEN) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = btoa(
          new Uint8Array(reader.result).reduce((s, b) => s + String.fromCharCode(b), "")
        );
        ws.send(JSON.stringify({ type: "audio", data: base64 }));
      };
      reader.readAsArrayBuffer(e.data);
    }
  };

  mediaRecorder.start(CHUNK_MS);
}

startBtn.onclick = () => startCapture();
document.getElementById("refreshBtn").onclick = () => loadSources();
window.electronAPI.onSubtitlePreview?.((text) => {
  document.getElementById("subtitleText").textContent = text || "等待字幕...";
});
document.getElementById("resetUrl").onclick = () => {
  wsUrlInput.value = "ws://localhost:8765/ws";
  setStatus("已恢复默认地址");
};
loadSources();
