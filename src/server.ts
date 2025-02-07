import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";

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
  });

  socket.on("update-location", (location: { lat: number; lng: number }) => {
    console.log("update-location", location);
    const roomId = socket.data.roomId;
    console.log(roomId);
    // if (!roomId || socket.data.role !== "driver") return;
    socket.to(roomId).emit("driver-location", location);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.leave(roomId);

    console.log(`${socket.data.role} left room: ${roomId}`);
  });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
