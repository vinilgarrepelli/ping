import crypto from "node:crypto";
import express from "express";
import http from "node:http";
import multer from "multer";
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = Number(process.env.PORT) || 3000;
const maxMessageLength = 2_000;
const maxFileSize = 10 * 1024 * 1024;
const maxE2eeFieldLength = 128;
const maxE2eeCiphertextLength = 256 * 1024;
const mediaTtlMs = 60 * 60 * 1000;
const mediaBurstLimit = 5;
const mediaCooldownMs = 5 * 60 * 1000;
const reportsRequired = 3;
const messages = [];
const media = new Map();
const reports = new Map();
const avatars = ["🌙", "🦊", "🐼", "🪐", "🦋", "🐸", "🌻", "🐙", "🍄", "🦄", "🐨", "🚀"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 1 }
});

app.use(express.static("public"));
app.use(express.json({ limit: "32kb" }));

app.get("/api/status", (_req, res) => {
  res.json({ online: io.engine.clientsCount, messages: messages.length });
});

app.post("/api/media", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Choose a file to upload." });
  }

  const id = crypto.randomUUID();
  media.set(id, {
    buffer: req.file.buffer,
    mimetype: req.file.mimetype || "application/octet-stream",
    name: req.file.originalname || "shared-file",
    createdAt: Date.now()
  });

  return res.json({
    id,
    name: req.file.originalname || "shared-file",
    size: req.file.size,
    mimetype: req.file.mimetype || "application/octet-stream",
    url: `/media/${id}`
  });
});

app.get("/media/:id", (req, res) => {
  const item = media.get(req.params.id);
  if (!item) {
    return res.status(404).send("This temporary file is no longer available.");
  }

  res.set({
    "Content-Type": item.mimetype,
    "Content-Disposition": `inline; filename="${item.name.replace(/["\\\r\n]/g, "_")}"`
  });
  return res.send(item.buffer);
});

app.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Files must be 10 MB or smaller."
      : "The file could not be uploaded.";
    return res.status(400).json({ error: message });
  }
  return next(error);
});

