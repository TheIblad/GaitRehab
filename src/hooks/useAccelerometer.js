import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  isSensorsSupported, 
  isDeviceMotionSupported,
  requestAccelerometerPermission,
  calculateAccelerationMagnitude,
  applyLowPassFilter,
  MockAccelerometer
} from '../utils/sensorUtils';

// Add this check at the beginning of the file
const AccelerometerClass = typeof window !== 'undefined' ? 
  (window.Accelerometer || (typeof Accelerometer !== 'undefined' ? Accelerometer : null)) : null;

/**
 * Hook to access device accelerometer data
 */
const useAccelerometer = (options = {}) => {
  const {
    frequency = 60,            // Desired reading frequency in Hz
    filterCoefficient = 0.2,   // Low-pass filter coefficient
    useDeviceMotionFallback = true, // Whether to use DeviceMotion API as fallback
    enabled = true             // Whether the accelerometer is enabled
  } = options;

  // State
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0, magnitude: 0 });
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // Refs to manage state across render cycles
  const sensor = useRef(null);
  const previousValues = useRef({ x: 0, y: 0, z: 0 });
  const deviceMotionListener = useRef(null);

  // Initialize the appropriate sensor
  useEffect(() => {
    if (!enabled) return;

    const initSensor = async () => {
      // Reset error state
      setError(null);
      
      try {
        // First try to use the Sensor API
        if (isSensorsSupported()) {
          // Request permission if needed
          await requestAccelerometerPermission();
          
          // Create accelerometer instance
          if (AccelerometerClass) {
            sensor.current = new AccelerometerClass({ frequency });
          } else if (useDeviceMotionFallback) {
            // If Sensor API is not available, fall back to DeviceMotion
            initDeviceMotionFallback();
            return;
          } else {
            throw new Error('Accelerometer API not supported.');
          }
          
          // Set up error handler
          sensor.current.addEventListener('error', (event) => {
            console.error('Accelerometer error:', event.error);
            setError(`Accelerometer error: ${event.error.message}`);
            setIsAvailable(false);
            
            // Try fallback if primary sensor fails
            if (useDeviceMotionFallback) {
              initDeviceMotionFallback();
            }
          });
          
          // Set up reading handler
          sensor.current.addEventListener('reading', () => {
            const { x, y, z } = sensor.current;
            
            // Apply low-pass filter to reduce noise
            const filteredX = applyLowPassFilter(x, previousValues.current.x, filterCoefficient);
            const filteredY = applyLowPassFilter(y, previousValues.current.y, filterCoefficient);
            const filteredZ = applyLowPassFilter(z, previousValues.current.z, filterCoefficient);
            
            // Update previous values for next filter pass
            previousValues.current = { x: filteredX, y: filteredY, z: filteredZ };
            
            // Calculate magnitude
            const magnitude = calculateAccelerationMagnitude(filteredX, filteredY, filteredZ);
            
            // Update state with new readings
            setAcceleration({
              x: filteredX,
              y: filteredY,
              z: filteredZ,
              magnitude,
              timestamp: Date.now()
            });
          });
          
          // Sensor is available
          setIsAvailable(true);
          setUsingFallback(false);
          
          // Start the sensor if needed
          if (isRunning) {
            sensor.current.start();
          }
          
          return;
        }
        
        // If Sensor API is not available, use DeviceMotion as fallback
        if (useDeviceMotionFallback && isDeviceMotionSupported()) {
          initDeviceMotionFallback();
          return;
        }
        
        // If neither is available, set error
        throw new Error('Accelerometer not supported by this device/browser');
        
      } catch (err) {
        console.error('Error initializing accelerometer:', err);
        setError(`Error initializing accelerometer: ${err.message}`);
        setIsAvailable(false);
        
        // Try fallback if primary method fails
        if (useDeviceMotionFallback && isDeviceMotionSupported() && !usingFallback) {
          initDeviceMotionFallback();
        }
      }
    };

    // Initialize devicemotion fallback
    const initDeviceMotionFallback = () => {
      console.log("Using DeviceMotion fallback");
      setUsingFallback(true);
      
      // Create device motion handler
      deviceMotionListener.current = (event) => {
        if (!event.accelerationIncludingGravity) return;
        
        const { x, y, z } = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
        
        // Apply low-pass filter
        const filteredX = applyLowPassFilter(x || 0, previousValues.current.x, filterCoefficient);
        const filteredY = applyLowPassFilter(y || 0, previousValues.current.y, filterCoefficient);
        const filteredZ = applyLowPassFilter(z || 0, previousValues.current.z, filterCoefficient);
        
        // Update previous values
        previousValues.current = { x: filteredX, y: filteredY, z: filteredZ };
        
        // Calculate magnitude
        const magnitude = calculateAccelerationMagnitude(filteredX, filteredY, filteredZ);
        
        // Update state
        setAcceleration({
          x: filteredX,
          y: filteredY,
          z: filteredZ,
          magnitude,
          timestamp: Date.now()
        });
      };
      
      // Set as available and attach listener if running
      setIsAvailable(true);
      
      if (isRunning) {
        window.addEventListener('devicemotion', deviceMotionListener.current);
      }
    };

    initSensor();
    
    // Cleanup function
    return () => {
      if (isRunning) {
        stop();
      }
      
      if (deviceMotionListener.current) {
        window.removeEventListener('devicemotion', deviceMotionListener.current);
        deviceMotionListener.current = null;
      }
    };
  }, [enabled, frequency, filterCoefficient, useDeviceMotionFallback, isRunning]);

  // Start accelerometer readings
  const start = useCallback(() => {
    if (!isAvailable || isRunning) return;
    
    setIsRunning(true);
    
    try {
      if (usingFallback && deviceMotionListener.current) {
        window.addEventListener('devicemotion', deviceMotionListener.current);
      } else if (sensor.current) {
        sensor.current.start();
      }
    } catch (err) {
      console.error('Error starting accelerometer:', err);
      setError(`Error starting accelerometer: ${err.message}`);
    }
  }, [isAvailable, isRunning, usingFallback]);

  // Stop accelerometer readings
  const stop = useCallback(() => {
    if (!isRunning) return;
    
    setIsRunning(false);
    
    try {
      if (usingFallback && deviceMotionListener.current) {
        window.removeEventListener('devicemotion', deviceMotionListener.current);
      } else if (sensor.current) {
        sensor.current.stop();
      }
    } catch (err) {
      console.error('Error stopping accelerometer:', err);
      setError(`Error stopping accelerometer: ${err.message}`);
    }
  }, [isRunning, usingFallback]);

  // Return API
  return {
    acceleration,
    isAvailable,
    isRunning,
    error,
    usingFallback,
    start,
    stop
  };
};

export default useAccelerometer;