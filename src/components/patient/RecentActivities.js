import React from 'react';
import Card from '../common/Card';
import './RecentActivities.css';

// Shows your last few activities
function RecentActivities({ activities = [], loading = false }) {
  // Show loading message
  if (loading) {
    return <div className="loading-activities">Loading activities...</div>;
  }

  // Log the activities for debugging purposes
  console.log("RecentActivities received:", activities);
  
  // Show message if no activities yet
  if (!activities || activities.length === 0) {
    return (
      <div className="no-activities">
        <p>No activities recorded yet. Start logging your activities!</p>
      </div>
    );
  }

  // Make dates look nice
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    
    // Handle Firestore timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate();
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Handle Date object or string
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Put newest activities first and only show 5
  const sortedActivities = [...activities].sort((a, b) => {
    const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
    const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
    return dateB - dateA; // Descending order
  }).slice(0, 5); // Only show the latest 5

  return (
    <div className="recent-activities">
      <h3>Recent Activities</h3>
      <div className="activities-list">
        {sortedActivities.map((activity, index) => (
          <Card key={activity.id || index} className="activity-card">
            {/* Show activity type and when it happened */}
            <div className="activity-header">
              <h4>{activity.type || "Activity"}</h4>
              <span className="activity-date">
                {formatDate(activity.timestamp)}
              </span>
            </div>
            {/* Show all the numbers for this activity */}
            <div className="activity-details">
              {activity.duration !== undefined && (
                <div className="activity-detail">
                  <span className="detail-icon">⏱️</span>
                  <span>{activity.duration} {typeof activity.duration === 'number' ? 'min' : ''}</span>
                </div>
              )}
              {activity.steps !== undefined && activity.steps > 0 && (
                <div className="activity-detail">
                  <span className="detail-icon">👣</span>
                  <span>{activity.steps} steps</span>
                </div>
              )}
              {activity.distance !== undefined && activity.distance > 0 && (
                <div className="activity-detail">
                  <span className="detail-icon">📏</span>
                  <span>
                    {typeof activity.distance === 'number' 
                      ? `${activity.distance.toFixed(1)} km` 
                      : activity.distance}
                  </span>
                </div>
              )}
              {activity.symmetry !== undefined && (
                <div className="activity-detail">
                  <span className="detail-icon">⚖️</span>
                  <span>{activity.symmetry}% symmetry</span>
                </div>
              )}
              {activity.notes && (
                <div className="activity-detail full-width">
                  <span className="detail-icon">📝</span>
                  <span>{activity.notes}</span>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default RecentActivities;