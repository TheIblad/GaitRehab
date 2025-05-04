import React from 'react';
import './Button.css';

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
  const baseClasses = 'font-semibold rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    outline: 'bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    icon: 'bg-gray-100 hover:bg-gray-200 focus:ring-gray-400'
  };
  
  const sizeClasses = {
    small: 'py-1 px-3 text-sm',
    medium: 'py-2 px-4 text-base',
    large: 'py-3 px-6 text-lg'
  };

  // Special case for icon buttons to maintain square aspect ratio
  const iconSizeClasses = {
    small: 'p-1',
    medium: 'p-2',
    large: 'p-3'
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  // Use icon size classes if variant is 'icon'
  const sizeClass = variant === 'icon' ? iconSizeClasses[size] : sizeClasses[size];
  
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
