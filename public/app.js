const socket = io();
const welcome = document.querySelector("#welcome");
const chat = document.querySelector("#chat");
const joinForm = document.querySelector("#join-form");
const nameInput = document.querySelector("#name");
const composer = document.querySelector("#composer");
const messageInput = document.querySelector("#message-input");
const fileInput = document.querySelector("#file-input");
const preview = document.querySelector("#attachment-preview");
const messages = document.querySelector("#messages");
const online = document.querySelector("#online");
const leaveButton = document.querySelector("#leave-button");
const emojiToggle = document.querySelector("#emoji-toggle");
const emojiPicker = document.querySelector("#emoji-picker");
const galaxyCanvas = document.querySelector("#galaxy-canvas");
const voiceButton = document.querySelector("#voice-button");
const themeSwatches = document.querySelectorAll("[data-theme-choice]");
const connectButton = document.querySelector("#connect-button");
const connectModal = document.querySelector("#connect-modal");
const closeConnect = document.querySelector("#close-connect");
const soundToggle = document.querySelector("#sound-toggle");
const loginNotice = document.querySelector("#login-notice");
const themeToggle = document.querySelector("#theme-toggle");
const themePalette = document.querySelector("#theme-palette");
const reportButton = document.querySelector("#report-button");
const reportModal = document.querySelector("#report-modal");
const reportForm = document.querySelector("#report-form");
const closeReport = document.querySelector("#close-report");
const reportName = document.querySelector("#report-name");
const chatMenuToggle = document.querySelector("#chat-menu-toggle");
const chatMenuPanel = document.querySelector("#chat-menu-panel");
// Edit this one line before release to show an announcement to APK/web users.
const LOGIN_NOTICE = "";
let currentAttachment = null;
let currentName = "";
let currentAvatar = "";
let recorder = null;
let recordingChunks = [];
let recordingStream = null;
let recordingRequested = false;
let audioContext = null;
let soundsEnabled = localStorage.getItem("ping-sounds") !== "off";

function closeChatMenu() {
  chatMenuPanel.classList.add("hidden");
  chatMenuToggle.setAttribute("aria-expanded", "false");
}

chatMenuToggle.addEventListener("click", () => {
  const isOpen = !chatMenuPanel.classList.contains("hidden");
  chatMenuPanel.classList.toggle("hidden", isOpen);
  chatMenuToggle.setAttribute("aria-expanded", String(!isOpen));
});

if (LOGIN_NOTICE.trim()) {
  loginNotice.textContent = LOGIN_NOTICE.trim();
  loginNotice.hidden = false;
}

themeToggle.addEventListener("click", () => {
  const isOpen = !themePalette.classList.contains("hidden");
  themePalette.classList.toggle("hidden", isOpen);
  themeToggle.setAttribute("aria-expanded", String(!isOpen));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".theme-control")) {
    themePalette.classList.add("hidden");
    themeToggle.setAttribute("aria-expanded", "false");
  }
  if (!event.target.closest(".chat-menu")) closeChatMenu();
});

function updateSoundButton() {
  soundToggle.firstChild.textContent = soundsEnabled ? "♫ " : "× ";
  soundToggle.querySelector("span").textContent = soundsEnabled ? "Sound on" : "Sound off";
  soundToggle.setAttribute("aria-label", soundsEnabled ? "Mute chat sounds" : "Unmute chat sounds");
  soundToggle.title = soundsEnabled ? "Mute chat sounds" : "Unmute chat sounds";
}

