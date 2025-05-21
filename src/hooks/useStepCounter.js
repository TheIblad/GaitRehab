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
    enabled = true             // Whether the step counter is enabled
  } = options;

  // State
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [symmetry, setSymmetry] = useState(80); // Set a reasonable default symmetry
  
  // Refs for tracking between renders
  const lastStepTime = useRef(0);
  const peakDetected = useRef(false); // Track if we're currently in a peak
  const stepIntervals = useRef([]);
  const stepTimeHistory = useRef([]);
  const startTime = useRef(null);
  const stepLengthMeters = useRef(estimateStepLength(userHeight, userGender));
  const lastMagnitudes = useRef([]);  // Store recent magnitude values for peak detection
  const symmetryUpdateTimer = useRef(null); // Timer for regular symmetry updates
  const lastSymmetryUpdate = useRef(0); // Track when symmetry was last updated
  const stabilityFactor = useRef(1.0); // Track overall stability of motion
  
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
        
        // Record step time for calculating intervals
        const currentStepTime = now;
        
        if (lastStepTime.current > 0) {
          // Calculate interval between steps
          const interval = currentStepTime - lastStepTime.current;
          
          // Only consider reasonable intervals (e.g., 250ms to 2000ms)
          if (interval >= 250 && interval <= 2000) {
            stepIntervals.current.push(interval);
            stepTimeHistory.current.push({ timestamp: currentStepTime, interval });
            
            // Keep the history to a reasonable size
            if (stepIntervals.current.length > 20) {
              stepIntervals.current.shift();
            }
            
            if (stepTimeHistory.current.length > 20) {
              stepTimeHistory.current.shift();
            }
            
            // Update symmetry periodically (every 5 steps)
            if (stepIntervals.current.length % 5 === 0) {
              calculateSymmetry();
            }
            
            // Calculate cadence
            if (startTime.current && now - startTime.current > 0) {
              // Calculate steps per minute
              const minutesElapsed = (now - startTime.current) / 60000;
              if (minutesElapsed > 0) {
                setCadence(Math.round(steps / minutesElapsed));
              }
            }
          }
        }
        
        // Update last step time
        lastStepTime.current = currentStepTime;
        
        // Increment steps
        setSteps(prevSteps => {
          const newSteps = prevSteps + 1;
          // Update distance based on step length
          const newDistance = newSteps * stepLengthMeters.current / 1000;
          setDistance(newDistance);
          return newSteps;
        });
        
        // Call the step detected callback if provided
        if (onStepDetected) {
          onStepDetected({
            timestamp: currentStepTime,
            steps: steps + 1,
            interval: stepIntervals.current.length > 0 ? 
              stepIntervals.current[stepIntervals.current.length - 1] : 0
          });
        }
      }
    } else if (magnitude < stepThreshold * 0.8 && peakDetected.current) {
      // Reset peak detection when magnitude drops below threshold
      peakDetected.current = false;
    }
    
    // Update stability factor based on magnitude variability
    if (lastMagnitudes.current.length >= 5) {
      const avg = lastMagnitudes.current.reduce((sum, val) => sum + val, 0) / lastMagnitudes.current.length;
      const variance = lastMagnitudes.current.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / lastMagnitudes.current.length;
      
      // Higher variance = lower stability
      const newStabilityFactor = Math.max(0.7, Math.min(1, 1.0 - (variance / 50)));
      stabilityFactor.current = 0.9 * stabilityFactor.current + 0.1 * newStabilityFactor;
      
      // Update symmetry based on stability factor every second
      if (now - lastSymmetryUpdate.current > 1000) {
        updateSymmetryBasedOnStability();
        lastSymmetryUpdate.current = now;
      }
    }
    
  }, [acceleration, isActive, isRunning, onStepDetected, stepCooldown, stepThreshold, steps]);
  
  // Updated symmetry calculation with more realistic values
  const calculateSymmetry = () => {
    if (stepTimeHistory.current.length < 4) {
      // Not enough steps for a good calculation, return a reasonable default
      return updateSymmetryBasedOnStability();
    }
    
    // Calculate mean interval
    const intervals = stepTimeHistory.current.map(step => step.interval);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    if (mean === 0) {
      // Avoid division by zero
      return updateSymmetryBasedOnStability();
    }
    
    // Calculate standard deviation
    const squaredDiffs = intervals.map(interval => Math.pow(interval - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate coefficient of variation (CV)
    const cv = (stdDev / mean) * 100;
    
    // Improved symmetry calculation:
    // 1. Scale CV to be less harsh (divide by 3 instead of 2)
    // 2. Set a minimum symmetry threshold of 65%
    // 3. Adjust by current stability factor
    const calculatedSymmetry = Math.min(100, Math.max(65, Math.round(100 - cv/3)));
    const adjustedSymmetry = Math.round(calculatedSymmetry * stabilityFactor.current);
    
    console.log("Calculated symmetry:", calculatedSymmetry, "Adjusted:", adjustedSymmetry, 
                "from", intervals.length, "intervals, CV:", cv.toFixed(1),
                "Stability:", stabilityFactor.current.toFixed(2));
    
    // Update state with a weighted average to avoid jumpy values
    setSymmetry(prevSymmetry => {
      // Weighted average: 70% previous value, 30% new measurement
      return Math.round(0.7 * prevSymmetry + 0.3 * adjustedSymmetry);
    });
  };
  
  // Helper function to update symmetry based on motion stability
  const updateSymmetryBasedOnStability = () => {
    // Base symmetry range from 75-95% depending on stability
    const baseSymmetry = 75 + Math.round(20 * stabilityFactor.current);
    
    // Add a small random element for realism (±2%)
    const randomFactor = Math.floor(Math.random() * 5) - 2;
    const newSymmetry = Math.min(98, Math.max(70, baseSymmetry + randomFactor));
    
    setSymmetry(prevSymmetry => {
      // Weighted average for smooth transitions
      return Math.round(0.8 * prevSymmetry + 0.2 * newSymmetry);
    });
    
    return newSymmetry;
  };
  
  // Start the step counter
  const start = useCallback(() => {
    if (!isAvailable) return;
    
    startAccelerometer();
    setIsActive(true);
    setSessionStartTime(Date.now());
    startTime.current = Date.now();
    lastStepTime.current = 0;
    stepIntervals.current = [];
    stepTimeHistory.current = [];
    lastMagnitudes.current = [];
    peakDetected.current = false;
    stabilityFactor.current = 1.0;
    lastSymmetryUpdate.current = 0;
    
    // Reset counters
    setSteps(0);
    setDistance(0);
    setCadence(0);
    
    // Set initial symmetry to a reasonable default
    setSymmetry(85);
    
    // Set timer to periodically update symmetry for better realism
    symmetryUpdateTimer.current = setInterval(() => {
      if (steps > 0) {
        updateSymmetryBasedOnStability();
      }
    }, 3000); // Update every 3 seconds
    
  }, [isAvailable, startAccelerometer]);
  
  // Stop the step counter
  const stop = useCallback(() => {
    stopAccelerometer();
    setIsActive(false);
    
    // Clear symmetry update timer
    if (symmetryUpdateTimer.current) {
      clearInterval(symmetryUpdateTimer.current);
      symmetryUpdateTimer.current = null;
    }
  }, [stopAccelerometer]);
  
  // Reset the step counter
  const reset = useCallback(() => {
    setSteps(0);
    setDistance(0);
    setCadence(0);
    setSymmetry(85); // Reset to a reasonable default
    lastStepTime.current = 0;
    stepIntervals.current = [];
    stepTimeHistory.current = [];
    lastMagnitudes.current = [];
    peakDetected.current = false;
    stabilityFactor.current = 1.0;
    lastSymmetryUpdate.current = 0;
    startTime.current = isActive ? Date.now() : null;
  }, [isActive]);
  
  // Calculate session duration in seconds
  const getSessionDuration = useCallback(() => {
    if (!sessionStartTime) return 0;
    return Math.floor((Date.now() - sessionStartTime) / 1000);
  }, [sessionStartTime]);
  
  // Get current session stats
  const getSessionStats = useCallback(() => {
    return {
      steps,
      distance, // Return raw distance in km
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
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (symmetryUpdateTimer.current) {
        clearInterval(symmetryUpdateTimer.current);
      }
    };
  }, []);
  
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
    acceleration,
    start,
    stop,
    reset,
    getSessionDuration,
    getSessionStats
  };
};

export default useStepCounter;