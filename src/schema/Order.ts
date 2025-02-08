import mongoose from "mongoose";

export interface Location {
  lat: number;
  lng: number;
}

// Create a mongoose schema for Location
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
); // _id: false prevents MongoDB from creating IDs for subdocuments

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
  },
  driverId: {
    type: String,
    required: true,
  },
  customerId: {
    type: String,
    required: true,
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
    type: locationSchema, // Single location for user
    required: true,
  },
  currentDriverLocation: {
    type: locationSchema, // Array of locations for driver
    required: true,
  },
});

// Create TypeScript interface for the Order document
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
