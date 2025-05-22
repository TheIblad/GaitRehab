import { useState, useEffect, useRef, useCallback } from 'react';
import useAccelerometer from './useAccelerometer';
import { estimateStepLength } from '../utils/sensorUtils';

/**
 * Hook to count steps and calculate distance using device motion sensors
 */
const useStepCounter = (options = {}) => {
  const {
    stepThreshold = 10.0,
    stepCooldown = 400,
    userHeight = 170,
    userGender = 'neutral',
    filterCoefficient = 0.3,
    onStepDetected = null,
    enabled = true,
    demoMode = true
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
  const peakDetected = useRef(false);
  const stepIntervals = useRef([]);
  const stepTimeHistory = useRef([]);
  const startTime = useRef(null);
  const stepLengthMeters = useRef(estimateStepLength(userHeight, userGender));
  const lastMagnitudes = useRef([]);
  const demoStartTime = useRef(null);
  const lastSymmetryUpdate = useRef(0);
  const symmetryUpdateThreshold = useRef(7000);
  const magnitudeHistory = useRef([]);
  
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
    
    // Demo mode handling
    if (demoMode && isActive) {
      const elapsedSeconds = demoStartTime.current ? (now - demoStartTime.current) / 1000 : 0;
      const timeSinceLastUpdate = now - lastSymmetryUpdate.current;
      
      if (timeSinceLastUpdate > symmetryUpdateThreshold.current) {
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
    
    // Add magnitude to history for better trend detection
    magnitudeHistory.current.push(magnitude);
    if (magnitudeHistory.current.length > 10) {
      magnitudeHistory.current.shift();
    }
    
    // Use a smaller buffer for peak detection
    lastMagnitudes.current.push(magnitude);
    if (lastMagnitudes.current.length > 5) {
      lastMagnitudes.current.shift();
    }
    
    // Check if we're past the cooldown period
    const timeSinceLastStep = now - lastStepTime.current;
    
    if (timeSinceLastStep > stepCooldown) {
      // Get the average of last few magnitudes for more stable detection
      const recentAvg = lastMagnitudes.current.reduce((sum, val) => sum + val, 0) / 
                        lastMagnitudes.current.length;
      
      // Detect peak with improved reliability
      const isPeak = magnitude > stepThreshold && 
                     !peakDetected.current &&
                     lastMagnitudes.current.length >= 3 &&
                     // Make sure the magnitude is above recent average
                     magnitude > recentAvg * 1.2;
      
      if (isPeak) {
        // Mark peak detected
        peakDetected.current = true;
        
        // Process step
        setSteps(prevSteps => {
          const newSteps = prevSteps + 1;
          
          // Update distance 
          const newDistance = (newSteps * stepLengthMeters.current) / 1000;
          setDistance(newDistance);
          
          // Record step timing data
          if (lastStepTime.current > 0) {
            const interval = timeSinceLastStep;
            
            // Store interval for cadence calculation
            stepIntervals.current.push(interval);
            if (stepIntervals.current.length > 10) {
              stepIntervals.current.shift();
            }
            
            // Store step history for symmetry calculation
            stepTimeHistory.current.push({
              timestamp: now,
              interval: interval
            });
            
            if (stepTimeHistory.current.length > 20) {
              stepTimeHistory.current.shift();
            }
            
            // Calculate cadence (steps per minute)
            const avgInterval = stepIntervals.current.reduce((a, b) => a + b, 0) / 
                               stepIntervals.current.length;
            const stepsPerMinute = Math.round(60000 / avgInterval);
            setCadence(stepsPerMinute);
            
            // Only update symmetry periodically and with enough data
            if (!demoMode && stepTimeHistory.current.length >= 6) {
              const timeSinceLastSymmetryUpdate = now - lastSymmetryUpdate.current;
              if (timeSinceLastSymmetryUpdate > symmetryUpdateThreshold.current) {
                lastSymmetryUpdate.current = now;
                calculateSymmetry();
              }
            }
          }
          
          // Call step detection callback if provided
          if (onStepDetected) {
            onStepDetected({
              steps: newSteps,
              timestamp: now
            });
          }
          
          return newSteps;
        });
        
        // Update last step timestamp
        lastStepTime.current = now;
      }
    } else if (magnitude < stepThreshold * 0.7) {
      // Reset peak detection when magnitude drops significantly
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

    // Use strong smoothing for stable symmetry
    setSymmetry(prevSymmetry => {
      return Math.round(prevSymmetry * 0.85 + calculatedSymmetry * 0.15);
    });
  }, []);
  
  // Start the step counter
  const start = useCallback(() => {
    if (!isAvailable) return;
    
    // Start the accelerometer
    startAccelerometer();
    
    // Set active state
    setIsActive(true);
    const now = Date.now();
    setSessionStartTime(now);
    startTime.current = now;
    
    // Clear and initialize tracking refs
    lastStepTime.current = 0;
    peakDetected.current = false;
    stepIntervals.current = [];
    stepTimeHistory.current = [];
    lastMagnitudes.current = [];
    magnitudeHistory.current = [];
    
    // Handle demo mode
    if (demoMode) {
      demoStartTime.current = now;
      lastSymmetryUpdate.current = now;
      // Set initial high symmetry
      const initialSymmetry = Math.floor(Math.random() * 9) + 90;
      setSymmetry(initialSymmetry);
    } else {
      setSymmetry(75); // Default symmetry
    }
    
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
    // Reset state values
    setSteps(0);
    setDistance(0);
    setCadence(0);
    
    // Handle demo mode
    if (demoMode) {
      const initialSymmetry = Math.floor(Math.random() * 9) + 90;
      setSymmetry(initialSymmetry);
      demoStartTime.current = Date.now();
      lastSymmetryUpdate.current = Date.now();
    } else {
      setSymmetry(75);
    }

    // Clear tracking refs
    lastStepTime.current = 0;
    peakDetected.current = false;
    stepIntervals.current = [];
    stepTimeHistory.current = [];
    lastMagnitudes.current = [];
    magnitudeHistory.current = [];
    
    // Update timestamps if active
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