function playSound(type) {
  if (!soundsEnabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audioContext ||= new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
  const now = audioContext.currentTime;
  const tones = {
    send: [520, 0.07, "sine"],
    receive: [680, 0.09, "sine"],
    reaction: [820, 0.06, "sine"],
    join: [440, 0.08, "triangle"],
    leave: [260, 0.1, "triangle"],
    record: [390, 0.08, "sine"]
  };
  const [frequency, duration, wave] = tones[type] || tones.receive;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

updateSoundButton();
soundToggle.addEventListener("click", () => {
  soundsEnabled = !soundsEnabled;
  localStorage.setItem("ping-sounds", soundsEnabled ? "on" : "off");
  updateSoundButton();
  closeChatMenu();
  if (soundsEnabled) playSound("receive");
});

connectButton.addEventListener("click", () => {
  connectModal.classList.remove("hidden");
  closeConnect.focus();
});
closeConnect.addEventListener("click", () => {
  connectModal.classList.add("hidden");
  connectButton.focus();
});
connectModal.addEventListener("click", (event) => {
  if (event.target === connectModal) {
    connectModal.classList.add("hidden");
    connectButton.focus();
  }
});
reportButton.addEventListener("click", () => {
  closeChatMenu();
  reportModal.classList.remove("hidden");
  reportName.value = "";
  reportName.focus();
});
closeReport.addEventListener("click", () => {
  reportModal.classList.add("hidden");
  reportButton.focus();
});
reportModal.addEventListener("click", (event) => {
  if (event.target === reportModal) {
    reportModal.classList.add("hidden");
    reportButton.focus();
  }
});
reportForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const targetName = reportName.value.trim();
  if (!targetName) return;
  socket.emit("report-user", { name: targetName });
  reportModal.classList.add("hidden");
  reportButton.focus();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    connectModal.classList.add("hidden");
    themePalette.classList.add("hidden");
    themeToggle.setAttribute("aria-expanded", "false");
    reportModal.classList.add("hidden");
    closeChatMenu();
  }
});

const savedTheme = localStorage.getItem("ping-theme") || "aurora";
applyTheme(savedTheme);
themeSwatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    const theme = swatch.dataset.themeChoice;
    applyTheme(theme);
    localStorage.setItem("ping-theme", theme);
    themePalette.classList.add("hidden");
    themeToggle.setAttribute("aria-expanded", "false");
  });
});

function applyTheme(theme) {
  const allowedThemes = ["aurora", "midnight", "ember", "mono", "white", "black"];
  const selectedTheme = allowedThemes.includes(theme) ? theme : "aurora";
  document.documentElement.dataset.theme = selectedTheme;
  themeSwatches.forEach((swatch) => {
    swatch.setAttribute("aria-pressed", String(swatch.dataset.themeChoice === selectedTheme));
  });
}

