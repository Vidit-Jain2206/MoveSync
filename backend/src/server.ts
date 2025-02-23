import { createServer } from "http";
import { Server } from "socket.io";
import { pub, sub } from "./config/redis";
import { connection } from "./connection";
import Order, { Location } from "./schema/Order";
import { SocketAddress } from "net";

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

        // check if user and driver with same orderId exists or not
        if (role === "driver") {
          const orderDetails = await Order.findOne({ orderId: orderId });
          console.log(orderDetails);
          if (!orderDetails) {
            socket.emit("error", "No order found for this orderId");
            return;
          }
          const sockets = await io.in(orderId).fetchSockets();
          const hasDriver = sockets.some((s) => s.data.role === "driver");
          if (hasDriver) {
            socket.emit("error", "Driver already exists in this room");
            return;
          }

          orderDetails.currentDriverLocation = location;
          orderDetails.driverId = id;
          await orderDetails.save();
          socket.join(orderId);
          socket.data.role = role;
          socket.data.orderId = orderId;
          // notify to user that driver has joined
          await pub.publish(
            `notification:${orderId}`,
            JSON.stringify({
              type: "DRIVER_JOINED",
              orderId: orderId,
              driverId: id,
              message: "Driver has joined",
              timestamp: Date.now(),
              driverLocation: location,
              userLocation: orderDetails.userLocation,
            })
          );
        }

        if (role === "user") {
          try {
            const newOrder = new Order({
              orderId: orderId,
              status: "pending",
              currentDriverLocation: null,
              driverId: null,
              userLocation: location,
              customerId: id,
            });
            await newOrder.save();
            sub.subscribe(`location:${orderId}`);
            sub.subscribe(`notification:${orderId}`);
            socket.join(orderId);
            socket.data.role = role;
            socket.data.orderId = orderId;
          } catch (error) {
            console.error("Error subscribing to location:", error);
            socket.emit("error", "Error subscribing to location");
            return;
          }
        }
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

      const orderDetails = await Order.findOne({ orderId: orderId }).select({
        orderId: true,
        userLocation: true,
        createdAt: true,
        updatedAt: true,
        driverId: true,
        currentDriverLocation: true,
      });

      if (
        orderDetails &&
        orderDetails?.userLocation.lat === location.lat &&
        orderDetails?.userLocation.lng === location.lng
      ) {
        // means driver reached the location
        await pub.publish(
          `notification:${orderId}`,
          JSON.stringify({
            type: "DRIVER_REACHED",
            orderId: orderId,
            message: "Driver has reached",
            timestamp: Date.now(),
          })
        );
        return;
        // socket.leave(orderId);
        // console.log(`Driver ${socket.id} left room: ${orderId}`);
      }

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
        // orderDetails.currentDriverLocation = location;
        // await orderDetails.save();
      } catch (err) {
        console.error("Redis publish error:", err);
        socket.emit("error", "Failed to update location");
      }
    } catch (error) {
      console.error("Error updating location:", error);
      socket.emit("error", "Error updating location");
    }
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

sub.on("message", async (channel, message) => {
  try {
    const channelName = channel.split(":")[0];
    const orderId = channel.split(":")[1];
    const data = JSON.parse(message);
    if (channelName === "notification") {
      if (data.type === "DRIVER_JOINED") {
        const sockets = await io.in(orderId).fetchSockets();
        sockets.forEach((socket) =>
          socket.emit("notification", {
            type: data.type,
            orderId: data.orderId,
            message: data.message,
            timestamp: data.timestamp,
            driverLocation: data.driverLocation,
            userLocation: data.userLocation,
          })
        );
      }

      if (data.type === "DRIVER_REACHED") {
        const sockets = (await io.in(orderId).fetchSockets()).filter(
          (socket) => socket.data.role === "user"
        );
        sockets.map((socket) => socket.emit("driver:reached", data));
      }
    }
    if (channelName === "location") {
      const sockets = (await io.in(orderId).fetchSockets()).filter(
        (socket) => socket.data.role === "user"
      );
      sockets.map((socket) => socket.emit("driver-location", data));
    }
  } catch (err) {
    console.error("Error processing Redis message:", err);
  }
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
