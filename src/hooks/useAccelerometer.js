import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  isSensorsSupported, 
  isDeviceMotionSupported,
  requestAccelerometerPermission,
  calculateAccelerationMagnitude,
  applyLowPassFilter,
  MockAccelerometer
} from '../utils/sensorUtils';

// See if we can use the phone's motion sensor
const AccelerometerClass = typeof window !== 'undefined' ? 
  (window.Accelerometer || null) : null;

// Get motion data from the phone
const useAccelerometer = (options = {}) => {
  const {
    frequency = 60,            // How many readings per second
    filterCoefficient = 0.2,   // How much to smooth the readings
    useDeviceMotionFallback = true, // Use backup sensor if main one not available
    enabled = true             // Whether to track motion
  } = options;

  // Keep track of what we find
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0, magnitude: 0 });
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // Keep track of things between updates
  const sensor = useRef(null);
  const previousValues = useRef({ x: 0, y: 0, z: 0 });
  const deviceMotionListener = useRef(null);

  // Set up the motion sensor when we start
  useEffect(() => {
    if (!enabled) return;

    const initSensor = async () => {
      setError(null);
      
      try {
        console.log('Setting up motion sensor...');
        
        // Try main sensor first
        if (isSensorsSupported()) {
          console.log('Using main sensor');
          
          await requestAccelerometerPermission();
          
          if (AccelerometerClass) {
            console.log('Using phone motion sensor');
            sensor.current = new AccelerometerClass({ frequency });
          } else {
            console.log('Using test sensor');
            sensor.current = new MockAccelerometer({ frequency });
            setUsingFallback(true);
          }
          
          // Handle sensor problems
          sensor.current.addEventListener('error', (event) => {
            console.error('Sensor error:', event.error);
            setError(`Sensor error: ${event.error.message}`);
            setIsAvailable(false);
            
            if (useDeviceMotionFallback) {
              console.log('Switching to backup sensor');
              initDeviceMotionFallback();
            }
          });
          
          // Handle sensor readings
          sensor.current.addEventListener('reading', () => {
            const { x, y, z } = sensor.current;
            
            // Make readings smoother
            const filteredX = applyLowPassFilter(x, previousValues.current.x, filterCoefficient);
            const filteredY = applyLowPassFilter(y, previousValues.current.y, filterCoefficient);
            const filteredZ = applyLowPassFilter(z, previousValues.current.z, filterCoefficient);
            
            previousValues.current = { x: filteredX, y: filteredY, z: filteredZ };
            
            const magnitude = calculateAccelerationMagnitude(filteredX, filteredY, filteredZ);
            
            setAcceleration({
              x: filteredX,
              y: filteredY,
              z: filteredZ,
              magnitude,
              timestamp: Date.now()
            });
          });
          
          setIsAvailable(true);
          setUsingFallback(false);
          
          if (isRunning) {
            console.log('Starting sensor');
            sensor.current.start();
          }
          
          return;
        }
        
        // Try backup sensor if main one not available
        if (useDeviceMotionFallback && isDeviceMotionSupported()) {
          console.log('Using backup sensor');
          initDeviceMotionFallback();
          return;
        }
        
        throw new Error('No motion sensors available');
        
      } catch (err) {
        console.error('Failed to set up sensor:', err);
        setError(`Failed to set up sensor: ${err.message}`);
        setIsAvailable(false);
        
        if (useDeviceMotionFallback && isDeviceMotionSupported() && !usingFallback) {
          console.log('Switching to backup sensor');
          initDeviceMotionFallback();
        }
      }
    };

    // Set up backup sensor
    const initDeviceMotionFallback = () => {
      console.log('Setting up backup sensor');
      setUsingFallback(true);
      
      deviceMotionListener.current = (event) => {
        if (!event.accelerationIncludingGravity) {
          console.log('No motion data available');
          return;
        }
        
        const { x, y, z } = event.accelerationIncludingGravity;
        
        // Make readings smoother
        const filteredX = applyLowPassFilter(x, previousValues.current.x, filterCoefficient);
        const filteredY = applyLowPassFilter(y, previousValues.current.y, filterCoefficient);
        const filteredZ = applyLowPassFilter(z, previousValues.current.z, filterCoefficient);
        
        previousValues.current = { x: filteredX, y: filteredY, z: filteredZ };
        
        const magnitude = calculateAccelerationMagnitude(filteredX, filteredY, filteredZ);
        
        setAcceleration({
          x: filteredX,
          y: filteredY,
          z: filteredZ,
          magnitude,
          timestamp: Date.now()
        });
      };
      
      setIsAvailable(true);
      
      if (isRunning) {
        console.log('Starting backup sensor');
        window.addEventListener('devicemotion', deviceMotionListener.current);
      }
    };

    initSensor();
    
    // Clean up when we're done
    return () => {
      stop();
      
      if (deviceMotionListener.current) {
        window.removeEventListener('devicemotion', deviceMotionListener.current);
        deviceMotionListener.current = null;
      }
    };
  }, [enabled, frequency, filterCoefficient, useDeviceMotionFallback]);

  // Start tracking motion
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
      console.error('Failed to start sensor:', err);
      setError(`Failed to start sensor: ${err.message}`);
    }
  }, [isAvailable, isRunning, usingFallback]);

  // Stop tracking motion
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
      console.error('Failed to stop sensor:', err);
      setError(`Failed to stop sensor: ${err.message}`);
    }
  }, [isRunning, usingFallback]);

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