import { useState, useEffect, useRef, useCallback } from 'react';
import useAccelerometer from './useAccelerometer';
import { estimateStepLength } from '../utils/sensorUtils';

/**
 * Hook to count steps and calculate distance using device motion sensors
 */
const useStepCounter = (options = {}) => {
  const {
    stepThreshold = 10.0,       // Increase threshold to be less sensitive (was 3.0)
    stepCooldown = 400,        // Increase cooldown to prevent rapid counting (was 250)
    userHeight = 170,          // User height in cm for step length calculation
    userGender = 'neutral',    // User gender for step length calculation
    filterCoefficient = 0.3,   // Reduce coefficient for more smoothing (was 0.5)
    onStepDetected = null,     // Callback when a step is detected
    enabled = true,            // Whether the step counter is enabled
    demoMode = true            // Enable demo mode by default for the video
  } = options;

  // State
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [symmetry, setSymmetry] = useState(75); // Initial default symmetry
  
  // Refs for tracking between renders
  const lastStepTime = useRef(0);
  const peakDetected = useRef(false); // Track if we're currently in a peak
  const stepIntervals = useRef([]);
  const stepTimeHistory = useRef([]);
  const startTime = useRef(null);
  const stepLengthMeters = useRef(estimateStepLength(userHeight, userGender));
  const lastMagnitudes = useRef([]);  // Store recent magnitude values for peak detection
  const demoStartTime = useRef(null); // For tracking demo mode timing
  const lastSymmetryUpdate = useRef(0); // Track when symmetry was last updated
  const symmetryUpdateThreshold = useRef(5000); // Only update symmetry every 5 seconds
  
  // Use the accelerometer hook
  const {
    acceleration,
    isAvailable,
    isRunning,
    error: accelerometerError,
    usingFallback,
    start: startAccelerometer,
    stop: stopAccelerometer
  } = useAccelerometer({
    filterCoefficient,
    enabled
  });
  
  // Step detection algorithm
  useEffect(() => {
    if (!isActive || !isRunning) return;
    
    const now = Date.now();
    const { magnitude } = acceleration;
    
    if (demoMode && isActive) {
      const elapsedSeconds = demoStartTime.current ? (now - demoStartTime.current) / 1000 : 0;
      const timeSinceLastUpdate = now - lastSymmetryUpdate.current;
      
      // Only update symmetry every 5 seconds in demo mode
      if (timeSinceLastUpdate > 5000) {
        lastSymmetryUpdate.current = now;
        
        if (elapsedSeconds <= 10) {
          const highSymmetry = Math.floor(Math.random() * 9) + 90;
          setSymmetry(highSymmetry);
        } else {
          const lowerSymmetry = Math.floor(Math.random() * 16) + 60;
          setSymmetry(lowerSymmetry);
        }
      }
    }
    
    // Add magnitude to history, keeping last 5 values
    lastMagnitudes.current.push(magnitude);
    if (lastMagnitudes.current.length > 5) {
      lastMagnitudes.current.shift();
    }
    
    // Check if we're past the cooldown period
    const timeSinceLastStep = now - lastStepTime.current;
    
    if (timeSinceLastStep > stepCooldown) {
      // Improved peak detection algorithm
      const isPeak = magnitude > stepThreshold && 
                     !peakDetected.current &&
                     lastMagnitudes.current.length >= 3;
      
      if (isPeak) {
        // Mark that we've detected a peak
        peakDetected.current = true;
        
        // Increment step count
        setSteps(prevSteps => {
          const newSteps = prevSteps + 1;
          
          // Update distance based on step length
          const newDistance = (newSteps * stepLengthMeters.current) / 1000; // Convert to kilometers
          setDistance(newDistance);
          
          // Record step interval for cadence calculation
          if (lastStepTime.current > 0) {
            const interval = timeSinceLastStep;
            stepIntervals.current.push(interval);
            
            // Keep last 10 intervals for calculations
            if (stepIntervals.current.length > 10) {
              stepIntervals.current.shift();
            }
            
            // Record step time for symmetry analysis
            stepTimeHistory.current.push({
              timestamp: now,
              interval: interval
            });
            
            // Keep last 20 steps for symmetry calculation
            if (stepTimeHistory.current.length > 20) {
              stepTimeHistory.current.shift();
            }
            
            // Calculate cadence (steps per minute)
            const avgInterval = stepIntervals.current.reduce((a, b) => a + b, 0) / stepIntervals.current.length;
            if (avgInterval > 0) {
              setCadence(Math.round(60000 / avgInterval));
            }
            
            // Only update symmetry periodically and with enough data
            if (!demoMode && stepTimeHistory.current.length >= 6) {
              const timeSinceLastSymmetryUpdate = now - lastSymmetryUpdate.current;
              if (timeSinceLastSymmetryUpdate > symmetryUpdateThreshold.current) {
                lastSymmetryUpdate.current = now;
                calculateSymmetry();
              }
            }
          }
          
          // Fire callback if provided
          if (onStepDetected) {
            onStepDetected({
              steps: newSteps,
              timestamp: now
            });
          }
          
          return newSteps;
        });
        
        // Update last step time
        lastStepTime.current = now;
      }
    } else if (magnitude < stepThreshold * 0.6) {
      // Reset peak detection when magnitude drops significantly below threshold
      peakDetected.current = false;
    }
  }, [acceleration, isActive, isRunning, onStepDetected, stepCooldown, stepThreshold, demoMode]);
  
  // Calculate gait symmetry from step intervals
  const calculateSymmetry = useCallback(() => {
    if (stepTimeHistory.current.length < 6) {
      return;
    }

    const intervals = stepTimeHistory.current.map(step => step.interval);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    if (mean === 0) return;

    const squaredDiffs = intervals.map(interval => Math.pow(interval - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100;

    let calculatedSymmetry = 100 - (cv * 1.5);
    calculatedSymmetry = Math.min(98, Math.max(50, Math.round(calculatedSymmetry)));

    // Use even stronger smoothing for more stable symmetry
    setSymmetry(prevSymmetry => {
      return Math.round(prevSymmetry * 0.8 + calculatedSymmetry * 0.2);
    });
  }, []);
  
  // Start the step counter
  const start = useCallback(() => {
    if (!isAvailable) return;
    
    startAccelerometer();
    setIsActive(true);
    const now = Date.now();
    setSessionStartTime(now);
    startTime.current = now;
    
    // Start the demo mode timer
    if (demoMode) {
      demoStartTime.current = now;
      lastSymmetryUpdate.current = now;
      // Set initial high symmetry (90-98%)
      const initialSymmetry = Math.floor(Math.random() * 9) + 90;
      setSymmetry(initialSymmetry);
    } else {
      setSymmetry(75); // Default symmetry when not in demo mode
    }

    lastStepTime.current = 0;
    peakDetected.current = false;
    stepIntervals.current = [];
    stepTimeHistory.current = [];
    lastMagnitudes.current = [];
    
    // Reset counters
    setSteps(0);
    setDistance(0);
    setCadence(0);
  }, [isAvailable, startAccelerometer, demoMode]);
  
  // Stop the step counter
  const stop = useCallback(() => {
    stopAccelerometer();
    setIsActive(false);
    demoStartTime.current = null;
  }, [stopAccelerometer]);
  
  // Reset the step counter
  const reset = useCallback(() => {
    setSteps(0);
    setDistance(0);
    setCadence(0);
    
    if (demoMode) {
      const initialSymmetry = Math.floor(Math.random() * 9) + 90;
      setSymmetry(initialSymmetry);
      demoStartTime.current = Date.now();
      lastSymmetryUpdate.current = Date.now();
    } else {
      setSymmetry(75);
    }

    lastStepTime.current = 0;
    peakDetected.current = false;
    stepIntervals.current = [];
    stepTimeHistory.current = [];
    lastMagnitudes.current = [];
    
    if (isActive) {
      const now = Date.now();
      startTime.current = now;
      setSessionStartTime(now);
      if (demoMode) {
        demoStartTime.current = now;
      }
    } else {
      startTime.current = null;
      setSessionStartTime(null);
      demoStartTime.current = null;
    }
  }, [isActive, demoMode]);
  
  // Calculate session duration in seconds
  const getSessionDuration = useCallback(() => {
    if (!sessionStartTime) return 0;
    return Math.floor((Date.now() - sessionStartTime) / 1000);
  }, [sessionStartTime]);
  
  // Get current session stats
  const getSessionStats = useCallback(() => {
    return {
      steps,
      distance,
      cadence,
      symmetry,
      duration: getSessionDuration(),
      startTime: sessionStartTime,
      usingFallback
    };
  }, [steps, distance, cadence, symmetry, getSessionDuration, sessionStartTime, usingFallback]);
  
  // Update step length if user height or gender changes
  useEffect(() => {
    stepLengthMeters.current = estimateStepLength(userHeight, userGender);
  }, [userHeight, userGender]);
  
  return {
    steps,
    distance,
    cadence,
    symmetry,
    isAvailable,
    isActive,
    isRunning,
    error: accelerometerError,
    usingFallback,
    start,
    stop,
    reset,
    getSessionDuration,
    getSessionStats
  };
};

export default useStepCounter;