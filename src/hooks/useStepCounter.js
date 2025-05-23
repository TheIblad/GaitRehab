import { useState, useEffect, useRef, useCallback } from 'react';
import useAccelerometer from './useAccelerometer';
import { 
  estimateStepLength, 
  calculateGaitSymmetry, 
  calculateCadence,
  detectStepPeak 
} from '../utils/sensorUtils';

const useStepCounter = (options = {}) => {
  const {
    stepThreshold = 12.0,
    stepCooldown = 300,
    userHeight = 170,
    userGender = 'neutral',
    filterCoefficient = 0.3,
    onStepDetected = null,
    enabled = true
  } = options;

  // State
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [symmetry, setSymmetry] = useState(null);

  // Tracking refs
  const lastStepTime = useRef(0);
  const peakDetected = useRef(false);
  const stepIntervals = useRef([]);
  const stepTimings = useRef([]);
  const magnitudeHistory = useRef([]);
  const stepLengthMeters = useRef(estimateStepLength(userHeight, userGender));

  // Use accelerometer hook
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

    // Store magnitude history for peak detection
    magnitudeHistory.current.push(magnitude);
    if (magnitudeHistory.current.length > 10) {
      magnitudeHistory.current.shift();
    }

    const timeSinceLastStep = now - lastStepTime.current;

    // Only detect steps if enough time has passed since last step
    if (timeSinceLastStep > stepCooldown) {
      const isPeak = detectStepPeak(
        magnitude,
        stepThreshold,
        magnitudeHistory.current,
        peakDetected.current
      );

      if (isPeak) {
        peakDetected.current = true;

        // Process the step
        setSteps(prevSteps => {
          const newSteps = prevSteps + 1;
          
          // Update distance
          const newDistance = (newSteps * stepLengthMeters.current) / 1000;
          setDistance(newDistance);

          // Record step timing for symmetry and cadence
          if (lastStepTime.current > 0) {
            const interval = timeSinceLastStep;
            
            stepIntervals.current.push(interval);
            if (stepIntervals.current.length > 10) {
              stepIntervals.current.shift();
            }

            stepTimings.current.push({
              timestamp: now,
              interval
            });
            if (stepTimings.current.length > 20) {
              stepTimings.current.shift();
            }

            // Update cadence
            const newCadence = calculateCadence(stepIntervals.current);
            setCadence(newCadence);

            // Update symmetry (only every few steps for stability)
            if (newSteps % 2 === 0 && stepTimings.current.length >= 6) {
              const newSymmetry = calculateGaitSymmetry(stepTimings.current);
              if (newSymmetry !== null) {
                setSymmetry(prev => {
                  // Smooth the symmetry updates
                  if (prev === null) return newSymmetry;
                  return Math.round(prev * 0.7 + newSymmetry * 0.3);
                });
              }
            }
          }

          // Call step detected callback
          if (onStepDetected) {
            onStepDetected({
              steps: newSteps,
              timestamp: now,
              magnitude
            });
          }

          return newSteps;
        });

        lastStepTime.current = now;
      }
    } else if (magnitude < stepThreshold * 0.6) {
      // Reset peak detection when magnitude drops
      peakDetected.current = false;
    }
  }, [
    acceleration, 
    isActive, 
    isRunning, 
    stepThreshold, 
    stepCooldown, 
    onStepDetected
  ]);

  const start = useCallback(async () => {
    if (!isAvailable) {
      console.log('Sensors not available');
      return false;
    }

    // Start the accelerometer
    const started = await startAccelerometer();
    if (!started) {
      console.log('Failed to start accelerometer');
      return false;
    }

    // Reset state
    setIsActive(true);
    const now = Date.now();
    setSessionStartTime(now);
    
    // Reset counters and tracking
    setSteps(0);
    setDistance(0);
    setCadence(0);
    setSymmetry(null);
    
    lastStepTime.current = 0;
    peakDetected.current = false;
    stepIntervals.current = [];
    stepTimings.current = [];
    magnitudeHistory.current = [];

    console.log('Step counter started');
    return true;
  }, [isAvailable, startAccelerometer]);

  const stop = useCallback(() => {
    setIsActive(false);
    stopAccelerometer();
    console.log('Step counter stopped');
  }, [stopAccelerometer]);

  const reset = useCallback(() => {
    setSteps(0);
    setDistance(0);
    setCadence(0);
    setSymmetry(null);
    
    lastStepTime.current = 0;
    peakDetected.current = false;
    stepIntervals.current = [];
    stepTimings.current = [];
    magnitudeHistory.current = [];
    
    if (isActive) {
      setSessionStartTime(Date.now());
    } else {
      setSessionStartTime(null);
    }
    
    console.log('Step counter reset');
  }, [isActive]);

  const getSessionDuration = useCallback(() => {
    if (!sessionStartTime) return 0;
    return Math.floor((Date.now() - sessionStartTime) / 1000);
  }, [sessionStartTime]);

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

  // Update step length when height/gender changes
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
    acceleration, // Include for debugging
    start,
    stop,
    reset,
    getSessionDuration,
    getSessionStats
  };
};

export default useStepCounter;