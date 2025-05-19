import React, { useState } from 'react';
import './CalendarHeatmap.css';

function CalendarHeatmap({ activities = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun, 1=Mon,...

  // Process activity data to get daily levels
  const processActivityData = () => {
    const dailyData = {}; // { 'YYYY-MM-DD': level }

    activities.forEach(activity => {
      try {
        if (!activity.timestamp && !activity.date) return;
        
        let date;
        if (activity.timestamp?.toDate && typeof activity.timestamp.toDate === 'function') {
          try {
            date = activity.timestamp.toDate();
            // Validate that it's a valid date
            if (isNaN(date.getTime())) {
              console.warn('Invalid timestamp date:', activity.timestamp);
              return;
            }
          } catch (err) {
            console.warn('Error converting timestamp to date:', err);
            return;
          }
        } else if (activity.date) {
          try {
            // Handle string dates
            if (typeof activity.date === 'string') {
              // Check if it's already in ISO format (YYYY-MM-DD)
              if (/^\d{4}-\d{2}-\d{2}/.test(activity.date)) {
                date = new Date(activity.date);
              } else {
                // Try to parse other date formats
                date = new Date(activity.date);
              }
            } else {
              date = new Date(activity.date);
            }
            
            // Validate that it's a valid date
            if (isNaN(date.getTime())) {
              console.warn('Invalid activity date:', activity.date);
              return;
            }
          } catch (err) {
            console.warn('Error parsing date string:', err);
            return;
          }
        } else {
          return; // Skip if no valid date
        }
        
        // Format date as YYYY-MM-DD
        try {
          const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          
          // Example: Level based on steps (adjust thresholds as needed)
          const steps = activity.steps || 0;
          let level = 0;
          if (steps > 0) level = 1;
          if (steps >= 3000) level = 2;
          if (steps >= 6000) level = 3;
          if (steps >= 10000) level = 4;

          // Aggregate levels if multiple activities on the same day (take max level)
          dailyData[dateString] = Math.max(dailyData[dateString] || 0, level);
        } catch (err) {
          console.warn('Error formatting date:', err);
        }
      } catch (err) {
        console.error('Error processing activity:', err);
      }
    });

    const heatmapData = [];
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        heatmapData.push({ day: null, level: -1 }); // Use -1 for empty cells
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      try {
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        heatmapData.push({
          day: i,
          level: dailyData[dateString] || 0, // Default to level 0 if no activity
          date: dateString
        });
      } catch (err) {
        console.error('Error creating heatmap cell:', err);
        heatmapData.push({
          day: i,
          level: 0,
          date: 'Invalid Date'
        });
      }
    }
    
    return heatmapData;
  };

  const heatmapData = processActivityData();
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' });

  const getLevelDescription = (level) => {
    return ['No activity', 'Low', 'Moderate', 'High', 'Very high'][level] || '';
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="calendar-heatmap">
      <div className="heatmap-header">
        <button className="month-nav-button" onClick={goToPreviousMonth}>←</button>
        <h3>{monthName} {currentYear} Activity</h3>
        <button className="month-nav-button" onClick={goToNextMonth}>→</button>
      </div>
      
      <div className="heatmap-days-header">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>
      
      <div className="heatmap-grid">
        {heatmapData.map((dayData, index) => (
          <div
            key={index}
            className={`day-cell ${dayData.day === null ? 'empty' : `level-${dayData.level}`}`}
            title={dayData.day ? `${dayData.date}: ${getLevelDescription(dayData.level)}` : ''}
          >
            {dayData.day}
          </div>
        ))}
      </div>
      
      <div className="heatmap-legend">
        <span>Less</span>
        <div className="legend-item">
          <div className="legend-color level-0"></div>
          <span>None</span>
        </div>
        <div className="legend-item">
          <div className="legend-color level-1"></div>
          <span>Low</span>
        </div>
        <div className="legend-item">
          <div className="legend-color level-2"></div>
          <span>Medium</span>
        </div>
        <div className="legend-item">
          <div className="legend-color level-3"></div>
          <span>High</span>
        </div>
        <div className="legend-item">
          <div className="legend-color level-4"></div>
          <span>Very High</span>
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export default CalendarHeatmap;