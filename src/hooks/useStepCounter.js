import { useState, useEffect, useRef, useCallback } from 'react';
import useAccelerometer from './useAccelerometer';
import { estimateStepLength } from '../utils/sensorUtils';

/**
 * Hook to count steps and calculate distance using device motion sensors
 */
const useStepCounter = (options = {}) => {
  const {
    stepThreshold = 11.0,      // Threshold to detect a step
    stepCooldown = 250,        // Minimum time between steps in ms
    userHeight = 170,          // User height in cm for step length calculation
    userGender = 'neutral',    // User gender for step length calculation
    filterCoefficient = 0.2,   // Low-pass filter coefficient
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
  const lastMagnitude = useRef(9.8); // Track last magnitude for peak detection
  const isPeak = useRef(false); // Track if we're in a peak
  const motionBuffer = useRef([]); // Buffer to detect actual motion
  
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
  
  // Helper function to calculate variance
  const calculateVariance = (values) => {
    if (!values || values.length <= 1) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  };
  
  // Step detection algorithm
  useEffect(() => {
    if (!isActive || !isRunning) return;
    
    const now = Date.now();
    const { magnitude } = acceleration;
    
    // Add to motion buffer
    motionBuffer.current.push(magnitude);
    if (motionBuffer.current.length > 10) {
      motionBuffer.current.shift();
    }
    
    // Calculate motion variance to detect if the user is actually moving
    const motionVariance = calculateVariance(motionBuffer.current);
    const isInMotion = motionVariance > 0.15; // Lower threshold for better sensitivity
    
    // Check if we're past the cooldown period
    const timeSinceLastStep = now - lastStepTime.current;
    
    if (timeSinceLastStep > stepCooldown) {
      // Step detection with improved peak detection
      if (magnitude > stepThreshold && magnitude > lastMagnitude.current && !isPeak.current) {
        isPeak.current = true;
        
        // Increment step count
        setSteps(prevSteps => {
          const newSteps = prevSteps + 1;
          
          // Update distance based on step length
          const newDistance = newSteps * stepLengthMeters.current;
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
            
            // Calculate symmetry from step intervals
            if (stepTimeHistory.current.length >= 6) {
              calculateSymmetry();
            }
          }
          
          // Update last step time
          lastStepTime.current = now;
          
          // Call the callback if provided
          if (onStepDetected) {
            onStepDetected({
              steps: newSteps,
              distance: newDistance,
              timestamp: now
            });
          }
          
          console.log("Step detected!", newSteps);
          return newSteps;
        });
      } 
      // Important: Reset isPeak when magnitude drops below threshold
      else if (magnitude < stepThreshold - 1) {
        isPeak.current = false;
      }
    }
    
    // Update last magnitude
    lastMagnitude.current = magnitude;
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
    isPeak.current = false;
    
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
      distance: parseFloat(distance.toFixed(2)),
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
    start,
    stop,
    reset,
    getSessionDuration,
    getSessionStats
  };
};

export default useStepCounter;