io.on("connection", (socket) => {
  io.emit("presence", io.engine.clientsCount);

  // This surface deliberately has no relationship to the plaintext web chat.
  socket.on("e2ee:join", (payload, acknowledge) => {
    const version = payload?.version;
    const roomId = payload?.roomId;
    const deviceId = payload?.deviceId;
    if (
      version !== 1 ||
      !isBoundedE2eeString(roomId) ||
      !isBoundedE2eeString(deviceId)
    ) {
      acknowledgeE2ee(acknowledge, { ok: false, error: "Invalid E2EE join." });
      return;
    }

    if (socket.data.e2eeRoom) socket.leave(socket.data.e2eeRoom);
    socket.join(`e2ee:${roomId}`);
    socket.data.e2eeRoom = roomId;
    socket.data.e2eeDeviceId = deviceId;
    acknowledgeE2ee(acknowledge, { ok: true, version, roomId });
  });

  socket.on("e2ee:envelope", (payload, acknowledge) => {
    if (!socket.data.e2eeRoom || !isValidE2eeEnvelope(payload)) {
      acknowledgeE2ee(acknowledge, { ok: false, error: "Invalid E2EE envelope." });
      return;
    }
    if (
      payload.roomId !== socket.data.e2eeRoom ||
      payload.senderId !== socket.data.e2eeDeviceId
    ) {
      acknowledgeE2ee(acknowledge, { ok: false, error: "Envelope routing mismatch." });
      return;
    }

    // Do not decode, rewrite, persist, or inspect ciphertext. The exact object
    // supplied by the client is fanned out to the other devices in its room.
    socket.to(`e2ee:${socket.data.e2eeRoom}`).emit("e2ee:envelope", payload);
    acknowledgeE2ee(acknowledge, { ok: true });
  });

  socket.on("join", (payload) => {
    const name = sanitizeName(payload?.name);
    if (!name) {
      socket.emit("error-message", "Please choose a display name.");
      return;
    }
    socket.data.name = name;
    socket.data.mediaBurst = { count: 0, blockedUntil: 0 };
    const usedAvatars = new Set(
      [...io.sockets.sockets.values()].map((client) => client.data.avatar).filter(Boolean)
    );
    socket.data.avatar = avatars.find((avatar) => !usedAvatars.has(avatar)) || avatars[socket.id.length % avatars.length];
    socket.emit("joined", { name, avatar: socket.data.avatar });
    io.emit("system-message", `${name} joined the chat`);
    io.emit("presence", io.engine.clientsCount);
  });

  socket.on("send-message", (payload) => {
    if (!socket.data.name) return;
    const text = typeof payload?.text === "string" ? payload.text.trim() : "";
    const attachment = normalizeAttachment(payload?.attachment);
    if (!text && !attachment) return;
    if (attachment) {
      const now = Date.now();
      const burst = socket.data.mediaBurst || { count: 0, blockedUntil: 0 };
      if (burst.blockedUntil > now) {
        socket.emit("error-message", `Media sharing is paused for ${Math.ceil((burst.blockedUntil - now) / 60000)} minutes.`);
        return;
      }
      if (burst.blockedUntil && burst.blockedUntil <= now) {
        burst.count = 0;
        burst.blockedUntil = 0;
      }
      burst.count += 1;
      if (burst.count >= mediaBurstLimit) burst.blockedUntil = now + mediaCooldownMs;
      socket.data.mediaBurst = burst;
    }

    const message = {
      id: crypto.randomUUID(),
      name: socket.data.name,
      avatar: socket.data.avatar,
      text: text.slice(0, maxMessageLength),
      attachment,
      createdAt: new Date().toISOString()
    };
    messages.push(message);
    if (messages.length > 200) messages.shift();
    io.emit("message", message);
  });

  socket.on("report-user", (payload) => {
    const targetName = sanitizeName(payload?.name);
    if (!socket.data.name || !targetName || targetName === socket.data.name) {
      socket.emit("error-message", "Choose another connected username to report.");
      return;
    }
    const targetSockets = [...io.sockets.sockets.values()]
      .filter((client) => client.data.name === targetName);
    if (!targetSockets.length) {
      socket.emit("error-message", "That username is not currently in the room.");
      return;
    }
    let reporters = reports.get(targetName);
    if (!reporters) {
      reporters = new Set();
      reports.set(targetName, reporters);
    }
    reporters.add(socket.id);
    if (reporters.size < reportsRequired) {
      io.emit("system-message", `${reporters.size}/${reportsRequired} reports received for ${targetName}`);
      return;
    }
    reports.delete(targetName);
    for (const targetSocket of targetSockets) {
      targetSocket.emit("error-message", "You were removed from the room after multiple reports.");
      targetSocket.disconnect(true);
    }
    io.emit("system-message", `${targetName} was removed from the room after multiple reports`);
  });

  socket.on("disconnect", () => {
    for (const reporters of reports.values()) reporters.delete(socket.id);
    for (const [targetName, reporters] of reports) {
      if (!reporters.size) reports.delete(targetName);
    }
    if (socket.data.name) {
      socket.broadcast.emit("system-message", `${socket.data.name} left the chat`);
    }
    if (io.engine.clientsCount === 0) {
      messages.length = 0;
    }
    io.emit("presence", io.engine.clientsCount);
  });
});

setInterval(() => {
  const expiry = Date.now() - mediaTtlMs;
  for (const [id, item] of media) {
    if (item.createdAt < expiry) media.delete(id);
  }
}, 5 * 60 * 1000).unref();

function sanitizeName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 32) : "";
}

function normalizeAttachment(value) {
  if (!value || typeof value !== "object" || typeof value.url !== "string") return null;
  const id = value.url.match(/^\/media\/([a-f0-9-]+)$/i)?.[1];
  if (!id || !media.has(id)) return null;
  const item = media.get(id);
  return { id, name: item.name, size: item.buffer.length, mimetype: item.mimetype, url: `/media/${id}` };
}

function isBoundedE2eeString(value) {
  return typeof value === "string" && value.length > 0 && value.length <= maxE2eeFieldLength;
}

function isValidE2eeEnvelope(value) {
  const allowedKeys = new Set([
    "version",
    "roomId",
    "senderId",
    "messageId",
    "ciphertext",
    "aad"
  ]);
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => allowedKeys.has(key)) &&
    value.version === 1 &&
    isBoundedE2eeString(value.roomId) &&
    isBoundedE2eeString(value.senderId) &&
    isBoundedE2eeString(value.messageId) &&
    typeof value.ciphertext === "string" &&
    value.ciphertext.length > 0 &&
    value.ciphertext.length <= maxE2eeCiphertextLength &&
    (!("aad" in value) || (
      typeof value.aad === "string" && value.aad.length <= maxE2eeCiphertextLength
    ))
  );
}

function acknowledgeE2ee(acknowledge, result) {
  if (typeof acknowledge === "function") acknowledge(result);
}

app.use((_req, res) => res.sendFile("index.html", { root: "public" }));

server.listen(port, () => {
  console.log(`Temporary chat running at http://localhost:${port}`);
});
