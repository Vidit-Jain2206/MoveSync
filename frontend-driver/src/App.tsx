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
  const [orderId, setOrderId] = useState("");
  const [socket, setSocket] = useState<Socket>();

  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.geolocation.getCurrentPosition) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          console.log(
            new Date().toISOString(),
            position.coords.latitude,
            position.coords.longitude
          );
          setDriverLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [driverLocation]);

  // useEffect(() => {
  //   if (socket && orderId)
  //     socket.emit("update-location", "213124", driverLocation); // replace with actual driver id
  // }, [driverLocation, orderId, socket]);

  useEffect(() => {
    const socket = io(ENDPOINT);
    setSocket(socket);
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && orderId) {
      socket.on("notification", (data) => {
        console.log(data);
        if (data.type === "DRIVER_JOINED") {
          setUserLocation(data.userLocation);
          // alert(data.message);
        }
      });
    }
  });

  useEffect(() => {
    if (socket) {
      socket.on("error", (error) => {
        console.log(error);
      });
    }
  });

  useEffect(() => {
    if (socket && orderId) {
      socket.on("joined:room", (location) => {
        setUserLocation(location);
      });
    }
  });

  const handleJoinRoom = async () => {
    try {
      if (socket) {
        socket.emit("join-room", orderId, "driver", "12341431", driverLocation);
        // socket.emit("driver:joined", orderId, "213124", driverLocation);
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
          <div className="flex flex-row gap-2 mt-2">
            <input
              className="border-2 border-[#403d71] w-[85%] px-4 focus:outline-none"
              type="number"
              placeholder="Enter orderId"
              value={orderId}
              min={0}
              onChange={(e) => setOrderId(e.target.value)}
            />
            <button
              onClick={handleJoinRoom}
              className="w-[15%] cursor-pointer border-2 border-[#403d71] px-5 py-2 max-w-[300px] mx-auto hover:bg-[#403d71] hover:text-[#8da4f1]"
            >
              Join Room
            </button>
          </div>
        </div>

        {/* user location */}
        <div className="w-full mx-auto mt-[2rem] flex flex-row gap-2">
          <div className="w-[50%] border border-[#8da4f1]  rounded-md shadow-md p-4">
            <h2 className="text-3xl font-bold">Your Location</h2>
            <div className="    mt-2">
              <p>Latitude: {driverLocation.lat}</p>
              <p>Longitude: {driverLocation.lng}</p>
            </div>
          </div>
          <div className="w-[50%] border border-[#8da4f1] rounded-md shadow-md p-4">
            <h2 className="text-3xl font-bold">User Location</h2>
            <div className=" mt-2  ">
              <p>Latitude: {userLocation.lat}</p>
              <p>Longitude: {userLocation.lng}</p>
            </div>
          </div>
        </div>
        <div className="w-full max-h-[400px] mt-[2rem] border border-[#8da4f1] rounded-md shadow-md">
          <div className="w-full h-full">
            {userLocation && (
              <MapComponent
                receivedCoordinates={userLocation}
                coordinates={driverLocation}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
