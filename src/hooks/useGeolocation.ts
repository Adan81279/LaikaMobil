import { useState, useEffect } from 'react';
import wearableService from '../services/wearable.service';

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface VenueDistance {
  venueName: string;
  latitude: number;
  longitude: number;
  distance: number; // in meters
}

// Coordinate mappings for Laika Club venues
export const VENUES = [
  { name: 'Estadio Laika Arena', latitude: 19.3900, longitude: -99.1400 },
  { name: 'Foro Sol Monumental', latitude: 19.4030, longitude: -99.0960 },
  { name: 'Club Omnia Club', latitude: 19.4326, longitude: -99.1332 },
  { name: 'Centro de Exposiciones Laika Center', latitude: 19.4270, longitude: -99.1670 },
  { name: 'Arena Ciudad de México', latitude: 19.4975, longitude: -99.1825 },
];

/**
 * Calculate Haversine distance in meters between two coordinates
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeolocation() {
  const [currentCoords, setCurrentCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [venueDistances, setVenueDistances] = useState<VenueDistance[]>([]);
  const [closestVenue, setClosestVenue] = useState<VenueDistance | null>(null);

  // Default coordinate (Mexico City Downtown)
  const defaultCoords: Coords = { latitude: 19.4326, longitude: -99.1332 };

  useEffect(() => {
    let active = true;

    const initLocation = async () => {
      // Start foreground tracking
      await wearableService.startLocationUpdates((location) => {
        if (!active) return;
        const coords: Coords = {
          latitude: location.latitude,
          longitude: location.longitude,
        };
        updateLocationData(coords);
      });
    };

    initLocation();

    // Start background tracking as well
    wearableService.startBackgroundLocation();

    return () => {
      active = false;
      wearableService.stopLocationUpdates();
      wearableService.stopBackgroundLocation();
    };
  }, []);

  const updateLocationData = (coords: Coords) => {
    setCurrentCoords(coords);
    setLoading(false);

    // Calculate distance to all venues
    const distances: VenueDistance[] = VENUES.map((v) => {
      const dist = calculateDistance(coords.latitude, coords.longitude, v.latitude, v.longitude);
      return {
        venueName: v.name,
        latitude: v.latitude,
        longitude: v.longitude,
        distance: Math.round(dist),
      };
    }).sort((a, b) => a.distance - b.distance);

    setVenueDistances(distances);
    if (distances.length > 0) {
      setClosestVenue(distances[0]);
    }
  };

  /**
   * Simulate a specific coordinate to test distance checks
   */
  const simulateLocation = (latitude: number, longitude: number) => {
    console.log(`[useGeolocation-Simulator] Simulating GPS shift to: Lat=${latitude}, Lng=${longitude}`);
    updateLocationData({ latitude, longitude });
  };

  /**
   * Reset simulation and request real GPS coordinates
   */
  const resetToRealLocation = async () => {
    setLoading(true);
    await wearableService.startLocationUpdates((location) => {
      updateLocationData({
        latitude: location.latitude,
        longitude: location.longitude,
      });
    });
  };

  return {
    currentCoords: currentCoords || defaultCoords,
    loading,
    venueDistances,
    closestVenue,
    simulateLocation,
    resetToRealLocation,
  };
}
export default useGeolocation;
