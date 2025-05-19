import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './ProgressChart.css';

function ProgressChart({ activities = [] }) {
  const chartRef = useRef();
  const chartInstanceRef = useRef(null); // Store chart instance

  useEffect(() => {
    if (!chartRef.current || activities.length === 0) return;

    const ctx = chartRef.current.getContext('2d');

    // Prepare data for the chart (e.g., weekly summary)
    const processData = () => {
      const weeklyData = {}; // { 'YYYY-WW': { steps: 0, symmetrySum: 0, count: 0 } }

      activities.forEach(activity => {
        if (!activity.timestamp) return;
        const date = activity.timestamp.toDate();
        const year = date.getFullYear();
        // Get ISO week number
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay() + 1));
        const weekNum = Math.ceil(((weekStart - new Date(year, 0, 1)) / 86400000 + 1) / 7);
        const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { steps: 0, symmetrySum: 0, count: 0, date: weekStart };
        }
        weeklyData[weekKey].steps += activity.steps || 0;
        if (activity.symmetry) {
          weeklyData[weekKey].symmetrySum += activity.symmetry;
          weeklyData[weekKey].count += 1;
        }
      });

      // Sort by week
      const sortedKeys = Object.keys(weeklyData).sort((a, b) => weeklyData[a].date - weeklyData[b].date);

      const labels = sortedKeys.map(key => key);
      const stepsData = sortedKeys.map(key => weeklyData[key].steps);
      const symmetryData = sortedKeys.map(key => {
        const week = weeklyData[key];
        return week.count > 0 ? Math.round(week.symmetrySum / week.count) : 0;
      });

      return { labels, stepsData, symmetryData };
    };

    const { labels, stepsData, symmetryData } = processData();

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Create new chart
    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Weekly Steps',
            data: stepsData,
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            borderColor: 'rgb(56, 189, 248)',
            tension: 0.1, // Less curve for weekly data
            yAxisID: 'ySteps',
          },
          {
            label: 'Avg. Weekly Symmetry %',
            data: symmetryData,
            backgroundColor: 'rgba(168, 85, 247, 0.2)',
            borderColor: 'rgb(168, 85, 247)',
            tension: 0.1,
            yAxisID: 'ySymmetry',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          }
        },
        scales: {
          x: {
             title: { display: true, text: 'Week' }
          },
          ySteps: { // Steps axis
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            title: { display: true, text: 'Steps' }
          },
          ySymmetry: { // Symmetry axis
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            max: 100, // Symmetry is a percentage
            grid: {
              drawOnChartArea: false, // Only draw grid lines for the first Y axis
            },
            title: { display: true, text: 'Symmetry (%)' }
          }
        }
      }
    });

    // Cleanup function to destroy chart on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };

  }, [activities]); // Re-run effect when activities change

  return (
    <div className="progress-chart">
      <h3>Weekly Progress Summary</h3>
      <div className="chart-container">
        {activities.length > 0 ? (
          <canvas ref={chartRef}></canvas>
        ) : (
          <p>No activity data available to display the chart.</p>
        )}
      </div>
    </div>
  );
}

export default ProgressChart;