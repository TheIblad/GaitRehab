import { useState, useEffect, useRef } from 'react';
import { isSensorsSupported, getAccelerometer } from '../utils/sensorUtils';

// See if we can use the phone's motion sensor
const AccelerometerClass = typeof window !== 'undefined' ? 
  (window.Accelerometer || null) : null;

// Track how well you're walking
const useGaitMetrics = (options = {}) => {
  const {
    windowSize = 200,          // How many readings to keep
    sampleRate = 60,           // How many readings per second
    enabled = true,            // Whether to track walking
    onMetricsUpdated = null    // Run this when we get new info
  } = options;

  const [symmetry, setSymmetry] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [usingSensorApi, setUsingSensorApi] = useState(false);
  
  // Keep track of things between updates
  const sensor = useRef(null);
  const accelerationWindow = useRef([]);
  const stepIntervals = useRef([]);
  const lastStepTime = useRef(0);
  const activityStartTime = useRef(null);
  
  // Start tracking walking
  const start = () => {
    if (!isAvailable || isRunning) return;
    
    try {
      sensor.current.start();
      activityStartTime.current = Date.now();
      setIsRunning(true);
      accelerationWindow.current = [];
      stepIntervals.current = [];
      console.log('Started tracking walking');
    } catch (err) {
      setError(`Error starting: ${err.message}`);
      console.error('Error starting:', err);
    }
  };
  
  // Stop tracking walking
  const stop = () => {
    if (!isRunning || !sensor.current) return;
    
    try {
      sensor.current.stop();
      setIsRunning(false);
      console.log('Stopped tracking walking');
    } catch (err) {
      setError(`Error stopping: ${err.message}`);
      console.error('Error stopping:', err);
    }
  };
  
  // Work out how well you're walking
  const updateMetrics = () => {
    // Need at least 4 steps to work out how well you're walking
    if (stepIntervals.current.length < 4) return;
    
    // Work out average time between steps
    const meanInterval = stepIntervals.current.reduce((a, b) => a + b, 0) / stepIntervals.current.length;
    
    // Work out how much the times vary
    const sumOfSquaredDifferences = stepIntervals.current.reduce((sum, interval) => {
      return sum + Math.pow(interval - meanInterval, 2);
    }, 0);
    const stdDev = Math.sqrt(sumOfSquaredDifferences / stepIntervals.current.length);
    
    // Work out how even your steps are
    // Higher number means steps are less even
    const cv = (stdDev / meanInterval) * 100;
    
    // Convert to a percentage (100% = perfect)
    const symmetryValue = Math.min(100, Math.max(0, 100 - cv));
    
    // Work out steps per minute
    const elapsedMinutes = (Date.now() - activityStartTime.current) / 60000;
    const stepsPerMinute = stepIntervals.current.length / elapsedMinutes;
    
    // Save the new numbers
    setSymmetry(Math.round(symmetryValue));
    setCadence(Math.round(stepsPerMinute));
    
    // Tell parent component about the new numbers
    if (onMetricsUpdated) {
      onMetricsUpdated({
        symmetry: Math.round(symmetryValue),
        cadence: Math.round(stepsPerMinute),
        stepIntervals: [...stepIntervals.current],
        timestamp: Date.now()
      });
    }
  };
  
  // Set up the motion sensor
  useEffect(() => {
    if (!enabled) return;
    
    const initSensors = async () => {
      try {
        // See if phone can use motion sensor
        if (!isSensorsSupported()) {
          throw new Error('Phone cannot use motion sensor');
        }
        
        // Ask for permission if needed
        if ('permissions' in navigator) {
          try {
            const result = await navigator.permissions.query({ name: 'accelerometer' });
            if (result.state === 'denied') {
              throw new Error('Permission denied');
            }
          } catch (permissionErr) {
            console.warn('Cannot ask for permission, trying anyway:', permissionErr);
          }
        }
        
        // Set up motion sensor
        if (AccelerometerClass) {
          sensor.current = new AccelerometerClass({ frequency: sampleRate });
        } else {
          throw new Error('Phone cannot use motion sensor');
        }
        
        // Handle sensor errors
        sensor.current.addEventListener('error', (event) => {
          setError(`Sensor error: ${event.error.message}`);
          setIsAvailable(false);
          console.error('Sensor error:', event.error);
        });
        
        // Handle sensor readings
        sensor.current.addEventListener('reading', () => {
          const { x, y, z } = sensor.current;
          
          // Work out how strong the movement is
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          
          // Add to our list of readings
          accelerationWindow.current.push(magnitude);
          
          // Keep list at right size
          if (accelerationWindow.current.length > windowSize) {
            accelerationWindow.current.shift();
          }
          
          // Look for steps
          if (accelerationWindow.current.length > 3) {
            const current = magnitude;
            const previous = accelerationWindow.current[accelerationWindow.current.length - 2];
            const beforePrevious = accelerationWindow.current[accelerationWindow.current.length - 3];
            
            // Check if this looks like a step
            if (previous > current && previous > beforePrevious && previous > 11) {
              const now = Date.now();
              
              // Work out time since last step
              if (lastStepTime.current > 0) {
                const interval = now - lastStepTime.current;
                
                // Only count steps that make sense (between 0.25 and 2 seconds apart)
                if (interval > 250 && interval < 2000) {
                  stepIntervals.current.push(interval);
                  
                  // Keep last 20 steps
                  if (stepIntervals.current.length > 20) {
                    stepIntervals.current.shift();
                  }
                  
                  // Update numbers every 4 steps
                  if (stepIntervals.current.length % 4 === 0) {
                    updateMetrics();
                  }
                }
              }
              
              lastStepTime.current = now;
            }
          }
        });
        
        // Sensor is ready to use
        setIsAvailable(true);
        activityStartTime.current = Date.now();
        
      } catch (err) {
        setError(`Error setting up sensor: ${err.message}`);
        setIsAvailable(false);
        console.error('Error setting up sensor:', err);
      }
    };
    
    initSensors();
    
    // Clean up when done
    return () => {
      if (sensor.current) {
        try {
          sensor.current.stop();
        } catch (err) {
          console.error('Error stopping sensor:', err);
        }
      }
    };
  }, [enabled, sampleRate, windowSize]);
  
  return {
    symmetry,
    cadence,
    isAvailable,
    isRunning,
    error,
    usingSensorApi,
    start,
    stop
  };
};

export default useGaitMetrics;