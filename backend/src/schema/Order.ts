import mongoose from "mongoose";

export interface Location {
  lat: number;
  lng: number;
}

const locationSchema = new mongoose.Schema(
  {
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
  },
  driverId: {
    type: String,
    required: false,
  },
  customerId: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  userLocation: {
    type: locationSchema,
    required: false,
  },
  currentDriverLocation: {
    type: locationSchema,
    required: false,
  },
});

export interface IOrder extends mongoose.Document {
  orderId: string;
  driverId: string;
  customerId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  userLocation: Location;
  currentDriverLocation: Location;
}

const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
