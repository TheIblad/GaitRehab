import React from 'react';
import Card from '../common/Card';
import './RecentActivities.css';

function RecentActivities({ activities = [], loading = false, showMock = false }) {
  if (loading) {
    return <div className="loading-activities">Loading activities...</div>;
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    return new Date(timestamp).toLocaleDateString();
  };
  
  // Use real activities data if available, otherwise use mock data only if showMock is true
  const displayActivities = activities.length > 0 
    ? activities
        .map(activity => ({
          ...activity,
          timestamp: activity.timestamp?.toDate?.() || new Date(activity.timestamp)
        }))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
    : showMock 
      ? [
          {
            id: 1,
            type: "Walking",
            date: "Today, 10:30 AM",
            duration: "45 minutes",
            steps: 4500,
            distance: "3.2 km",
            symmetry: 87,
            location: "Local Park"
          },
          {
            id: 2,
            type: "Exercise Routine",
            date: "Yesterday, 4:15 PM",
            duration: "30 minutes",
            steps: 2800,
            symmetry: 82
          },
          {
            id: 3,
            type: "Physiotherapy Session",
            date: "Apr 28, 2:00 PM",
            duration: "60 minutes",
            notes: "Focus on ankle mobility"
          }
        ]
      : [];

  return (
    <div className="recent-activities">
      <h3>Recent Activities</h3>
      {displayActivities.length === 0 ? (
        <div className="no-activities">No activities recorded yet</div>
      ) : (
        displayActivities.map(activity => (
          <Card key={activity.id} className="activity-card">
            <div className="activity-header">
              <h4>{activity.type}</h4>
              <span className="activity-date">
                {activity.timestamp ? formatTimestamp(activity.timestamp) : activity.date}
              </span>
            </div>
            <div className="activity-details">
              {activity.duration && (
                <div className="activity-detail">
                  <span className="detail-icon">⏱️</span>
                  <span>{activity.duration} {typeof activity.duration === 'number' ? 'min' : ''}</span>
                </div>
              )}
              {activity.steps && (
                <div className="activity-detail">
                  <span className="detail-icon">👣</span>
                  <span>{activity.steps} steps</span>
                </div>
              )}
              {activity.distance && (
                <div className="activity-detail">
                  <span className="detail-icon">📏</span>
                  <span>{activity.distance} {typeof activity.distance === 'string' && !activity.distance.includes('km') ? 'km' : ''}</span>
                </div>
              )}
              {activity.symmetry && (
                <div className="activity-detail">
                  <span className="detail-icon">⚖️</span>
                  <span>{activity.symmetry}% symmetry</span>
                </div>
              )}
              {activity.cadence && (
                <div className="activity-detail">
                  <span className="detail-icon">🏃</span>
                  <span>{activity.cadence} steps/min</span>
                </div>
              )}
              {activity.location && (
                <div className="activity-detail">
                  <span className="detail-icon">📍</span>
                  <span>{activity.location}</span>
                </div>
              )}
              {activity.notes && (
                <div className="activity-detail">
                  <span className="detail-icon">📝</span>
                  <span>{activity.notes}</span>
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

export default RecentActivities;