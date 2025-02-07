import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";

const pub = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

const sub = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

pub.on("error", (err) => {
  console.error("Redis Publisher Error:", err);
});

sub.on("error", (err) => {
  console.error("Redis Subscriber Error:", err);
});

const app = createServer();
const io = new Server(app, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("join-room", async (roomId: string, role: "driver" | "user") => {
    try {
      if (!roomId || !["driver", "user"].includes(role)) {
        socket.emit("error", "Invalid room ID or role");
        return;
      }

      // check if user and driver with same roomId exists or not
      if (role === "driver") {
        const sockets = await io.in(roomId).fetchSockets();
        const hasDriver = sockets.some((s) => s.data.role === "driver");
        if (hasDriver) {
          socket.emit("error", "Driver already exists in this room");
          return;
        }
      }
      socket.join(roomId);
      socket.data.role = role;
      socket.data.roomId = roomId;
      if (role === "user") {
        try {
          sub.subscribe(`location:${roomId}`);
        } catch (error) {
          console.error("Error subscribing to location:", error);
          socket.emit("error", "Error subscribing to location");
          return;
        }
      }
      socket.emit("joined-room", roomId);
      console.log(`${role} joined room: ${roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      socket.emit("error", "Error joining room");
    }
  });

  socket.on(
    "update-location",
    async (location: { lat: number; lng: number }) => {
      try {
        if (
          !location ||
          typeof location.lat !== "number" ||
          typeof location.lng !== "number"
        ) {
          socket.emit("error", "Invalid location data");
          return;
        }
        const roomId = socket.data.roomId;
        if (!roomId || socket.data.role !== "driver") return;

        // Publish to Redis
        try {
          await pub.publish(
            `location:${roomId}`,
            JSON.stringify({
              location,
              timestamp: Date.now(),
              serverId: process.env.SERVER_ID, // Useful for debugging
            })
          );
        } catch (err) {
          console.error("Redis publish error:", err);
          socket.emit("error", "Failed to update location");
        }
      } catch (error) {
        console.error("Error updating location:", error);
        socket.emit("error", "Error updating location");
      }
    }
  );

  socket.on("disconnect", async () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.leave(roomId);
    if (socket.data.role === "user") {
      try {
        await sub.unsubscribe(`location:${roomId}`);
      } catch (err) {
        console.error("Redis unsubscribe error:", err);
      }
    }
    io.to(roomId).emit("user-disconnected", {
      role: socket.data.role,
      timestamp: Date.now(),
    });

    console.log(`${socket.data.role} left room: ${roomId}`);
    console.log(`${socket.data.role} left room: ${roomId}`);
  });
});

sub.on("message", (channel, message) => {
  try {
    const roomId = channel.split(":")[1];
    const data = JSON.parse(message);
    io.to(roomId).emit("driver-location", data);
  } catch (err) {
    console.error("Error processing Redis message:", err);
  }
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
