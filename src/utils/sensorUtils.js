// Help with using phone sensors

/**
 * See if we can use the phone's motion sensor
 */
const AccelerometerClass = typeof window !== 'undefined' ? 
  (window.Accelerometer || null) : null;

/**
 * See if your phone can use motion sensors
 */
export const isSensorsSupported = () => {
  return typeof window !== 'undefined' && 'Accelerometer' in window;
};

/**
 * See if we can use the backup motion sensor
 */
export const isDeviceMotionSupported = () => {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
};

/**
 * See if we can ask to use sensors
 */
export const isPermissionsApiAvailable = () => {
  return typeof navigator !== 'undefined' && 'permissions' in navigator;
};

/**
 * Ask to use the motion sensor
 */
export const requestAccelerometerPermission = async () => {
  // Check for iPhone/iPad permission first
  if (typeof DeviceMotionEvent !== 'undefined' && 
      typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceMotionEvent.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('Error asking for iPhone motion permission:', err);
    }
  }
  
  // Then check regular permission
  if (!isPermissionsApiAvailable()) {
    return true;
  }
  
  try {
    const result = await navigator.permissions.query({ name: 'accelerometer' });
    return result.state === 'granted';
  } catch (error) {
    console.error('Error asking for motion permission:', error);
    return false;
  }
};

/**
 * Get a motion sensor to use
 * @param {number} frequency - How many readings per second
 */
export const getAccelerometer = (frequency = 60) => {
  if (!isSensorsSupported() || !AccelerometerClass) {
    return null;
  }
  
  try {
    return new AccelerometerClass({ frequency });
  } catch (error) {
    console.error('Error setting up motion sensor:', error);
    return null;
  }
};

/**
 * Work out how strong the movement is
 */
export const calculateAccelerationMagnitude = (x, y, z) => {
  return Math.sqrt(x * x + y * y + z * z);
};

/**
 * Make the readings smoother by reducing jumpiness
 */
export const applyLowPassFilter = (currentValue, previousValue, alpha = 0.2) => {
  return previousValue + alpha * (currentValue - previousValue);
};

/**
 * See if the phone is moving
 */
export const isInMotion = (magnitude, threshold = 10.5) => {
  // Normal gravity is about 9.8
  // We look for changes from this to see if moving
  return Math.abs(magnitude - 9.8) > threshold;
};

/**
 * Guess how long each step is based on height
 */
export const estimateStepLength = (heightCm, gender = 'neutral') => {
  if (!heightCm || heightCm <= 0) {
    return 0.65; // Average step length if no height given
  }
  
  // Different guesses based on gender
  if (gender.toLowerCase() === 'male') {
    return heightCm * 0.38 / 100;
  } else if (gender.toLowerCase() === 'female') {
    return heightCm * 0.37 / 100;
  } else {
    return heightCm * 0.375 / 100;
  }
};

/**
 * See if using a phone or tablet
 */
export const isMobileOrTablet = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Fake motion sensor for testing
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
    this.z = 9.8; // Normal gravity
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
    
    this.listeners.activate.forEach(callback => callback());
    
    const intervalTime = 1000 / this.frequency;
    let stepPhase = 0;
    
    this.interval = setInterval(() => {
      // Make fake walking motion
      const amplitude = 2 + Math.random() * 1;
      
      stepPhase += (Math.PI / 15);
      
      this.x = amplitude * Math.sin(stepPhase) + (Math.random() * 0.5 - 0.25);
      this.y = amplitude * Math.cos(stepPhase) + (Math.random() * 0.5 - 0.25);
      this.z = 9.8 + amplitude * Math.sin(stepPhase * 2) + (Math.random() * 0.5 - 0.25);
      
      this.timestamp = Date.now();
      
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

// Get a motion sensor (real or fake)
export const getAccelerometerInstance = (options = {}) => {
  if (isSensorsSupported() && AccelerometerClass) {
    return new AccelerometerClass(options);
  } else {
    console.warn('Motion sensor not available, using fake one');
    return new MockAccelerometer(options);
  }
};

// Work out distance from steps
export const calculateDistanceFromSteps = (steps, stepLength = 0.762) => {
  return steps * stepLength / 1000; // Convert to kilometers
};

// Work out step length from height
export const calculateStepLengthFromHeight = (heightCm, gender = 'neutral') => {
  if (gender === 'male') {
    return heightCm * 0.415 / 100;
  } else if (gender === 'female') {
    return heightCm * 0.413 / 100;
  } else {
    return heightCm * 0.414 / 100;
  }
};