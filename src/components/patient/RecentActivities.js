import React from 'react';
import Card from '../common/Card';
import './RecentActivities.css';

function RecentActivities({ activities = [], loading = false }) {
  if (loading) {
    return <div className="loading-activities">Loading activities...</div>;
  }
  
  // Use real activities data if available, otherwise use mock data
  const displayActivities = activities.length > 0 
    ? activities
        .sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate())
        .slice(0, 5)
    : [
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
      ];

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate();
    return date.toLocaleDateString();
  };

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
                {activity.timestamp ? formatDate(activity.timestamp) : activity.date}
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