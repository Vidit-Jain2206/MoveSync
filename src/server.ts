import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";

const pub = new Redis();
const sub = new Redis();

const app = createServer();
const io = new Server(app, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("a user connected");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
