import { useState, useEffect, useRef, useCallback } from 'react';
import useAccelerometer from './useAccelerometer';
import { estimateStepLength } from '../utils/sensorUtils';

// Count steps and distance using phone motion
const useStepCounter = (options = {}) => {
  const {
    stepThreshold = 3.0,       // How much movement counts as a step
    stepCooldown = 250,        // Time between steps (ms)
    userHeight = 170,          // Height in cm for step length
    userGender = 'neutral',    // Gender for step length
    filterCoefficient = 0.5,   // How much to smooth the readings
    onStepDetected = null,     // Run this when a step is found
    enabled = true             // Whether to count steps
  } = options;

  // Keep track of numbers
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [symmetry, setSymmetry] = useState(0);
  
  // Keep track of values between updates
  const lastStepTime = useRef(0);
  const stepIntervals = useRef([]);
  const stepTimeHistory = useRef([]);
  const startTime = useRef(null);
  const stepLengthMeters = useRef(estimateStepLength(userHeight, userGender));
  
  // Get motion data from the phone
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
  
  // Look for steps in the motion data
  useEffect(() => {
    if (!isActive || !isRunning) return;
    
    const now = Date.now();
    const { magnitude } = acceleration;
    
    // Check if enough time has passed since last step
    const timeSinceLastStep = now - lastStepTime.current;
    
    if (timeSinceLastStep > stepCooldown) {
      // Check if movement is big enough to be a step
      if (magnitude > stepThreshold) {
        // Check if movement is different enough from normal
        const isSignificantChange = Math.abs(magnitude - 9.8) > 5;
        
        if (isSignificantChange) {
          // Count the step
          setSteps(prevSteps => {
            const newSteps = prevSteps + 1;
            
            // Work out distance
            const newDistance = (newSteps * stepLengthMeters.current) / 1000; // Convert to km
            setDistance(newDistance);
            
            // Work out steps per minute
            if (lastStepTime.current > 0) {
              const interval = timeSinceLastStep;
              stepIntervals.current.push(interval);
              
              // Keep last 10 intervals
              if (stepIntervals.current.length > 10) {
                stepIntervals.current.shift();
              }
              
              // Keep track of step times
              stepTimeHistory.current.push({
                timestamp: now,
                interval: interval
              });
              
              // Keep last 20 steps
              if (stepTimeHistory.current.length > 20) {
                stepTimeHistory.current.shift();
              }
              
              // Work out steps per minute
              const avgInterval = stepIntervals.current.reduce((a, b) => a + b, 0) / stepIntervals.current.length;
              const stepsPerMinute = Math.round(60000 / avgInterval);
              setCadence(stepsPerMinute);
              
              // Work out how even the steps are
              if (stepTimeHistory.current.length >= 4) {
                calculateSymmetry();
              }
            }
            
            // Tell parent component about the step
            if (onStepDetected) {
              onStepDetected({
                steps: newSteps,
                distance: newDistance,
                timestamp: now
              });
            }
            
            return newSteps;
          });
          
          lastStepTime.current = now;
        }
      }
    }
  }, [acceleration, isActive, isRunning, onStepDetected, stepCooldown, stepThreshold]);
  
  // Work out how even the steps are
  const calculateSymmetry = () => {
    if (stepTimeHistory.current.length < 4) return;
    
    // Work out average time between steps
    const intervals = stepTimeHistory.current.map(step => step.interval);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Work out how much the times vary
    const squaredDiffs = intervals.map(interval => Math.pow(interval - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Work out how consistent the steps are
    const cv = (stdDev / mean) * 100;
    
    // Convert to a percentage (100% = perfect)
    const symmetryValue = Math.min(100, Math.max(0, 100 - cv));
    
    console.log("Step symmetry:", Math.round(symmetryValue), "% from", intervals.length, "steps");
    
    setSymmetry(Math.round(symmetryValue));
  };
  
  // Start counting steps
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
  
  // Stop counting steps
  const stop = useCallback(() => {
    stopAccelerometer();
    setIsActive(false);
  }, [stopAccelerometer]);
  
  // Reset counters
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
  
  // Work out how long the session has been running
  const getSessionDuration = useCallback(() => {
    if (!sessionStartTime) return 0;
    return Math.floor((Date.now() - sessionStartTime) / 1000);
  }, [sessionStartTime]);
  
  // Get all the stats for this session
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
  
  return {
    steps,
    distance,
    cadence,
    symmetry,
    isActive,
    isAvailable,
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