if (galaxyCanvas) {
  const context = galaxyCanvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointer = { x: 0, y: 0, active: false };
  const stars = [];

  function resizeGalaxy() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    galaxyCanvas.width = window.innerWidth * ratio;
    galaxyCanvas.height = window.innerHeight * ratio;
    galaxyCanvas.style.width = `${window.innerWidth}px`;
    galaxyCanvas.style.height = `${window.innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars.length = 0;
    const count = Math.min(520, Math.max(280, Math.floor(window.innerWidth * window.innerHeight / 2600)));
    for (let index = 0; index < count; index += 1) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 1.35 + .25,
        speed: Math.random() * .2 + .04,
        phase: Math.random() * Math.PI * 2,
        depth: Math.random() * .85 + .15
      });
    }
  }

  function drawGalaxy(time = 0) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    context.clearRect(0, 0, width, height);
    const glow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * .62);
    glow.addColorStop(0, "rgba(80, 164, 255, .08)");
    glow.addColorStop(.5, "rgba(115, 89, 210, .04)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    for (const star of stars) {
      const drift = reducedMotion ? 0 : Math.sin(time * .0004 + star.phase) * .7;
      if (!reducedMotion) star.y -= star.speed;
      if (star.y < -4) star.y = height + 4;
      let dx = 0;
      let dy = 0;
      if (pointer.active && !reducedMotion) {
        const distanceX = pointer.x - star.x;
        const distanceY = pointer.y - star.y;
        const distance = Math.max(Math.hypot(distanceX, distanceY), 1);
        const pull = Math.max(0, 1 - distance / 620) * (.035 + star.depth * .045);
        dx = distanceX / distance * pull * 12;
        dy = distanceY / distance * pull * 12;
        star.x += dx;
        star.y += dy;
        if (distance < 34) {
          star.x = Math.random() * width;
          star.y = Math.random() * height;
        }
      }
      const alpha = .42 + star.depth * .45 + (Math.sin(time * .002 + star.phase) + 1) * .08;
      context.beginPath();
      context.arc(star.x, star.y + drift, star.radius + (pointer.active ? star.depth * .35 : 0), 0, Math.PI * 2);
      context.fillStyle = `rgba(190, 235, 255, ${alpha})`;
      context.fill();
    }
    if (!reducedMotion) window.requestAnimationFrame(drawGalaxy);
  }

  window.addEventListener("resize", resizeGalaxy);
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
  }, { passive: true });
  window.addEventListener("pointerleave", () => { pointer.active = false; });
  resizeGalaxy();
  if (reducedMotion) drawGalaxy();
  else window.requestAnimationFrame(drawGalaxy);
}

emojiToggle.addEventListener("click", () => {
  emojiPicker.classList.toggle("hidden");
});

emojiPicker.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  messageInput.value += button.textContent;
  playSound("reaction");
  messageInput.focus();
});

leaveButton.addEventListener("click", () => {
  closeChatMenu();
  socket.disconnect();
  resetRoom();
});

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  currentName = nameInput.value.trim();
  if (!currentName) return;
  if (!socket.connected) socket.connect();
  socket.emit("join", { name: currentName });
});

composer.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text && !currentAttachment) return;
  socket.emit("send-message", { text, attachment: currentAttachment });
  messageInput.value = "";
  currentAttachment = null;
  preview.classList.add("hidden");
  preview.textContent = "";
  messageInput.focus();
});

voiceButton.addEventListener("pointerdown", async (event) => {
  event.preventDefault();
  recordingRequested = true;
  await startVoiceRecording();
});
voiceButton.addEventListener("pointerup", () => {
  recordingRequested = false;
  stopVoiceRecording();
});
voiceButton.addEventListener("pointercancel", () => {
  recordingRequested = false;
  cancelVoiceRecording();
});
window.addEventListener("pointerup", () => {
  recordingRequested = false;
  stopVoiceRecording();
});

async function startVoiceRecording() {
  if (recorder || !navigator.mediaDevices?.getUserMedia) {
    if (!navigator.mediaDevices?.getUserMedia) showVoiceError("Voice recording is not supported here.");
    return;
  }
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(recordingStream);
    recordingChunks = [];
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) recordingChunks.push(event.data);
    });
    recorder.addEventListener("stop", uploadVoiceRecording, { once: true });
    recorder.start();
    playSound("record");
    if (!recordingRequested) {
      stopVoiceRecording();
      return;
    }
    voiceButton.classList.add("recording");
    voiceButton.textContent = "●";
    voiceButton.setAttribute("aria-label", "Release to send voice message");
    preview.textContent = "Recording… release to send";
    preview.classList.remove("hidden");
  } catch (error) {
    showVoiceError(error.name === "NotAllowedError" ? "Microphone permission is required." : "Could not start recording.");
  }
}

function stopVoiceRecording() {
  if (!recorder || recorder.state === "inactive") return;
  recorder.stop();
  recordingStream?.getTracks().forEach((track) => track.stop());
  recordingStream = null;
  voiceButton.classList.remove("recording");
  voiceButton.setAttribute("aria-label", "Hold to record voice message");
}

function cancelVoiceRecording() {
  if (!recorder) return;
  recorder.removeEventListener("stop", uploadVoiceRecording);
  if (recorder.state !== "inactive") recorder.stop();
  recordingStream?.getTracks().forEach((track) => track.stop());
  recordingStream = null;
  recorder = null;
  recordingChunks = [];
  recordingRequested = false;
  voiceButton.classList.remove("recording");
  preview.classList.add("hidden");
  preview.textContent = "";
}

async function uploadVoiceRecording() {
  const activeRecorder = recorder;
  recorder = null;
  const blob = new Blob(recordingChunks, { type: activeRecorder.mimeType || "audio/webm" });
  recordingChunks = [];
  if (!blob.size) {
    showVoiceError("No voice audio was recorded.");
    return;
  }
  preview.textContent = "Uploading voice…";
  try {
    const formData = new FormData();
    formData.append("file", blob, `voice-${Date.now()}.webm`);
    const response = await fetch("/api/media", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Voice upload failed.");
    socket.emit("send-message", { attachment: result });
    preview.classList.add("hidden");
    preview.textContent = "";
  } catch (error) {
    showVoiceError(error.message);
  }
}

function showVoiceError(message) {
  preview.textContent = message;
  preview.classList.remove("hidden");
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    alert("Files must be 10 MB or smaller.");
    fileInput.value = "";
    return;
  }
  preview.textContent = `Uploading ${file.name}…`;
  preview.classList.remove("hidden");
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await fetch("/api/media", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Upload failed.");
    currentAttachment = result;
    preview.textContent = `Attached: ${result.name}`;
  } catch (error) {
    preview.textContent = error.message;
    currentAttachment = null;
  }
  fileInput.value = "";
});

socket.on("joined", ({ avatar }) => {
  playSound("join");
  currentAvatar = avatar;
  welcome.classList.add("hidden");
  chat.classList.remove("hidden");
  messageInput.focus();
});
socket.on("message", renderMessage);
socket.on("system-message", renderSystemMessage);
socket.on("presence", (count) => { online.textContent = count; });
socket.on("error-message", (message) => alert(message));
socket.on("disconnect", () => resetRoom());

function resetRoom() {
  messages.replaceChildren();
  messageInput.value = "";
  fileInput.value = "";
  nameInput.value = "";
  currentAttachment = null;
  currentName = "";
  currentAvatar = "";
  cancelVoiceRecording();
  emojiPicker.classList.add("hidden");
  preview.classList.add("hidden");
  preview.textContent = "";
  chat.classList.add("hidden");
  welcome.classList.remove("hidden");
  nameInput.focus();
}

function renderMessage(message) {
  playSound(message.name === currentName ? "send" : "receive");
  const isMine = message.name === currentName;
  const item = document.createElement("article");
  item.className = isMine ? "message mine" : "message";
  const initial = document.createElement("div");
  initial.className = "avatar";
  initial.textContent = message.avatar || message.name[0].toUpperCase();
  initial.title = `${message.name}'s avatar`;
  const content = document.createElement("div");
  content.className = "message-content";
  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.innerHTML = `<span class="message-name"></span><span class="message-time"></span>`;
  meta.querySelector(".message-name").textContent = message.name;
  meta.querySelector(".message-time").textContent = formatTime(message.createdAt);
  content.append(meta);
  if (message.text) {
    const text = document.createElement("p");
    text.className = "message-text";
    text.textContent = message.text;
    content.append(text);
  }
  if (message.attachment) {
    if (message.attachment.mimetype?.startsWith("audio/")) {
      const audio = document.createElement("audio");
      audio.className = "voice-message";
      audio.controls = true;
      audio.preload = "metadata";
      audio.src = message.attachment.url;
      content.append(audio);
    } else {
      const link = document.createElement("a");
      link.className = "attachment";
      link.href = message.attachment.url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = `↗ ${message.attachment.name}`;
      content.append(link);
    }
  }
  if (isMine) item.append(content, initial);
  else item.append(initial, content);
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
}

function renderSystemMessage(text) {
  playSound(/left|disconnected/i.test(text) ? "leave" : "join");
  const item = document.createElement("div");
  item.className = "system-message";
  item.textContent = text;
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
