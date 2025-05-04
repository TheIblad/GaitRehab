import React from 'react';
import './CalendarHeatmap.css';

function CalendarHeatmap({ activities = [] }) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0=Sun, 1=Mon,...

  // Process activity data to get daily levels
  const processActivityData = () => {
    const dailyData = {}; // { 'YYYY-MM-DD': level }

    activities.forEach(activity => {
      if (!activity.timestamp) return;
      const date = activity.timestamp.toDate();
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Example: Level based on steps (adjust thresholds as needed)
      const steps = activity.steps || 0;
      let level = 0;
      if (steps > 0) level = 1;
      if (steps >= 3000) level = 2;
      if (steps >= 6000) level = 3;
      if (steps >= 10000) level = 4;

      // Aggregate levels if multiple activities on the same day (take max level)
      dailyData[dateString] = Math.max(dailyData[dateString] || 0, level);
    });

    const heatmapData = [];
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        heatmapData.push({ day: null, level: -1 }); // Use -1 for empty cells
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const dateString = date.toISOString().split('T')[0];
      heatmapData.push({
        day: i,
        level: dailyData[dateString] || 0, // Default to level 0 if no activity
        date: dateString
      });
    }
    return heatmapData;
  };

  const heatmapData = processActivityData();
  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' });

  const getLevelDescription = (level) => {
    return ['No activity', 'Low', 'Moderate', 'High', 'Very high'][level] || '';
  };

  return (
    <div className="calendar-heatmap">
      <h3>{monthName} {currentYear} Activity</h3>
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
        <div className="legend-color level-0"></div>
        <div className="legend-color level-1"></div>
        <div className="legend-color level-2"></div>
        <div className="legend-color level-3"></div>
        <div className="legend-color level-4"></div>
        <span>More</span>
      </div>
    </div>
  );
}

export default CalendarHeatmap;