import { useEffect, useState } from "react";
import "./App.css";
import io, { Socket } from "socket.io-client";

const ENDPOINT = "http://localhost:3001";
interface Location {
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
      socket.on("driver-location", (location: Location) => {
        console.log("driver-location", location);
        setDriverLocation(location);
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
      {/* navbar */}
      <div className="w-full p-4 bg-[#403d71] text-[#8da4f1] font-bold text-3xl">
        <h1 className="text-center">Welcome to Movesync</h1>
      </div>

      {/* mainsection */}
      <div className="w-[95%] md:w-[80%] lg:w-[60%] mx-auto mt-[2rem]">
        {/* room details*/}
        <div className="w-full mx-auto flex flex-col">
          <h1 className="text-3xl font-bold">Join a room</h1>
          <button
            onClick={handleJoinRoom}
            className="cursor-pointer border-2 border-[#403d71] px-5 py-2 max-w-[300px] mx-auto hover:bg-[#403d71] hover:text-[#8da4f1]"
          >
            Generate OrderId
          </button>
          {orderId && (
            <div className="border-[1px solid #8da4f1] p-4 rounded-md shadow-md">
              <h2 className="text-2xl font-bold">Room ID: {orderId}</h2>
              <p>
                Please wait for your driver to join this room. You can use the
                provided room ID to find your driver on the app.
              </p>
            </div>
          )}
        </div>

        {/* user location */}
        <div className="w-full mx-auto mt-[2rem]">
          <h2 className="text-3xl font-bold">Your Location</h2>
          <div className="border-[1px solid #8da4f1] p-4 rounded-md shadow-md">
            <p>Latitude: {userLocation.lat}</p>
            <p>Longitude: {userLocation.lng}</p>
          </div>
          <h2 className="text-3xl font-bold">Driver Location</h2>
          <div className="border-[1px solid #8da4f1] p-4 rounded-md shadow-md">
            <p>Latitude: {driverLocation.lat}</p>
            <p>Longitude: {driverLocation.lng}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
