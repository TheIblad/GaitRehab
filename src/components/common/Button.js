import React from 'react';
import './Button.css';

// A button that can look different ways and do different things
export default function Button({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', 
  size = 'medium',
  className = '', 
  disabled = false,
  icon = null,
  ...props 
}) {
  // Basic look for all buttons
  const baseClasses = 'font-semibold rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  // Different colors and styles for different uses
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    outline: 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    icon: 'bg-gray-100 hover:bg-gray-200 focus:ring-gray-400'
  };
  
  // Different sizes for different places
  const sizeClasses = {
    small: 'py-1 px-3 text-sm',
    medium: 'py-2 px-4 text-base',
    large: 'py-3 px-6 text-lg'
  };

  // Make icon buttons square
  const iconSizeClasses = {
    small: 'p-1',
    medium: 'p-2',
    large: 'p-3'
  };
  
  // Look different when you can't click it
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  // Use square size for icon buttons
  const sizeClass = variant === 'icon' ? iconSizeClasses[size] : sizeClasses[size];
  
  // Put all the looks together
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClass} ${disabledClasses} ${className}`;
  
  return (
    <button
      type={type}
      onClick={onClick}
      className={classes}
      disabled={disabled}
      {...props}
    >
      {icon}
      {variant !== 'icon' && children}
    </button>
  );
}
