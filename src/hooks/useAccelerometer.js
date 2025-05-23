import { useState, useEffect, useRef, useCallback } from 'react';
import { lowPassFilter, calculateMagnitude } from '../utils/sensorUtils';

const useAccelerometer = (options = {}) => {
  const { 
    filterCoefficient = 0.3, 
    enabled = true,
    sampleRate = 50 // Hz
  } = options;

  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0, magnitude: 0 });
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt');

  const intervalRef = useRef(null);
  const lastValues = useRef({ x: 0, y: 0, z: 0 });
  const accelerometerRef = useRef(null);

  // Check if device motion is available
  useEffect(() => {
    const checkAvailability = () => {
      if ('DeviceMotionEvent' in window) {
        setIsAvailable(true);
        // Check for permission API
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
          // iOS 13+ permission model
          setPermissionState('prompt');
        } else {
          // Android or older iOS
          setPermissionState('granted');
        }
      } else {
        setIsAvailable(false);
        setError('Device motion sensors not available');
      }
    };

    checkAvailability();
  }, []);

  const handleDeviceMotion = useCallback((event) => {
    const acc = event.accelerationIncludingGravity;
    
    if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
      // Apply low-pass filter to smooth the data
      const filteredX = lowPassFilter(acc.x, lastValues.current.x, filterCoefficient);
      const filteredY = lowPassFilter(acc.y, lastValues.current.y, filterCoefficient);
      const filteredZ = lowPassFilter(acc.z, lastValues.current.z, filterCoefficient);
      
      lastValues.current = { x: filteredX, y: filteredY, z: filteredZ };
      
      const magnitude = calculateMagnitude(filteredX, filteredY, filteredZ);
      
      setAcceleration({
        x: filteredX,
        y: filteredY,
        z: filteredZ,
        magnitude
      });
    }
  }, [filterCoefficient]);

  const requestPermission = useCallback(async () => {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        setPermissionState(permission);
        return permission === 'granted';
      } catch (error) {
        console.error('Permission request failed:', error);
        setError('Permission denied');
        setPermissionState('denied');
        return false;
      }
    }
    return true; // No permission needed on this device
  }, []);

  const start = useCallback(async () => {
    if (!isAvailable || !enabled) {
      setError('Sensors not available or disabled');
      return false;
    }

    if (isRunning) return true;

    // Request permission if needed
    if (permissionState === 'prompt') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    if (permissionState === 'denied') {
      setError('Motion sensor permission denied');
      return false;
    }

    try {
      // Check if we can use the Sensor API
      if ('Accelerometer' in window) {
        try {
          accelerometerRef.current = new window.Accelerometer({ 
            frequency: sampleRate 
          });
          
          accelerometerRef.current.addEventListener('reading', () => {
            const { x, y, z } = accelerometerRef.current;
            
            const filteredX = lowPassFilter(x, lastValues.current.x, filterCoefficient);
            const filteredY = lowPassFilter(y, lastValues.current.y, filterCoefficient);
            const filteredZ = lowPassFilter(z, lastValues.current.z, filterCoefficient);
            
            lastValues.current = { x: filteredX, y: filteredY, z: filteredZ };
            
            const magnitude = calculateMagnitude(filteredX, filteredY, filteredZ);
            
            setAcceleration({
              x: filteredX,
              y: filteredY,
              z: filteredZ,
              magnitude
            });
          });

          accelerometerRef.current.addEventListener('error', (event) => {
            console.error('Accelerometer error:', event.error);
            setError('Accelerometer error: ' + event.error.message);
            setUsingFallback(true);
            // Fall back to DeviceMotion
            window.addEventListener('devicemotion', handleDeviceMotion);
          });

          accelerometerRef.current.start();
          setIsRunning(true);
          setError(null);
          setUsingFallback(false);
          return true;
        } catch (err) {
          console.log('Accelerometer API failed, falling back to DeviceMotion');
          setUsingFallback(true);
        }
      }
      
      // Fallback to DeviceMotion API
      window.addEventListener('devicemotion', handleDeviceMotion);
      setIsRunning(true);
      setError(null);
      setUsingFallback(true);
      return true;
      
    } catch (err) {
      console.error('Failed to start motion sensors:', err);
      setError('Failed to start motion sensors: ' + err.message);
      return false;
    }
  }, [isAvailable, enabled, isRunning, permissionState, requestPermission, handleDeviceMotion, sampleRate, filterCoefficient]);

  const stop = useCallback(() => {
    if (!isRunning) return;

    if (accelerometerRef.current) {
      accelerometerRef.current.stop();
      accelerometerRef.current = null;
    }
    
    window.removeEventListener('devicemotion', handleDeviceMotion);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsRunning(false);
  }, [isRunning, handleDeviceMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    acceleration,
    isAvailable,
    isRunning,
    error,
    usingFallback,
    permissionState,
    start,
    stop,
    requestPermission
  };
};

export default useAccelerometer;