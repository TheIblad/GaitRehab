import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './ProgressChart.css';

// Shows a graph of your steps, distance, and completed tasks
function ProgressChart({ activities = [], tasks = [] }) {
  const chartRef = useRef();
  const chartInstanceRef = useRef(null); // Keep track of the chart

  // Work out what to show on the graph
  const calculateProgressData = (activities, tasks) => {
    // Look at the last 30 days
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 30);
    
    // Make a list of all dates
    const dates = [];
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    // Keep track of what happened each day
    const activityMap = new Map();
    
    // Add up all the activities
    activities.forEach(activity => {
      if (!activity.timestamp) return;
      
      const date = activity.timestamp.toDate ? 
        activity.timestamp.toDate() : new Date(activity.timestamp);
      
      const dateString = date.toISOString().split('T')[0];
      
      if (date >= startDate && date <= now) {
        const current = activityMap.get(dateString) || { steps: 0, distance: 0, duration: 0, tasks: 0 };
        
        activityMap.set(dateString, {
          steps: current.steps + (activity.steps || 0),
          distance: current.distance + (parseFloat(activity.distance) || 0),
          duration: current.duration + (activity.duration || 0),
          tasks: current.tasks // Keep track of tasks
        });
      }
    });
    
    // Add up all the completed tasks
    tasks.forEach(task => {
      if (!task.completed || !task.completedAt) return;
      
      const date = task.completedAt.toDate ? 
        task.completedAt.toDate() : new Date(task.completedAt);
      
      const dateString = date.toISOString().split('T')[0];
      
      if (date >= startDate && date <= now) {
        const current = activityMap.get(dateString) || { steps: 0, distance: 0, duration: 0, tasks: 0 };
        
        activityMap.set(dateString, {
          steps: current.steps,
          distance: current.distance,
          duration: current.duration,
          tasks: current.tasks + 1
        });
      }
    });
    
    // Set up the lines for the graph
    const datasets = [
      {
        label: 'Steps',
        data: dates.map(date => {
          const dateString = date.toISOString().split('T')[0];
          return activityMap.get(dateString)?.steps || 0;
        }),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        yAxisID: 'y'
      },
      {
        label: 'Distance (km)',
        data: dates.map(date => {
          const dateString = date.toISOString().split('T')[0];
          return activityMap.get(dateString)?.distance || 0;
        }),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        yAxisID: 'y1'
      },
      {
        label: 'Tasks Completed',
        data: dates.map(date => {
          const dateString = date.toISOString().split('T')[0];
          return activityMap.get(dateString)?.tasks || 0;
        }),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        yAxisID: 'y2'
      }
    ];
    
    return {
      labels: dates.map(date => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
      datasets
    };
  };

  // Make the graph when we have data
  useEffect(() => {
    if (!chartRef.current || activities.length === 0) return;

    const ctx = chartRef.current.getContext('2d');

    const chartData = calculateProgressData(activities, tasks || []);

    // Get rid of old graph if there is one
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Make new graph
    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: chartData,
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
             title: { display: true, text: 'Date' }
          },
          y: { // Steps line
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            title: { display: true, text: 'Steps' }
          },
          y1: { // Distance line
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            title: { display: true, text: 'Distance (km)' }
          },
          y2: { // Tasks line
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            title: { display: true, text: 'Tasks Completed' },
            grid: {
              drawOnChartArea: false, // Only show grid lines for steps
            }
          }
        }
      }
    });

    // Clean up when we're done
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };

  }, [activities, tasks]); // Make new graph when data changes

  return (
    <div className="progress-chart">
      <h3>Progress Summary (Last 30 Days)</h3>
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