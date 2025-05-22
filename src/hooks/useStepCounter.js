import { useState, useEffect, useRef, useCallback } from 'react';
import useAccelerometer from './useAccelerometer'; // Still used for permission & availability
import { estimateStepLength } from '../utils/sensorUtils';

const useStepCounter = (options = {}) => {
  const {
    // stepThreshold, stepCooldown, filterCoefficient are no longer directly used for simulation
    userHeight = 170,
    userGender = 'neutral',
    onStepDetected = null,
    enabled = true,
    // demoMode option is effectively overridden by this new simulation logic
  } = options;

  // State
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [symmetry, setSymmetry] = useState(75); // Initial default symmetry
  
  // Refs for simulation and tracking
  const simulationIntervalRef = useRef(null);
  const simulationElapsedTimeRef = useRef(0); // in seconds
  const stepLengthMeters = useRef(estimateStepLength(userHeight, userGender));
  
  // Accelerometer hook is still used for permissions and sensor availability status
  const {
    // acceleration data is ignored for simulation
    isAvailable,
    isRunning: accelerometerIsRunning, // Renamed to avoid conflict
    error: accelerometerError,
    usingFallback,
    start: startAccelerometer,
    stop: stopAccelerometer
  } = useAccelerometer({
    // filterCoefficient: options.filterCoefficient, // Pass through if needed by useAccelerometer
    enabled // Pass the enabled prop to the accelerometer hook
  });
  
  // Simulation effect
  useEffect(() => {
    if (isActive && enabled) {
      simulationIntervalRef.current = setInterval(() => {
        simulationElapsedTimeRef.current += 1; // Increment elapsed time by 1 second

        // 1. Simulate Steps
        const newStepsThisInterval = Math.random() < 0.5 ? 1 : 2;
        setSteps(prevSteps => {
          const updatedSteps = prevSteps + newStepsThisInterval;
          
          // Update distance
          const newDistance = (updatedSteps * stepLengthMeters.current) / 1000;
          setDistance(newDistance);

          if (onStepDetected) {
            onStepDetected({
              steps: updatedSteps,
              timestamp: Date.now()
            });
          }
          return updatedSteps;
        });

        // 2. Simulate Cadence (simple estimation: 60-120 steps/min)
        setCadence(60 + Math.floor(Math.random() * 61));

        // 3. Simulate Symmetry
        const elapsedSeconds = simulationElapsedTimeRef.current;
        if (elapsedSeconds <= 8) {
          // High symmetry phase
          setSymmetry(Math.floor(Math.random() * (98 - 85 + 1)) + 85);
        } else if (elapsedSeconds <= 11) {
          // Hold symmetry phase (no change)
        } else {
          // Decrease symmetry phase
          setSymmetry(prevSymmetry => {
            const decreaseAmount = Math.floor(Math.random() * 3) + 1; // Decrease by 1-3 points
            return Math.max(50, prevSymmetry - decreaseAmount);
          });
        }
      }, 1000); // Update every second
    } else {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
    }

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [isActive, enabled, onStepDetected, userHeight, userGender]); // stepLengthMeters.current changes with height/gender

  const start = useCallback(() => {
    if (!enabled) return;
    // Request sensor access / start accelerometer if not already running
    // This ensures permission prompt if needed
    if (!accelerometerIsRunning && isAvailable) {
        startAccelerometer();
    }

    setIsActive(true);
    const now = Date.now();
    setSessionStartTime(now);
    
    // Reset simulation state
    setSteps(0);
    setDistance(0);
    setCadence(0);
    setSymmetry(75); // Start with initial symmetry
    simulationElapsedTimeRef.current = 0;

    // Clear any existing interval before starting a new one (belt and braces)
    if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
    }

  }, [enabled, startAccelerometer, accelerometerIsRunning, isAvailable]);
  
  const stop = useCallback(() => {
    setIsActive(false);
    // stopAccelerometer(); // Optionally stop the physical sensor if desired
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
  }, [/*stopAccelerometer*/]);
  
  const reset = useCallback(() => {
    setSteps(0);
    setDistance(0);
    setCadence(0);
    setSymmetry(75); // Reset to initial symmetry
    simulationElapsedTimeRef.current = 0;
    
    if (isActive) {
      const now = Date.now();
      setSessionStartTime(now);
       // Interval will continue if isActive is true, and logic will restart due to elapsed time reset
    } else {
      setSessionStartTime(null);
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
    }
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
      usingFallback // from useAccelerometer
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
    isAvailable, // Sensor availability
    isActive,    // Simulation active state
    isRunning: isActive, // Publicly, isRunning means simulation is running
    error: accelerometerError, // Sensor error
    usingFallback, // Sensor fallback status
    start,
    stop,
    reset,
    getSessionDuration,
    getSessionStats
  };
};

export default useStepCounter;