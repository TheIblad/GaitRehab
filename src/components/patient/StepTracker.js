import React, { useState, useEffect, useRef, useCallback } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import useStepCounter from '../../hooks/useStepCounter'; // Changed to default import
// import { useAccelerometer } from '../../hooks/useAccelerometer'; // Remove if only for debug
import { isMobileOrTablet, estimateStepLength } from '../../utils/sensorUtils'; // Assuming this path
import './StepTracker.css';

// Shows how many steps you've taken and other walking info
const StepTracker = ({ onSessionComplete, userSettings = {} }) => {
  // Get user's info for better step counting
  const {
    height = 170,
    gender = 'neutral',
    stepGoal = 10000
  } = userSettings;

  // Keep track of what's happening
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  const timerRef = useRef(null);

  // Get step counting info
  const {
    steps,
    distance,
    cadence,
    symmetry,
    isAvailable,
    // isActive, // isActive from useStepCounter might be what you mean by isRunning from useAccelerometer
    error,
    usingFallback,
    start,
    stop,
    reset,
    getSessionStats
  } = useStepCounter({
    userHeight: height,
    userGender: gender,
    enabled: true
  });

  // Remove this if it was only for the debug display
  // const { acceleration } = useAccelerometer({
  //   filterCoefficient: 0.3,
  //   enabled: isTracking // Only enable if tracking, if you were to keep it for other reasons
  // });

  // Check if we're on a phone
  useEffect(() => {
    setIsMobileDevice(isMobileOrTablet());
  }, []);

  // ... (rest of your useEffects and handlers for handleStartTracking, handleStopTracking, etc.)

  // Start counting steps
  const handleStartTracking = useCallback(() => {
    if (!isAvailable) {
      // Handle sensor not available, perhaps show error
      console.error("Sensor not available for step tracking.");
      // You might want to request permission here if applicable
      return;
    }
    start();
    setIsTracking(true);
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime(prevTime => prevTime + 1);
    }, 1000);
  }, [start, isAvailable]);

  // Stop counting steps
  const handleStopTracking = useCallback(() => {
    stop();
    setIsTracking(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (onSessionComplete) {
      onSessionComplete(getSessionStats());
    }
  }, [stop, onSessionComplete, getSessionStats]);

  // Start over
  const handleResetTracking = useCallback(() => {
    reset();
    setElapsedTime(0);
    if (isTracking) { // If currently tracking, stop and restart timer
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    } else { // If not tracking, just ensure timer is cleared
      clearInterval(timerRef.current);
    }
  }, [reset, isTracking]);

  // Show time in minutes and seconds
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
    const seconds = (timeInSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // Clean up when we're done
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (isTracking) { // Ensure sensor is stopped if component unmounts while tracking
        stop();
      }
    };
  }, [isTracking, stop]);

  // Work out how close we are to the goal
  const progressPercentage = stepGoal > 0 ? Math.min(100, (steps / stepGoal) * 100) : 0;

  // Show a message if not on a phone
  if (!isMobileDevice) {
    return (
      <Card className="step-tracker-card desktop-warning">
        <div className="tracker-error">
          <i className="fas fa-desktop"></i>
          <h3>Device Not Supported</h3>
          <p>Step tracking is best experienced on a mobile device with motion sensors. Please open this page on your phone.</p>
        </div>
      </Card>
    );
  }

  if (error || (!isAvailable && !permissionDenied && !showPermissionPrompt) ) {
    return (
      <Card className="step-tracker-card">
        <div className="tracker-error">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Sensor Error</h3>
          <p>{error || "Motion sensors are not available or supported on this device."}</p>
          {usingFallback && <p className="fallback-message">Using fallback motion detection. Accuracy may vary.</p>}
        </div>
      </Card>
    );
  }
  
  // ... (rest of your component including the JSX)
  // Make sure to remove any JSX that was displaying acceleration.x, y, z, and magnitude.
  // For example, if you had a div like this, remove it:
  // <div className="debug-accelerometer-info">
  //   <p>X: {acceleration.x.toFixed(2)}</p>
  //   <p>Y: {acceleration.y.toFixed(2)}</p>
  //   <p>Z: {acceleration.z.toFixed(2)}</p>
  //   <p>Magnitude: {acceleration.magnitude.toFixed(2)}</p>
  // </div>

  return (
    <Card className="step-tracker-card">
      <h3>Live Step Tracker</h3>
      
      {/* Show if the sensor is working */}
      <div className="sensor-status">
        <span className={`status-indicator ${isAvailable && !error ? 'status-ready' : 'status-error'}`}></span>
        <span className="status-text">
          {isAvailable && !error ? (usingFallback ? 'Sensor Ready (Fallback)' : 'Sensor Ready') : (error || 'Sensor Not Available')}
        </span>
      </div>

      {/* Show how long we've been tracking */}
      <div className="tracker-timer">
        <div className="timer-display">{formatTime(elapsedTime)}</div>
        <div className="timer-label">Elapsed Time</div>
      </div>

      {/* Show progress towards step goal */}
      {stepGoal > 0 && (
        <div className="tracker-progress">
          <div className="progress-label">
            <span>Progress</span>
            <span>{steps} / {stepGoal} steps</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
      )}

      {/* Show all the numbers */}
      <div className="tracker-metrics">
        <div className="metric-item">
          <div className="metric-value">{steps}</div>
          <div className="metric-label">Steps</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">{distance.toFixed(2)}</div>
          <div className="metric-label">Distance (km)</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">{cadence}</div>
          <div className="metric-label">Cadence (spm)</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">{symmetry}%</div>
          <div className="metric-label">Symmetry</div>
        </div>
      </div>

      {/* Show start/stop buttons */}
      <div className="tracker-controls">
        {!isTracking ? (
          <Button onClick={handleStartTracking} disabled={!isAvailable || permissionDenied} className="tracker-start-btn">
            Start Tracking
          </Button>
        ) : (
          <Button onClick={handleStopTracking} className="tracker-stop-btn">
            Stop Tracking
          </Button>
        )}
        <Button onClick={handleResetTracking} variant="secondary" className="tracker-reset-btn" disabled={steps === 0 && elapsedTime === 0}>
          Reset
        </Button>
      </div>
      
      {/* ... (rest of your JSX like user-settings, compatibility-note etc.) ... */}

    </Card>
  );
};

export default StepTracker;