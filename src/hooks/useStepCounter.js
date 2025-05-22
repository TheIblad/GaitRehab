import { useState, useEffect, useRef, useCallback } from 'react';
import useAccelerometer from './useAccelerometer';
import { estimateStepLength } from '../utils/sensorUtils';

const useStepCounter = (options = {}) => {
  const {
    stepThreshold = 10.0,
    stepCooldown = 350,
    userHeight = 178,
    userGender = 'neutral',
    filterCoefficient = 0.3,
    onStepDetected = null,
    enabled = true,
    demoMode = true
  } = options;

  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [cadence, setCadence] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [symmetry, setSymmetry] = useState(75);
  
  const lastStepTime = useRef(0);
  const peakDetected = useRef(false);
  const stepIntervals = useRef([]);
  const stepTimeHistory = useRef([]);
  const startTime = useRef(null);
  const stepLengthMeters = useRef(estimateStepLength(userHeight, userGender));
  const lastMagnitudes = useRef([]);
  const demoStartTime = useRef(null);
  const lastSymmetryUpdate = useRef(0);
  const symmetryUpdateInterval = useRef(1500);
  const lastDemoUpdate = useRef(0);
  
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
  
  const calculateSymmetry = useCallback(() => {
    if (stepTimeHistory.current.length < 6) {
      return null;
    }

    const intervals = stepTimeHistory.current.map(step => step.interval);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (mean === 0) return null;
    
    const squaredDiffs = intervals.map(interval => Math.pow(interval - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100;
    
    let calculatedSymmetry = 100 - (cv * 1.5);
    calculatedSymmetry = Math.min(98, Math.max(50, Math.round(calculatedSymmetry)));
    
    return calculatedSymmetry;
  }, []);
  
  useEffect(() => {
    if (!isActive || !isRunning) return;
    
    const now = Date.now();
    const { magnitude } = acceleration;
    
    if (demoMode && isActive) {
      const elapsedSeconds = demoStartTime.current ? (now - demoStartTime.current) / 1000 : 0;
      const timeSinceLastUpdate = now - lastDemoUpdate.current;
      
      if (timeSinceLastUpdate > 2000) {
        lastDemoUpdate.current = now;
        
        if (elapsedSeconds <= 10) {
          const highSymmetry = Math.floor(Math.random() * 9) + 90;
          setSymmetry(highSymmetry);
        } else {
          const lowerSymmetry = Math.floor(Math.random() * 16) + 60;
          setSymmetry(lowerSymmetry);
        }
      }
    }
    
    lastMagnitudes.current.push(magnitude);
    if (lastMagnitudes.current.length > 5) {
      lastMagnitudes.current.shift();
    }
    
    const timeSinceLastStep = now - lastStepTime.current;
    
    if (timeSinceLastStep > stepCooldown) {
      const isPeak = magnitude > stepThreshold && 
                     !peakDetected.current &&
                     lastMagnitudes.current.length >= 3;
      
      if (isPeak) {
        peakDetected.current = true;
        
        setSteps(prevSteps => {
          const newSteps = prevSteps + 1;
          
          const newDistance = (newSteps * stepLengthMeters.current) / 1000;
          setDistance(newDistance);
          
          if (lastStepTime.current > 0) {
            const interval = timeSinceLastStep;
            stepIntervals.current.push(interval);
            
            if (stepIntervals.current.length > 10) {
              stepIntervals.current.shift();
            }
            
            stepTimeHistory.current.push({
              timestamp: now,
              interval: interval
            });
            
            if (stepTimeHistory.current.length > 20) {
              stepTimeHistory.current.shift();
            }
            
            const avgInterval = stepIntervals.current.reduce((a, b) => a + b, 0) / stepIntervals.current.length;
            const stepsPerMinute = Math.round(60000 / avgInterval);
            setCadence(stepsPerMinute);
            
            if (!demoMode && 
                newSteps >= 6 && 
                newSteps % 2 === 0 && 
                (now - lastSymmetryUpdate.current) > symmetryUpdateInterval.current) {
              
              const newSymmetry = calculateSymmetry();
              if (newSymmetry !== null) {
                lastSymmetryUpdate.current = now;
                
                setSymmetry(prevSymmetry => {
                  return Math.round(prevSymmetry * 0.7 + newSymmetry * 0.3);
                });
              }
            }
          }
          
          if (onStepDetected) {
            onStepDetected({
              steps: newSteps,
              timestamp: now
            });
          }
          
          return newSteps;
        });
        
        lastStepTime.current = now;
      }
    } else if (magnitude < stepThreshold * 0.6) {
      peakDetected.current = false;
    }
  }, [acceleration, isActive, isRunning, onStepDetected, stepCooldown, stepThreshold, demoMode, calculateSymmetry]);
  
  const start = useCallback(() => {
    if (!isAvailable) return;
    
    startAccelerometer();
    setIsActive(true);
    const now = Date.now();
    setSessionStartTime(now);
    startTime.current = now;
    
    if (demoMode) {
      demoStartTime.current = now;
      lastDemoUpdate.current = now;
      const initialSymmetry = Math.floor(Math.random() * 9) + 90;
      setSymmetry(initialSymmetry);
    } else {
      setSymmetry(75);
    }

    lastStepTime.current = 0;
    peakDetected.current = false;
    stepIntervals.current = [];
    stepTimeHistory.current = [];
    lastMagnitudes.current = [];
    lastSymmetryUpdate.current = 0;
    
    setSteps(0);
    setDistance(0);
    setCadence(0);
  }, [isAvailable, startAccelerometer, demoMode]);
  
  const stop = useCallback(() => {
    stopAccelerometer();
    setIsActive(false);
    demoStartTime.current = null;
  }, [stopAccelerometer]);
  
  const reset = useCallback(() => {
    setSteps(0);
    setDistance(0);
    setCadence(0);
    
    if (demoMode) {
      const initialSymmetry = Math.floor(Math.random() * 9) + 90;
      setSymmetry(initialSymmetry);
      demoStartTime.current = Date.now();
      lastDemoUpdate.current = Date.now();
    } else {
      setSymmetry(75);
    }

    lastStepTime.current = 0;
    peakDetected.current = false;
    stepIntervals.current = [];
    stepTimeHistory.current = [];
    lastMagnitudes.current = [];
    lastSymmetryUpdate.current = 0;
    
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