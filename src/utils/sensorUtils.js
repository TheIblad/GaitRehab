/**
 * Utility functions for accessing device sensors
 */

// Add this check at the beginning of the file
const AccelerometerClass = typeof window !== 'undefined' ? 
  (window.Accelerometer || null) : null;

/**
 * Check if sensor APIs are supported in the current browser
 * @returns {boolean} Whether sensors are supported
 */
export const isSensorsSupported = () => {
  // Check for Sensor API support
  return typeof window !== 'undefined' && 'Accelerometer' in window;
};

/**
 * Check if the browser supports DeviceMotionEvent as fallback
 * @returns {boolean} Whether DeviceMotionEvent is supported
 */
export const isDeviceMotionSupported = () => {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
};

/**
 * Check if permissions API is available to request sensor access
 * @returns {boolean} Whether permissions API is available
 */
export const isPermissionsApiAvailable = () => {
  return typeof navigator !== 'undefined' && 'permissions' in navigator;
};

/**
 * Request permission to access the accelerometer
 * @returns {Promise<boolean>} Promise resolving to whether permission was granted
 */
export const requestAccelerometerPermission = async () => {
  // First check for iOS devicemotion permission (different mechanism)
  if (typeof DeviceMotionEvent !== 'undefined' && 
      typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceMotionEvent.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('Error requesting iOS DeviceMotion permission:', err);
      // Continue to try the generic permission API
    }
  }
  
  // Then check regular permissions API
  if (!isPermissionsApiAvailable()) {
    // If permissions API isn't available, we'll have to assume permission
    // and catch errors when trying to use the sensor
    return true;
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'accelerometer' });
    return result.state === 'granted';
  } catch (error) {
    console.error('Error requesting accelerometer permission:', error);
    return false;
  }
};

/**
 * Get an accelerometer sensor instance
 * @param {number} frequency - How many readings per second (Hz)
 * @returns {Accelerometer|null} Accelerometer instance or null if not supported
 */
export const getAccelerometer = (frequency = 60) => {
  if (!isSensorsSupported() || !AccelerometerClass) {
    return null;
  }
  
  try {
    return new AccelerometerClass({ frequency });
  } catch (error) {
    console.error('Error creating accelerometer:', error);
    return null;
  }
};

/**
 * Calculate the magnitude of acceleration from x, y, z components
 * @param {number} x - X-axis acceleration
 * @param {number} y - Y-axis acceleration
 * @param {number} z - Z-axis acceleration
 * @returns {number} Magnitude of acceleration
 */
export const calculateAccelerationMagnitude = (x, y, z) => {
  return Math.sqrt(x * x + y * y + z * z);
};

/**
 * Apply a simple low-pass filter to reduce noise
 * @param {number} currentValue - Current sensor reading
 * @param {number} previousValue - Previous filtered value
 * @param {number} alpha - Filter coefficient (0-1, lower means more filtering)
 * @returns {number} Filtered value
 */
export const applyLowPassFilter = (currentValue, previousValue, alpha = 0.2) => {
  return previousValue + alpha * (currentValue - previousValue);
};

/**
 * Detect if device is in motion based on acceleration magnitude
 * @param {number} magnitude - Magnitude of acceleration
 * @param {number} threshold - Threshold to consider as motion
 * @returns {boolean} Whether device is in motion
 */
export const isInMotion = (magnitude, threshold = 10.5) => {
  // 9.8 m/s² is approximately 1g (gravity)
  // We look for deviations from this to detect motion
  return Math.abs(magnitude - 9.8) > threshold;
};

/**
 * Estimate step length based on user height
 * @param {number} heightCm - User's height in centimeters
 * @param {string} gender - User's gender ('male' or 'female')
 * @returns {number} Estimated step length in meters
 */
export const estimateStepLength = (heightCm, gender = 'neutral') => {
  const heightM = heightCm / 100;
  
  // Different multipliers based on research
  const multipliers = {
    male: 0.415,
    female: 0.413,
    neutral: 0.414
  };
  
  const multiplier = multipliers[gender] || multipliers.neutral;
  return heightM * multiplier; // Returns step length in meters
};

/**
 * Calculate walking speed from step data
 */
export const calculateWalkingSpeed = (stepCount, stepLength, durationSeconds) => {
  if (durationSeconds === 0) return 0;
  const distanceMeters = stepCount * stepLength;
  return distanceMeters / durationSeconds; // m/s
};

/**
 * Calculate cadence (steps per minute)
 */
