import React, { useState, useEffect, useRef } from 'react';
import useStepCounter from '../../hooks/useStepCounter';
import useAccelerometer from '../../hooks/useAccelerometer';
import Card from '../common/Card';
import Button from '../common/Button';
import './StepTracker.css';

const StepTracker = ({ onSessionComplete, userSettings = {} }) => {
  // Get user settings with defaults
  const {
    height = 170,
    gender = 'neutral',
    stepGoal = 10000
  } = userSettings;
  
  // State for the tracker
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Timer ref
  const timerRef = useRef(null);
  
  // Use our step counter hook
  const {
    steps,
    distance,
    cadence,
    symmetry,
    isAvailable,
    isActive,
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
  
  // Get acceleration data from useAccelerometer directly
  const { acceleration } = useAccelerometer({
    filterCoefficient: 0.3,
    enabled: true
  });
  
  // Check for sensor permission on mount
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'accelerometer' })
        .then(result => {
          if (result.state === 'prompt') {
            setShowPermissionPrompt(true);
          } else if (result.state === 'denied') {
            setPermissionDenied(true);
          }
        })
        .catch(err => {
          console.warn('Could not check permissions:', err);
          // If permission check fails, we'll try to use the sensor anyway
          // and let the browser handle permission prompts
        });
    }
  }, []);
  
  // Start tracking function
  const handleStartTracking = () => {
    setIsTracking(true);
    setElapsedTime(0);
    start();
    
    // Start the timer
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };
  
  // Stop tracking function
  const handleStopTracking = () => {
    setIsTracking(false);
    stop();
    
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Get final stats and send to parent component
    const sessionStats = getSessionStats();
    if (onSessionComplete) {
      onSessionComplete({
        ...sessionStats,
        endTime: Date.now(),
        duration: elapsedTime
      });
    }
  };
  
  // Reset tracking function
  const handleResetTracking = () => {
    reset();
    setElapsedTime(0);
  };
  
  // Format time from seconds to MM:SS
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Calculate progress towards goal
  const progressPercentage = Math.min(100, (steps / stepGoal) * 100);
  
  // If sensors are not available
  if (error || !isAvailable) {
    return (
      <Card className="step-tracker-card error-state">
        <h3>Step Tracker</h3>
        <div className="tracker-error">
          <i className="fas fa-exclamation-triangle"></i>
          <p>
            {permissionDenied 
              ? 'Permission to access motion sensors was denied. Please enable sensor access in your browser settings.' 
              : error || 'Motion sensors are not available on this device or browser.'}
          </p>
          <p className="fallback-message">
            You can still log activities manually using the "Log Activity" button.
          </p>
        </div>
      </Card>
    );
  }
  
  // If we need permission
  if (showPermissionPrompt) {
    return (
      <Card className="step-tracker-card permission-state">
        <h3>Step Tracker</h3>
        <div className="permission-prompt">
          <p>This feature needs access to your device's motion sensors to count steps.</p>
          <Button 
            variant="primary" 
            onClick={() => {
              setShowPermissionPrompt(false);
              start(); // This will trigger the browser permission prompt
              stop(); // Immediately stop after permission is granted
            }}
          >
            Allow Access
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowPermissionPrompt(false)}
          >
            Maybe Later
          </Button>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="step-tracker-card">
      <h3>Step Tracker</h3>
      
      {/* Tracking controls at the top */}
      <div className="tracker-controls" style={{ marginBottom: '16px' }}>
        {!isTracking ? (
          <Button 
            variant="primary" 
            className="tracker-start-btn"
            onClick={handleStartTracking}
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
      
      {/* Mobile-friendly debug display */}
      <div style={{ 
        backgroundColor: '#f0f0f0',
        padding: '8px',
        margin: '8px 0',
        borderRadius: '4px',
        fontSize: '14px',
        border: '1px solid #ddd'
      }}>
        <div style={{ marginBottom: '4px' }}>
          <strong>Sensor Status:</strong> {isAvailable ? '✅ Available' : '❌ Not Available'}
          {usingFallback && ' (Using Fallback)'}
        </div>
        <div style={{ marginBottom: '4px' }}>
          <strong>State:</strong> {isActive ? 'Active' : 'Inactive'} / {isTracking ? 'Tracking' : 'Not Tracking'}
        </div>
        <div style={{ marginBottom: '4px' }}>
          <strong>Acceleration:</strong>
          <div style={{ marginLeft: '8px' }}>
            X: {acceleration?.x?.toFixed(2) ?? '0.00'} m/s²
          </div>
          <div style={{ marginLeft: '8px' }}>
            Y: {acceleration?.y?.toFixed(2) ?? '0.00'} m/s²
          </div>
          <div style={{ marginLeft: '8px' }}>
            Z: {acceleration?.z?.toFixed(2) ?? '0.00'} m/s²
          </div>
          <div style={{ marginLeft: '8px' }}>
            Magnitude: {acceleration?.magnitude?.toFixed(2) ?? '0.00'} m/s²
          </div>
        </div>
        {error && (
          <div style={{ color: 'red', marginTop: '4px' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
      
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
          <div className="metric-value">{symmetry || 0}%</div>
          <div className="metric-label">Symmetry</div>
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
          Using device motion sensors (limited accuracy)
        </div>
      )}
    </Card>
  );
};

export default StepTracker;