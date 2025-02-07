import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";

const pub = new Redis({
  host: "localhost",
  port: 6379,
});
const sub = new Redis({
  host: "localhost",
  port: 6379,
});

const app = createServer();
const io = new Server(app, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("join-room", (roomId: string, role: "driver" | "user") => {
    socket.join(roomId);
    socket.data.role = role;
    socket.data.roomId = roomId;
    console.log(`${role} joined room: ${roomId}`);
    if (role === "user") {
      sub.subscribe(`location:${roomId}`);
    }
  });

  socket.on("update-location", (location: { lat: number; lng: number }) => {
    const roomId = socket.data.roomId;
    if (!roomId || socket.data.role !== "driver") return;

    // Publish to Redis
    pub.publish(
      `location:${roomId}`,
      JSON.stringify({
        location,
        timestamp: Date.now(),
      })
    );
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.leave(roomId);
    if (socket.data.role === "user") {
      sub.unsubscribe(`location:${roomId}`);
    }
    console.log(`${socket.data.role} left room: ${roomId}`);
  });
});

sub.on("message", (channel, message) => {
  const roomId = channel.split(":")[1];
  io.to(roomId).emit("driver-location", JSON.parse(message));
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