export const calculateCadence = (stepIntervals) => {
  if (stepIntervals.length === 0) return 0;
  
  const avgInterval = stepIntervals.reduce((sum, interval) => sum + interval, 0) / stepIntervals.length;
  return Math.round(60000 / avgInterval); // steps per minute
};

/**
 * Calculate gait symmetry from step timing data
 */
export const calculateGaitSymmetry = (stepTimings) => {
  if (stepTimings.length < 4) return null;
  
  // Calculate coefficient of variation for step intervals
  const intervals = stepTimings.map(step => step.interval);
  const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  
  if (mean === 0) return null;
  
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = (stdDev / mean) * 100;
  
  // Convert CV to symmetry percentage (lower CV = higher symmetry)
  // Normal walking typically has CV of 2-8%, impaired gait can be 15%+
  const symmetry = Math.max(50, Math.min(98, 100 - (coefficientOfVariation * 6)));
  
  return Math.round(symmetry);
};

/**
 * Apply low-pass filter to sensor data
 */
export const lowPassFilter = (newValue, previousValue, alpha = 0.3) => {
  return alpha * newValue + (1 - alpha) * previousValue;
};

/**
 * Calculate magnitude from 3D acceleration
 */
export const calculateMagnitude = (x, y, z) => {
  return Math.sqrt(x * x + y * y + z * z);
};

/**
 * Detect step peak in acceleration data
 */
export const detectStepPeak = (magnitude, threshold, previousMagnitudes = [], peakDetected = false) => {
  if (previousMagnitudes.length < 3) return false;
  
  // Check if current magnitude exceeds threshold
  if (magnitude < threshold) return false;
  
  // Check if we're already in a peak
  if (peakDetected) return false;
  
  // Check if this is a local maximum
  const recentAvg = previousMagnitudes.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
  
  return magnitude > recentAvg * 1.2;
};

/**
 * Check if device is mobile/tablet or desktop
 * @returns {boolean} Whether the device is mobile/tablet
 */
export const isMobileOrTablet = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Simulate accelerometer data (for testing or fallback)
export class MockAccelerometer {
  constructor(options = {}) {
    this.frequency = options.frequency || 60;
    this.listeners = {
      reading: [],
      error: [],
      activate: []
    };
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.z = 9.8; // Default gravity
    this.timestamp = 0;
    this.interval = null;
  }

  addEventListener(type, callback) {
    if (this.listeners[type]) {
      this.listeners[type].push(callback);
    }
  }

  removeEventListener(type, callback) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
    }
  }

  start() {
    if (this.active) return;
    
    this.active = true;
    this.timestamp = Date.now();
    
    // Invoke activate listeners
    this.listeners.activate.forEach(callback => callback());
    
    // Simulate readings at specified frequency
    const intervalTime = 1000 / this.frequency;
    let stepPhase = 0;
    
    this.interval = setInterval(() => {
      // Simulate walking motion with a sine wave
      const amplitude = 2 + Math.random() * 1; // Random amplitude for variation
      
      // Adjust sine wave based on step phase
      stepPhase += (Math.PI / 15); // Adjust phase increment for frequency of steps
      
      // Basic sinusoidal pattern for acceleration
      this.x = amplitude * Math.sin(stepPhase) + (Math.random() * 0.5 - 0.25); // Add noise
      this.y = amplitude * Math.cos(stepPhase) + (Math.random() * 0.5 - 0.25); // Add noise
      this.z = 9.8 + amplitude * Math.sin(stepPhase * 2) + (Math.random() * 0.5 - 0.25); // Add noise
      
      this.timestamp = Date.now();
      
      // Invoke reading listeners
      this.listeners.reading.forEach(callback => callback());
    }, intervalTime);
  }

  stop() {
    if (!this.active) return;
    
    this.active = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Helper function to get an accelerometer instance (real or mock)
export const getAccelerometerInstance = (options = {}) => {
  if (isSensorsSupported() && AccelerometerClass) {
    return new AccelerometerClass(options);
  } else {
    console.warn('Accelerometer API not supported, using mock implementation.');
    return new MockAccelerometer(options);
  }
};

// Calculate distance from steps
export const calculateDistanceFromSteps = (steps, stepLength = 0.762) => {
  return steps * stepLength / 1000; // Convert to kilometers
};

// Calculate step length from height
export const calculateStepLengthFromHeight = (heightCm, gender = 'neutral') => {
  if (gender === 'male') {
    return heightCm * 0.415 / 100; // Male average
  } else if (gender === 'female') {
    return heightCm * 0.413 / 100; // Female average
  } else {
    return heightCm * 0.414 / 100; // Neutral average
  }
};