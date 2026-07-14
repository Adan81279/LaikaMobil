import { useState, useEffect, useRef } from 'react';
import wearableService from '../services/wearable.service';

export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

export function useAccelerometer() {
  const [data, setData] = useState<AccelerometerData>({ x: 0, y: 0, z: 0 });
  const [isWristRaised, setIsWristRaised] = useState(false);
  const [isFallDetected, setIsFallDetected] = useState(false);
  const [gestureType, setGestureType] = useState<'none' | 'wrist-raise' | 'fall'>('none');

  const lastUpdate = useRef<number>(Date.now());
  const isWristRaisedRef = useRef(false);
  const isFallDetectedRef = useRef(false);
  const accelHistory = useRef<Array<{ x: number; y: number; z: number }>>([]);

  // Fall detection thresholds
  const impactDetected = useRef<boolean>(false);
  const impactTime = useRef<number>(0);

  useEffect(() => {
    wearableService.startAccelerometer((accelData) => {
      setData(accelData);
      const now = Date.now();
      if (now - lastUpdate.current < 80) return; // limit processing rate slightly to collect stable samples
      lastUpdate.current = now;

      const { x, y, z } = accelData;
      // Calculate total acceleration magnitude (in Gs, approx 1G at rest)
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Add to sliding window history (15 samples, ~1.2 seconds of movement tracking)
      accelHistory.current.push({ x, y, z });
      if (accelHistory.current.length > 15) {
        accelHistory.current.shift();
      }

      // Calculate statistical variance of X, Y, and Z axes
      let totalVariance = 1.0; // Default to moving/unstable
      if (accelHistory.current.length >= 10) {
        const len = accelHistory.current.length;
        let sumX = 0, sumY = 0, sumZ = 0;
        accelHistory.current.forEach(h => {
          sumX += h.x;
          sumY += h.y;
          sumZ += h.z;
        });
        const meanX = sumX / len;
        const meanY = sumY / len;
        const meanZ = sumZ / len;

        let varSum = 0;
        accelHistory.current.forEach(h => {
          varSum += Math.pow(h.x - meanX, 2) + Math.pow(h.y - meanY, 2) + Math.pow(h.z - meanZ, 2);
        });
        totalVariance = varSum / len;
      }

      // 1. Wrist Raise Gesture Detection (unchanged, y-axis tilt)
      if (y > 0.65 && Math.abs(x) < 0.5 && !isWristRaisedRef.current && !isFallDetectedRef.current) {
        isWristRaisedRef.current = true;
        setIsWristRaised(true);
        setGestureType('wrist-raise');
        console.log('[useAccelerometer] Gesture detected: WRIST RAISE');
        
        // Auto reset after 3 seconds
        setTimeout(() => {
          isWristRaisedRef.current = false;
          setIsWristRaised(false);
          setGestureType('none');
        }, 3000);
      }

      // 2. Watch Dropped From Wrist Detection
      // Impact phase: Either a heavy impact spike (>3.0G) or freefall (<0.35G)
      if ((magnitude > 3.0 || magnitude < 0.35) && !impactDetected.current && !isFallDetectedRef.current) {
        impactDetected.current = true;
        impactTime.current = now;
        console.log('[useAccelerometer] Watch drop/impact candidate detected. Mag:', magnitude.toFixed(2));
      }

      // Stillness validation phase: 1 to 3.5 seconds after impact, 
      // the watch must remain absolutely stationary (totalVariance < 0.008) on the floor/ground.
      // Hand movements/clapping/dancing during concerts will show totalVariance > 0.05.
      if (impactDetected.current && now - impactTime.current > 1000 && now - impactTime.current < 3500) {
        if (totalVariance < 0.008) {
          impactDetected.current = false;
          isFallDetectedRef.current = true;
          setIsFallDetected(true);
          setGestureType('fall');
          console.log('[useAccelerometer] WATCH DROP DETECTED: Impact followed by absolute stillness. Variance:', totalVariance.toFixed(6));

          // Auto reset after 15 seconds to allow strobe light to guide finding it
          setTimeout(() => {
            isFallDetectedRef.current = false;
            setIsFallDetected(false);
            setGestureType('none');
          }, 15000);
        }
      }

      // Reset impact state if too much time passed without absolute stillness stabilization
      if (impactDetected.current && now - impactTime.current >= 3500) {
        impactDetected.current = false;
        console.log('[useAccelerometer] Drop detection reset: Stillness verification timed out.');
      }
    });

    return () => {
      wearableService.stopAccelerometer();
    };
  }, []);

  /**
   * Helper to manually simulate wrist raise in mock/developer mode
   */
  const simulateWristRaise = () => {
    if (isWristRaised) return;
    setIsWristRaised(true);
    setGestureType('wrist-raise');
    console.log('[useAccelerometer-Simulator] Simulating Wrist Raise gesture.');
    setTimeout(() => {
      setIsWristRaised(false);
      setGestureType('none');
    }, 4000);
  };

  /**
   * Helper to manually simulate a fall in mock/developer mode
   */
  const simulateFall = () => {
    if (isFallDetected) return;
    setIsFallDetected(true);
    setGestureType('fall');
    console.log('[useAccelerometer-Simulator] Simulating Fall event.');
    setTimeout(() => {
      setIsFallDetected(false);
      setGestureType('none');
    }, 8000);
  };

  return {
    data,
    isWristRaised,
    isFallDetected,
    gestureType,
    simulateWristRaise,
    simulateFall,
  };
}
export default useAccelerometer;
