import { useEffect, useState } from "react";
import "./App.css";

import io, { Socket } from "socket.io-client";
import { MapComponent } from "./MapComponent";

const ENDPOINT = "http://localhost:3001";
export interface Location {
  lat: number;
  lng: number;
}
function App() {
  const [userLocation, setUserLocation] = useState<Location>({
    lat: 0,
    lng: 0,
  });
  const [driverLocation, setDriverLocation] = useState<Location>({
    lat: 0,
    lng: 0,
  });
  const [isDriverJoined, setIsDriverJoined] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [socket, setSocket] = useState<Socket>();

  useEffect(() => {
    if (navigator.geolocation.getCurrentPosition) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      });
    }
  }, []);

  useEffect(() => {
    const socket = io(ENDPOINT);
    setSocket(socket);
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && orderId) {
      // socket.on("driver-location", (location) => {
      //   console.log("driver-location", location);
      //   setDriverLocation(location.location);
      // });

      socket.on("notification", (data) => {
        console.log(data);
        if (data.type === "DRIVER_JOINED") {
          setIsDriverJoined(true);
          setDriverLocation(data.driverLocation);
          // alert(data.message);
        }
      });

      socket.on("driver:reached", (data) => {
        console.log("driver:reached", data);
      });
    }
  });

  const handleJoinRoom = async () => {
    try {
      if (socket) {
        const orderId = Math.floor(Math.random() * 10000000).toString();
        socket.emit("join-room", orderId, "user", "12341431", userLocation);
        setOrderId(orderId);
      }
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#8da4f1]">
      {/* Navbar */}
      <div className="w-full p-4 bg-[#403d71] text-[#8da4f1] font-bold text-3xl">
        <h1 className="text-center">Welcome to Movesync</h1>
      </div>

      {/* Main Section */}
      <div className="w-[95%] md:w-[80%] lg:w-[60%] mx-auto mt-[2rem]">
        {/* Room Details */}
        <div className="w-full mx-auto flex flex-col">
          <h1 className="text-3xl font-bold">Join a room</h1>
          <button
            onClick={handleJoinRoom}
            className="cursor-pointer border-2 border-[#403d71] px-5 py-2 max-w-[300px] mx-auto hover:bg-[#403d71] hover:text-[#8da4f1]"
          >
            Generate OrderId
          </button>
          {orderId && (
            <div className="border border-[#8da4f1] p-4 rounded-md shadow-md">
              <h2 className="text-2xl font-bold">Room ID: {orderId}</h2>
              {!isDriverJoined && (
                <p className="mt-2">
                  Please wait for your driver to join this room.
                </p>
              )}
            </div>
          )}
        </div>

        {/* User Location */}
        <div className="w-full mx-auto mt-[2rem] flex flex-row gap-2">
          <div className="w-[50%] border border-[#8da4f1]  rounded-md shadow-md p-4">
            <h2 className="text-3xl font-bold">Your Location</h2>
            <div className="    mt-2">
              <p>Latitude: {userLocation.lat}</p>
              <p>Longitude: {userLocation.lng}</p>
            </div>
          </div>
          <div className="w-[50%] border border-[#8da4f1] rounded-md shadow-md p-4">
            <h2 className="text-3xl font-bold">Driver Location</h2>
            <div className=" mt-2  ">
              <p>Latitude: {driverLocation.lat}</p>
              <p>Longitude: {driverLocation.lng}</p>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="w-full max-h-[400px] mt-[2rem] border border-[#8da4f1] rounded-md shadow-md">
          <div className="w-full h-full">
            {userLocation && (
              <MapComponent
                receivedCoordinates={driverLocation}
                coordinates={userLocation}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

// Custom Marker Icons
