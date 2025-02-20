import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Location } from "./App";

const userIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const otherIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-red.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapComponentProps {
  coordinates: Location;
  receivedCoordinates: Location;
}

export const MapComponent = ({
  coordinates,
  receivedCoordinates,
}: MapComponentProps) => {
  if (!coordinates.lat || !coordinates.lng) {
    return <p>Loading your location...</p>;
  }

  return (
    <MapContainer
      center={[coordinates.lat, coordinates.lng]}
      zoom={13}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* User's Marker */}
      <Marker position={[coordinates.lat, coordinates.lng]} icon={userIcon}>
        <Popup>Your Location</Popup>
      </Marker>

      {/* Other Users' Markers */}
      <Marker
        position={[receivedCoordinates.lat, receivedCoordinates.lng]}
        icon={otherIcon}
      >
        <Popup>Other User's Location</Popup>
      </Marker>
    </MapContainer>
  );
};
