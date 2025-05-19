import { useState, useEffect, useRef, useCallback } from 'react';
import useAccelerometer from './useAccelerometer';
import { estimateStepLength } from '../utils/sensorUtils';

/**
 * Hook to count steps and calculate distance using device motion sensors
 */
const useStepCounter = (options = {}) => {
  const {
    stepThreshold = 3.0,       // MUCH lower threshold for better sensitivity on mobile
    stepCooldown = 250,        // Shorter cooldown to detect steps more frequently
    userHeight = 170,          // User height in cm for step length calculation
    userGender = 'neutral',    // User gender for step length calculation
    filterCoefficient = 0.5,   // Higher coefficient for faster response to changes
    onStepDetected = null,     // Callback when a step is detected
    enabled = true             // Whether the step counter is enabled
  } = options;

  // State
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [symmetry, setSymmetry] = useState(0);
  
  // Refs for tracking between renders
  const lastStepTime = useRef(0);
  const stepIntervals = useRef([]);
  const stepTimeHistory = useRef([]);
  const startTime = useRef(null);
  const stepLengthMeters = useRef(estimateStepLength(userHeight, userGender));
  
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
    
    // Check if we're past the cooldown period
    const timeSinceLastStep = now - lastStepTime.current;
    
    if (timeSinceLastStep > stepCooldown) {
      // Enhanced peak detection with additional checks
      if (magnitude > stepThreshold) {
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
            const stepsPerMinute = Math.round(60000 / avgInterval);
            setCadence(stepsPerMinute);
            
            // Calculate symmetry at regular intervals
            if (stepTimeHistory.current.length >= 4 && newSteps % 2 === 0) {
              calculateSymmetry();
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
    }
  }, [acceleration, isActive, isRunning, onStepDetected, stepCooldown, stepThreshold]);
  
  // Calculate gait symmetry from step intervals
  const calculateSymmetry = () => {
    if (stepTimeHistory.current.length < 4) return; // Need at least 4 steps
    
    // Calculate mean interval
    const intervals = stepTimeHistory.current.map(step => step.interval);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    if (mean === 0) return; // Avoid division by zero
    
    // Calculate standard deviation
    const squaredDiffs = intervals.map(interval => Math.pow(interval - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate coefficient of variation (CV)
    const cv = (stdDev / mean) * 100;
    
    // Improve the symmetry calculation - the current approach makes it almost always 0
    // Lower CV means more consistent steps, which suggests better symmetry
    // Scale this more realistically - an excellent CV of 10% should map to high symmetry (90%)
    const symmetryValue = Math.min(100, Math.max(0, Math.round(100 - cv/2)));
    
    console.log("Raw CV:", cv);
    console.log("Calculated symmetry:", symmetryValue, "% from", intervals.length, "intervals");
    
    // Ensure we're getting a reasonable range: typical values should be 50-90%
    // Even with poor symmetry, values shouldn't be constantly near zero
    setSymmetry(symmetryValue);
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
    
    // Reset counters
    setSteps(0);
    setDistance(0);
    setCadence(0);
    setSymmetry(0);
  }, [isAvailable, startAccelerometer]);
  
  // Stop the step counter
  const stop = useCallback(() => {
    stopAccelerometer();
    setIsActive(false);
  }, [stopAccelerometer]);
  
  // Reset the step counter
  const reset = useCallback(() => {
    setSteps(0);
    setDistance(0);
    setCadence(0);
    setSymmetry(0);
    lastStepTime.current = 0;
    stepIntervals.current = [];
    stepTimeHistory.current = [];
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
  
  return {
    steps,
    distance, // Return raw distance in km
    cadence,
    symmetry,
    isAvailable,
    isActive,
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