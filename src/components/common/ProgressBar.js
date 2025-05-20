import React from 'react';

// Shows how far along something is
const ProgressBar = ({ 
  value = 0, 
  max = 100, 
  height = 'normal', 
  color = 'blue', 
  showLabel = true,
  className = '',
  ...props 
}) => {
  // Make sure the value makes sense
  const normalizedValue = Math.min(Math.max(0, value), max);
  const percentage = (normalizedValue / max) * 100;
  
  // Different heights for different places
  const heightClasses = {
    small: 'h-1',
    normal: 'h-2',
    large: 'h-4'
  };
  
  // Different colors for different meanings
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600',
    gray: 'bg-gray-600'
  };
  
  // Pick a color based on how full the bar is
  let barColor = colorClasses[color];
  if (color === 'auto') {
    if (percentage >= 75) barColor = colorClasses.green;
    else if (percentage >= 50) barColor = colorClasses.blue;
    else if (percentage >= 25) barColor = colorClasses.yellow;
    else barColor = colorClasses.red;
  }
  
  return (
    <div className={`w-full ${className}`} {...props}>
      <div className="relative">
        {/* The empty bar */}
        <div className={`w-full ${heightClasses[height]} bg-gray-200 rounded-full overflow-hidden`}>
          {/* The filled part */}
          <div 
            className={`${barColor} ${heightClasses[height]} rounded-full transition-all duration-300 ease-in-out`} 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        
        {/* Show the numbers if needed */}
        {showLabel && (
          <div className="mt-1 text-sm text-gray-600 text-right">
            {normalizedValue} / {max}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
