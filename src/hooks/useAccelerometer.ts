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

  // Fall detection thresholds
  const impactDetected = useRef<boolean>(false);
  const impactTime = useRef<number>(0);

  useEffect(() => {
    wearableService.startAccelerometer((accelData) => {
      setData(accelData);
      const now = Date.now();
      if (now - lastUpdate.current < 100) return; // limit processing rate
      lastUpdate.current = now;

      const { x, y, z } = accelData;
      // Calculate total acceleration magnitude (in Gs, approx 1G at rest)
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // 1. Wrist Raise Gesture Detection
      // A wrist-raise typically involves rotation + lifting, showing Y value spike & stabilization
      // Let's check: Y-axis > 0.6G and Z-axis orientation typical for looking at a screen
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

      // 2. Fall Detection Logic
      // Threshold for impact is around 2.5G - 3G
      if (magnitude > 2.8 && !impactDetected.current && !isFallDetectedRef.current) {
        impactDetected.current = true;
        impactTime.current = now;
        console.log('[useAccelerometer] High G-force impact detected:', magnitude.toFixed(2));
      }

      // Quiet phase detection: 1-2 seconds after impact, user must be stationary (~1G total magnitude)
      if (impactDetected.current && now - impactTime.current > 1000 && now - impactTime.current < 3000) {
        const diffFromGravity = Math.abs(magnitude - 1.0);
        // If stationary (close to 1G) after impact
        if (diffFromGravity < 0.25) {
          impactDetected.current = false;
          isFallDetectedRef.current = true;
          setIsFallDetected(true);
          setGestureType('fall');
          console.log('[useAccelerometer] GESTURE DETECTED: FALL CONFIRMED (impact + inactivity)');

          // Auto reset after 8 seconds
          setTimeout(() => {
            isFallDetectedRef.current = false;
            setIsFallDetected(false);
            setGestureType('none');
          }, 8000);
        }
      }

      // Reset impact state if too much time passed without quiet phase stabilization
      if (impactDetected.current && now - impactTime.current >= 3000) {
        impactDetected.current = false;
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
