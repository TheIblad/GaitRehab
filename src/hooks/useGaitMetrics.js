import { useState, useEffect, useRef } from 'react';
import { isSensorsSupported, getAccelerometer } from '../utils/sensorUtils';

const AccelerometerClass = typeof window !== 'undefined' ? 
  (window.Accelerometer || null) : null;

const useGaitMetrics = (options = {}) => {
  const {
    windowSize = 200,          // Size of the rolling window for analysis (samples)
    sampleRate = 60,           // Expected sample rate in Hz
    enabled = true,            // Whether the gait analysis is enabled
    onMetricsUpdated = null    // Callback when metrics are updated
  } = options;

  const [symmetry, setSymmetry] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [usingSensorApi, setUsingSensorApi] = useState(false);
  
  // Refs to maintain state between renders
  const sensor = useRef(null);
  const accelerationWindow = useRef([]);
  const stepIntervals = useRef([]);
  const lastStepTime = useRef(0);
  const activityStartTime = useRef(null);
  
  // Start gait analysis
  const start = () => {
    if (!isAvailable || isRunning) return;
    
    try {
      sensor.current.start();
      activityStartTime.current = Date.now();
      setIsRunning(true);
      accelerationWindow.current = [];
      stepIntervals.current = [];
      console.log('Gait metrics analysis started');
    } catch (err) {
      setError(`Error starting gait analysis: ${err.message}`);
      console.error('Error starting gait analysis:', err);
    }
  };
  
  // Stop gait analysis
  const stop = () => {
    if (!isRunning || !sensor.current) return;
    
    try {
      sensor.current.stop();
      setIsRunning(false);
      console.log('Gait metrics analysis stopped');
    } catch (err) {
      setError(`Error stopping gait analysis: ${err.message}`);
      console.error('Error stopping gait analysis:', err);
    }
  };
  
  // Calculate and update gait metrics
  const updateMetrics = () => {
    // Need at least a few step intervals to calculate metrics
    if (stepIntervals.current.length < 4) return;
    
    // Calculate mean inter-step interval
    const meanInterval = stepIntervals.current.reduce((a, b) => a + b, 0) / stepIntervals.current.length;
    
    // Calculate standard deviation of intervals
    const sumOfSquaredDifferences = stepIntervals.current.reduce((sum, interval) => {
      return sum + Math.pow(interval - meanInterval, 2);
    }, 0);
    const stdDev = Math.sqrt(sumOfSquaredDifferences / stepIntervals.current.length);
    
    // Calculate coefficient of variation as an asymmetry indicator
    // Higher CV means more variability in step timing, suggesting asymmetry
    const cv = (stdDev / meanInterval) * 100;
    
    // Convert to symmetry percentage (100% - asymmetry)
    // Capped at 100% and with a minimum threshold
    const symmetryValue = Math.min(100, Math.max(0, 100 - cv));
    
    // Calculate cadence (steps per minute)
    const elapsedMinutes = (Date.now() - activityStartTime.current) / 60000;
    const stepsPerMinute = stepIntervals.current.length / elapsedMinutes;
    
    // Update state with new metrics
    setSymmetry(Math.round(symmetryValue));
    setCadence(Math.round(stepsPerMinute));
    
    // Call the metrics updated callback if provided
    if (onMetricsUpdated) {
      onMetricsUpdated({
        symmetry: Math.round(symmetryValue),
        cadence: Math.round(stepsPerMinute),
        stepIntervals: [...stepIntervals.current],
        timestamp: Date.now()
      });
    }
  };
  
  // Initialize the sensors
  useEffect(() => {
    if (!enabled) return;
    
    const initSensors = async () => {
      try {
        // Check if the Accelerometer API is available
        if (!isSensorsSupported()) {
          throw new Error('Accelerometer not supported by this device/browser');
        }
        
        // Request permission if needed
        if ('permissions' in navigator) {
          try {
            const result = await navigator.permissions.query({ name: 'accelerometer' });
            if (result.state === 'denied') {
              throw new Error('Permission to use accelerometer was denied');
            }
          } catch (permissionErr) {
            console.warn('Permission API not supported, continuing anyway:', permissionErr);
          }
        }
        
        // Create accelerometer with desired frequency
        if (AccelerometerClass) {
          sensor.current = new AccelerometerClass({ frequency: sampleRate });
        } else {
          // Use a mock implementation or fallback
          throw new Error('Accelerometer not supported by this device/browser');
        }
        
        // Set up the error handler
        sensor.current.addEventListener('error', (event) => {
          setError(`Sensor error: ${event.error.message}`);
          setIsAvailable(false);
          console.error('Sensor error:', event.error);
        });
        
        // Set up the reading handler
        sensor.current.addEventListener('reading', () => {
          const { x, y, z } = sensor.current;
          
          // Calculate acceleration magnitude
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          
          // Add to rolling window
          accelerationWindow.current.push(magnitude);
          
          // Keep the window at the desired size
          if (accelerationWindow.current.length > windowSize) {
            accelerationWindow.current.shift();
          }
          
          // Detect steps using peak detection
          // This is a simplified approach - could be enhanced with more complex algorithms
          if (accelerationWindow.current.length > 3) {
            const current = magnitude;
            const previous = accelerationWindow.current[accelerationWindow.current.length - 2];
            const beforePrevious = accelerationWindow.current[accelerationWindow.current.length - 3];
            
            // Simple peak detection
            if (previous > current && previous > beforePrevious && previous > 11) { // 11 is a threshold
              const now = Date.now();
              
              // Calculate time since last step
              if (lastStepTime.current > 0) {
                const interval = now - lastStepTime.current;
                
                // Only record intervals that make sense (e.g., 250ms - 2000ms)
                if (interval > 250 && interval < 2000) {
                  stepIntervals.current.push(interval);
                  
                  // Keep only the last N intervals for analysis
                  if (stepIntervals.current.length > 20) {
                    stepIntervals.current.shift();
                  }
                  
                  // Update metrics every few steps
                  if (stepIntervals.current.length % 4 === 0) {
                    updateMetrics();
                  }
                }
              }
              
              lastStepTime.current = now;
            }
          }
        });
        
        // Sensor is available
        setIsAvailable(true);
        activityStartTime.current = Date.now();
        
      } catch (err) {
        setError(`Sensor initialization error: ${err.message}`);
        setIsAvailable(false);
        console.error('Sensor initialization error:', err);
      }
    };
    
    initSensors();
    
    // Cleanup function
    return () => {
      if (sensor.current) {
        try {
          sensor.current.stop();
        } catch (err) {
          console.error('Error stopping sensor:', err);
        }
      }
    };
  }, [enabled, sampleRate, windowSize, onMetricsUpdated]);
  
  // Return the gait metrics API
  return {
    symmetry,
    cadence,
    isAvailable,
    isRunning,
    error,
    start,
    stop
  };
};

export default useGaitMetrics;