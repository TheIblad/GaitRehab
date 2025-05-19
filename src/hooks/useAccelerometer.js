import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  isSensorsSupported, 
  isDeviceMotionSupported,
  requestAccelerometerPermission,
  calculateAccelerationMagnitude,
  applyLowPassFilter,
  MockAccelerometer
} from '../utils/sensorUtils';

// Better check for Accelerometer class
const AccelerometerClass = typeof window !== 'undefined' ? 
  (window.Accelerometer || null) : null;

/**
 * Hook to access device accelerometer data
 * @param {Object} options - Configuration options
 * @returns {Object} Accelerometer data and control functions
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
        console.log('Initializing accelerometer...');
        
        // First try to use the Device Motion API as it's more reliable on mobile
        if (useDeviceMotionFallback && isDeviceMotionSupported()) {
          console.log('Using DeviceMotion API');
          initDeviceMotionFallback();
          return;
        }
        
        // Then try Sensor API if available
        if (isSensorsSupported()) {
          console.log('Sensor API is supported');
          
          // Request permission if needed
          await requestAccelerometerPermission();
          
          // Check for Accelerometer class
          if (AccelerometerClass) {
            console.log('Using Accelerometer API');
            sensor.current = new AccelerometerClass({ frequency });
          } else {
            throw new Error('Accelerometer API not available, but should be');
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
            console.log('Raw accelerometer readings:', { x, y, z });
            
            // Apply low-pass filter to reduce noise
            const filteredX = applyLowPassFilter(x, previousValues.current.x, filterCoefficient);
            const filteredY = applyLowPassFilter(y, previousValues.current.y, filterCoefficient);
            const filteredZ = applyLowPassFilter(z, previousValues.current.z, filterCoefficient);
            
            // Update previous values for next filter pass
            previousValues.current = { x: filteredX, y: filteredY, z: filteredZ };
            
            // Calculate magnitude
            const magnitude = calculateAccelerationMagnitude(filteredX, filteredY, filteredZ);
            
            console.log('Processed accelerometer data:', {
              filtered: { x: filteredX, y: filteredY, z: filteredZ },
              magnitude,
              timestamp: Date.now()
            });
            
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
            console.log('Starting accelerometer');
            sensor.current.start();
          }
          
          return;
        }
        
        // If neither is available, set error
        throw new Error('Accelerometer not supported by this device/browser');
        
      } catch (err) {
        console.error('Error initializing accelerometer:', err);
        
        // Try fallback if primary method fails
        if (useDeviceMotionFallback && isDeviceMotionSupported() && !usingFallback) {
          console.log('Trying DeviceMotion fallback after error');
          initDeviceMotionFallback();
        } else {
          setError(`Error initializing accelerometer: ${err.message}`);
          setIsAvailable(false);
        }
      }
    };

    // Initialize devicemotion fallback - THIS IS THE CRITICAL PART FOR MOBILE
    const initDeviceMotionFallback = () => {
      console.log('Setting up DeviceMotion fallback');
      setUsingFallback(true);
      
      // iOS requires permission request for DeviceMotion
      if (typeof DeviceMotionEvent !== 'undefined' && 
          typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              attachDeviceMotionListener();
            } else {
              setError('DeviceMotion permission denied');
              setIsAvailable(false);
            }
          })
          .catch(err => {
            console.error('Error requesting DeviceMotion permission:', err);
            // Try to attach anyway, might work on some devices
            attachDeviceMotionListener();
          });
      } else {
        // For non-iOS devices
        attachDeviceMotionListener();
      }
    };
    
    // Function to attach the device motion listener
    const attachDeviceMotionListener = () => {
      // Create device motion handler
      deviceMotionListener.current = (event) => {
        if (!event.accelerationIncludingGravity) {
          console.log('No acceleration data in DeviceMotion event');
          return;
        }
        
        // Extract acceleration values
        const { x = 0, y = 0, z = 0 } = event.accelerationIncludingGravity;
        
        // Apply low-pass filter
        const filteredX = applyLowPassFilter(x || 0, previousValues.current.x, filterCoefficient);
        const filteredY = applyLowPassFilter(y || 0, previousValues.current.y, filterCoefficient);
        const filteredZ = applyLowPassFilter(z || 0, previousValues.current.z, filterCoefficient);
        
        // Update previous values
        previousValues.current = { x: filteredX, y: filteredY, z: filteredZ };
        
        // Calculate magnitude
        const magnitude = calculateAccelerationMagnitude(filteredX, filteredY, filteredZ);
        
        console.log('Processed DeviceMotion data:', {
          filtered: { x: filteredX, y: filteredY, z: filteredZ },
          magnitude,
          timestamp: Date.now()
        });
        
        // Update state
        setAcceleration({
          x: filteredX,
          y: filteredY,
          z: filteredZ,
          magnitude,
          timestamp: Date.now()
        });
      };
      
      // Set as available
      setIsAvailable(true);
      
      // Attach listener if running
      if (isRunning) {
        console.log('Attaching DeviceMotion event listener');
        window.addEventListener('devicemotion', deviceMotionListener.current);
      }
    };

    // Initialize sensors
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
    console.log('Starting accelerometer readings...');
    
    try {
      if (usingFallback && deviceMotionListener.current) {
        console.log('Adding DeviceMotion event listener');
        window.addEventListener('devicemotion', deviceMotionListener.current);
      } else if (sensor.current) {
        console.log('Starting Accelerometer sensor');
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
    console.log('Stopping accelerometer readings...');
    
    try {
      if (usingFallback && deviceMotionListener.current) {
        console.log('Removing DeviceMotion event listener');
        window.removeEventListener('devicemotion', deviceMotionListener.current);
      } else if (sensor.current) {
        console.log('Stopping Accelerometer sensor');
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