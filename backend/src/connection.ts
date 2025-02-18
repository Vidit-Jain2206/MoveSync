import mongoose from "mongoose";

export const connection = () => {
  mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/");

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("connected", () => {
    console.log("MongoDB connected");
  });
};
