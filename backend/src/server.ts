import { createServer } from "http";
import { Server } from "socket.io";
import { pub, sub } from "./config/redis";
import { connection } from "./connection";
import Order, { Location } from "./schema/Order";

connection();

const app = createServer();
const io = new Server(app, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on(
    "join-room",
    async (
      orderId: string,
      role: "driver" | "user",
      id: string,
      location: Location
    ) => {
      try {
        if (!orderId || !["driver", "user"].includes(role)) {
          socket.emit("error", "Invalid room ID or role");
          return;
        }

        const newOrder = new Order({
          orderId: orderId,
          status: "pending",
        });

        // check if user and driver with same orderId exists or not
        if (role === "driver") {
          const sockets = await io.in(orderId).fetchSockets();
          const hasDriver = sockets.some((s) => s.data.role === "driver");
          if (hasDriver) {
            socket.emit("error", "Driver already exists in this room");
            return;
          }
          newOrder.currentDriverLocation = location;
          newOrder.driverId = id;
          await newOrder.save();
        }
        socket.join(orderId);
        socket.data.role = role;
        socket.data.orderId = orderId;
        if (role === "user") {
          try {
            newOrder.userLocation = location;
            newOrder.customerId = id;
            await newOrder.save();
            sub.subscribe(`location:${orderId}`);
            sub.subscribe(`notification:${orderId}`);
          } catch (error) {
            console.error("Error subscribing to location:", error);
            socket.emit("error", "Error subscribing to location");
            return;
          }
        }
        socket.emit("joined-room", orderId);
        console.log(`${role} joined room: ${orderId}`);
      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("error", "Error joining room");
      }
    }
  );

  socket.on("update-location", async (driverId: string, location: Location) => {
    try {
      if (
        !location ||
        typeof location.lat !== "number" ||
        typeof location.lng !== "number"
      ) {
        socket.emit("error", "Invalid location data");
        return;
      }
      const orderId = socket.data.orderId;
      if (!orderId || socket.data.role !== "driver") return;

      // Publish to Redis
      try {
        await pub.publish(
          `location:${orderId}`,
          JSON.stringify({
            location,
            timestamp: Date.now(),
            serverId: process.env.SERVER_ID, // Useful for debugging
          })
        );

        // add location to redis with expiry time 5 minutes
        await pub.setex(
          `driver:${driverId}:current`,
          300, // 5 minutes TTL
          JSON.stringify({
            location,
            timestamp: Date.now(),
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
  });

  socket.on("driver:joined", async (orderId, driverId, driverLocation) => {
    // send notification to user that driver has joined
    await pub.publish(
      `notification:${orderId}`,
      JSON.stringify({
        type: "DRIVER_JOINED",
        orderId: orderId,
        driverId: driverId,
        message: "Driver has joined",
        timestamp: Date.now(),
        driverLocation: driverLocation,
      })
    );
    console.log(`Driver ${driverId} joined room: ${orderId}`);
  });

  // driver reached
  socket.on("driver:reached", async (orderId) => {
    // send notification to user that driver has reached
    await pub.publish(
      `notification:${orderId}`,
      JSON.stringify({
        type: "DRIVER_REACHED",
        orderId: orderId,
        message: "Driver has reached",
        timestamp: Date.now(),
      })
    );
    socket.leave(orderId);
    console.log(`Driver ${socket.id} left room: ${orderId}`);
  });

  socket.on("disconnect", async () => {
    const orderId = socket.data.orderId;
    if (!orderId) return;
    socket.leave(orderId);
    if (socket.data.role === "user") {
      try {
        await sub.unsubscribe(`location:${orderId}`);
      } catch (err) {
        console.error("Redis unsubscribe error:", err);
      }
    }
    io.to(orderId).emit("user-disconnected", {
      role: socket.data.role,
      timestamp: Date.now(),
    });

    console.log(`${socket.data.role} left room: ${orderId}`);
    console.log(`${socket.data.role} left room: ${orderId}`);
  });
});

sub.on("message", (channel, message) => {
  try {
    const channelName = channel.split(":")[0];
    const orderId = channel.split(":")[1];
    const data = JSON.parse(message);
    if (channelName === "notifications") {
      io.to(orderId).emit("notification", {
        type: data.type,
        orderId: data.orderId,
        message: data.message,
        timestamp: data.timestamp,
        driverLocation: data.driverLocation,
      });
    }
    if (channelName === "location") {
      io.to(orderId).emit("driver-location", data);
    }
  } catch (err) {
    console.error("Error processing Redis message:", err);
  }
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
