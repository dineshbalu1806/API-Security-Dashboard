const jwt = require("jsonwebtoken");
const Redis = require("ioredis");
const { Server } = require("socket.io");
const Scan = require("../models/Scan");
const User = require("../models/User");
const { connection } = require("../queue/scanQueue");

const progressChannel = "api-security-scan-progress";

const initScanProgress = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });
  const subscriber = new Redis({ ...connection, maxRetriesPerRequest: null });

  subscriber.on("message", (channel, message) => {
    if (channel !== progressChannel) return;
    try {
      const event = JSON.parse(message);
      const room = io.to(`scan:${event.scanId}`);
      if (event.type === "state") room.emit("scan:state", event);
      else room.emit("scan:progress", event);
    } catch (error) {
      console.error("Unable to relay scan progress event", error);
    }
  });
  subscriber.on("error", (error) => console.error("Scan progress Redis error", error));
  subscriber.subscribe(progressChannel).catch((error) => {
    console.error("Unable to subscribe to scan progress updates", error);
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("Authentication required");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) throw new Error("User not found");
      socket.data.userId = user._id.toString();
      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("scan:join", async (scanId, acknowledge) => {
      const respond = typeof acknowledge === "function" ? acknowledge : () => {};
      try {
        if (!/^[a-f\d]{24}$/i.test(scanId || "")) {
          return respond({ success: false, message: "Invalid scan ID" });
        }
        const scan = await Scan.findOne({ _id: scanId, userId: socket.data.userId });
        if (!scan) return respond({ success: false, message: "Scan not found" });

        socket.join(`scan:${scanId}`);
        socket.emit("scan:state", {
          scanId,
          status: scan.status,
          moduleProgress: scan.moduleProgress,
        });
        respond({ success: true });
      } catch (error) {
        respond({ success: false, message: "Unable to subscribe to scan progress" });
      }
    });
  });

  return { io, close: () => subscriber.quit() };
};

module.exports = { initScanProgress };