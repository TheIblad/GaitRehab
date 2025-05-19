import { useState, useEffect, useRef, useCallback } from 'react';
import useAccelerometer from './useAccelerometer';
import { estimateStepLength } from '../utils/sensorUtils';

/**
 * Hook to count steps and calculate distance using device motion sensors
 */
const useStepCounter = (options = {}) => {
  const {
    stepThreshold = 15.0,      // Increased threshold to reduce false positives
    stepCooldown = 500,        // Increased cooldown to prevent rapid counting
    userHeight = 170,          // User height in cm for step length calculation
    userGender = 'neutral',    // User gender for step length calculation
    filterCoefficient = 0.3,   // Low-pass filter coefficient
    onStepDetected = null,     // Callback when a step is detected
    enabled = true            // Whether the step counter is enabled
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
        // Check if this is a significant enough change from previous readings
        const isSignificantChange = Math.abs(magnitude - 9.8) > 5; // Must deviate significantly from gravity
        
        if (isSignificantChange) {
          // Increment step count
          setSteps(prevSteps => {
            const newSteps = prevSteps + 1;
            
            // Update distance based on step length
            const newDistance = newSteps * stepLengthMeters.current;
            setDistance(newDistance);
            
            // Record step interval for cadence calculation
            if (lastStepTime.current > 0) {
              stepIntervals.current.push(timeSinceLastStep);
              
              // Keep last 10 intervals for calculations
              if (stepIntervals.current.length > 10) {
                stepIntervals.current.shift();
              }
              
              // Calculate cadence (steps per minute)
              const avgInterval = stepIntervals.current.reduce((a, b) => a + b, 0) / stepIntervals.current.length;
              const stepsPerMinute = Math.round(60000 / avgInterval);
              setCadence(stepsPerMinute);
              
              // Record step time for symmetry analysis
              stepTimeHistory.current.push({
                timestamp: now,
                interval: timeSinceLastStep
              });
              
              // Keep last 20 steps for symmetry calculation
              if (stepTimeHistory.current.length > 20) {
                stepTimeHistory.current.shift();
              }
              
              // Calculate symmetry from step intervals
              // This is a simplified approach - real gait asymmetry needs more complex analysis
              if (stepTimeHistory.current.length >= 6) {
                calculateSymmetry();
              }
            }
            
            // Fire callback if provided
            if (onStepDetected) {
              onStepDetected({
                steps: newSteps,
                distance: newDistance,
                timestamp: now
              });
            }
            
            return newSteps;
          });
          
          // Update last step time
          lastStepTime.current = now;
        }
      }
    }
  }, [acceleration, isActive, isRunning, onStepDetected, stepCooldown, stepThreshold]);
  
  // Calculate gait symmetry from step intervals
  const calculateSymmetry = () => {
    // Calculate mean interval
    const intervals = stepTimeHistory.current.map(step => step.interval);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Calculate standard deviation
    const squaredDiffs = intervals.map(interval => Math.pow(interval - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate coefficient of variation (CV)
    const cv = (stdDev / mean) * 100;
    
    // Convert to symmetry percentage (100% - asymmetry)
    // Lower CV means more consistent steps, which suggests better symmetry
    const symmetryValue = Math.min(100, Math.max(0, 100 - cv));
    
    setSymmetry(Math.round(symmetryValue));
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
      distance: distance.toFixed(2),
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
    distance: parseFloat(distance.toFixed(2)),
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