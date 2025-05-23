import React, { useState, useEffect, useRef } from 'react';
import useStepCounter from '../../hooks/useStepCounter';
import Card from '../common/Card';
import Button from '../common/Button';
import './StepTracker.css';

const StepTracker = ({ onSessionComplete, userSettings = {} }) => {
  const {
    height = 170,
    gender = 'neutral',
    stepGoal = 10000
  } = userSettings;
  
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const timerRef = useRef(null);
  
  const {
    steps,
    distance,
    cadence,
    symmetry,
    isAvailable,
    isActive,
    isRunning,
    error,
    usingFallback,
    acceleration,
    start,
    stop,
    reset,
    getSessionStats
  } = useStepCounter({
    userHeight: height,
    userGender: gender,
    enabled: true,
    stepThreshold: 12.0,
    stepCooldown: 300,
    onStepDetected: (data) => {
      console.log('Step detected:', data);
    }
  });
  
  const handleStartTracking = async () => {
    const started = await start();
    if (started) {
      setIsTracking(true);
      setElapsedTime(0);
      
      timerRef.current = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      alert('Failed to start tracking. Please check sensor permissions.');
    }
  };
  
  const handleStopTracking = () => {
    setIsTracking(false);
    stop();
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const sessionStats = getSessionStats();
    if (onSessionComplete) {
      onSessionComplete(sessionStats);
    }
  };
  
  const handleResetTracking = () => {
    setElapsedTime(0);
    reset();
    
    if (isTracking && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    }
  };
  
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  const progressPercentage = Math.min(100, (steps / stepGoal) * 100);
  
  if (!isAvailable) {
    return (
      <Card className="step-tracker-card">
        <div className="tracker-error">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Motion Sensors Not Available</h3>
          <p>
            Your device doesn't support motion sensors or they're not accessible.
            Please try on a mobile device with motion sensor support.
          </p>
        </div>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="step-tracker-card">
        <div className="tracker-error">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Sensor Error</h3>
          <p>{error}</p>
          {usingFallback && (
            <p className="fallback-message">
              Using fallback motion detection. Results may be less accurate.
            </p>
          )}
          <Button onClick={handleStartTracking} variant="primary">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="step-tracker-card">
      <div className="tracker-header">
        <h3>Step Tracker</h3>
        <button 
          className="debug-toggle"
          onClick={() => setShowDebug(!showDebug)}
          style={{ 
            background: 'none', 
            border: '1px solid #ccc', 
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px'
          }}
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>
      </div>
      
      <div className="tracker-controls">
        {!isTracking ? (
          <Button 
            variant="primary" 
            className="tracker-start-btn"
            onClick={handleStartTracking}
            disabled={!isAvailable}
          >
            Start Tracking
          </Button>
        ) : (
          <>
            <Button 
              variant="danger" 
              className="tracker-stop-btn"
              onClick={handleStopTracking}
            >
              Stop & Save
            </Button>
            <Button 
              variant="secondary" 
              className="tracker-reset-btn"
              onClick={handleResetTracking}
            >
              Reset
            </Button>
          </>
        )}
      </div>
      
      {showDebug && (
        <div className="tracker-debug">
          <div className="debug-item">
            <strong>Status:</strong> {isActive ? 'Active' : 'Inactive'} / {isRunning ? 'Running' : 'Stopped'}
          </div>
          <div className="debug-item">
            <strong>Sensor:</strong> {usingFallback ? 'DeviceMotion' : 'Accelerometer'}
          </div>
          <div className="debug-item">
            <strong>Acceleration:</strong> 
            X: {acceleration.x.toFixed(2)}, 
            Y: {acceleration.y.toFixed(2)}, 
            Z: {acceleration.z.toFixed(2)}
          </div>
          <div className="debug-item">
            <strong>Magnitude:</strong> {acceleration.magnitude.toFixed(2)}
          </div>
        </div>
      )}
      
      <div className="tracker-metrics">
        <div className="tracker-metric-item">
          <div className="metric-value">{steps.toLocaleString()}</div>
          <div className="metric-label">Steps</div>
        </div>
        
        <div className="tracker-metric-item">
          <div className="metric-value">{distance.toFixed(2)}</div>
          <div className="metric-label">Distance (km)</div>
        </div>
        
        <div className="tracker-metric-item">
          <div className="metric-value">{cadence || 0}</div>
          <div className="metric-label">Steps/min</div>
        </div>
        
        <div className="tracker-metric-item">
          <div className="metric-value">
            {symmetry !== null ? `${symmetry}%` : '--'}
          </div>
          <div className="metric-label">Gait Symmetry</div>
        </div>
      </div>
      
      <div className="tracker-timer">
        <div className="timer-display">{formatTime(elapsedTime)}</div>
        <div className="timer-label">Duration</div>
      </div>
      
      <div className="tracker-progress">
        <div className="progress-label">
          <span>Daily Goal</span>
          <span>{steps.toLocaleString()} / {stepGoal.toLocaleString()}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {usingFallback && (
        <div className="fallback-notice">
          Using device motion sensors (may be less accurate)
        </div>
      )}
    </Card>
  );
};

export default StepTracker;