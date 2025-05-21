import React from 'react';

const ProgressBar = ({ 
  value = 0, 
  max = 100, 
  height = 'normal', 
  color = 'blue', 
  showLabel = true,
  className = '',
  ...props 
}) => {
  // Ensure value is between 0 and max
  const normalizedValue = Math.min(Math.max(0, value), max);
  const percentage = (normalizedValue / max) * 100;
  
  const heightClasses = {
    small: 'h-1',
    normal: 'h-2',
    large: 'h-4'
  };
  
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600',
    gray: 'bg-gray-600'
  };
  
  // Determine color based on percentage if color is 'auto'
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
        <div className={`w-full ${heightClasses[height]} bg-gray-200 rounded-full overflow-hidden`}>
          <div 
            className={`${barColor} ${heightClasses[height]} rounded-full transition-all duration-300 ease-in-out`} 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        
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
