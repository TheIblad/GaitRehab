import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import StepTracker from '../components/patient/StepTracker';
import ProgressChart from '../components/patient/ProgressChart';
import CalendarHeatmap from '../components/patient/CalendarHeatmap';
import RecentActivities from '../components/patient/RecentActivities';
import ActivityModal from '../components/patient/ActivityModal';
import AchievementsList from '../components/patient/AchievementsList';
import { fetchUserActivities } from '../utils/firestoreQueries';
import './PatientHome.css';

function PatientHome() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMock, setShowMock] = useState(false);
  const [prefilledActivityData, setPrefilledActivityData] = useState(null);

  // Wrap loadActivities in useCallback
  const loadActivities = useCallback(async () => {
    setLoading(true);
    if (user && !showMock) {
      try {
        const userActivities = await fetchUserActivities(user.uid);
        setActivities(userActivities);
      } catch (error) {
        console.error("Error loading activities:", error);
        setActivities([]);
      }
    } else if (showMock) {
      // Use mock data if showMock is true
      import('../mock/mockActivities').then(({ mockActivities }) => {
        setActivities(mockActivities);
      });
    } else {
      setActivities([]);
    }
    setLoading(false);
  }, [user, showMock]); // Dependencies for useCallback

  // useEffect now has stable dependencies
  useEffect(() => {
    loadActivities();
  }, [loadActivities]); // loadActivities is now stable

  // Calculate stats based on activities
  const calculateStats = () => {
    if (activities.length === 0) {
      return {
        steps: "0",
        symmetry: "0%",
        distance: "0km",
        duration: "0min"
      };
    }

    // Get today's activities
    const today = new Date().setHours(0, 0, 0, 0);
    const todaysActivities = activities.filter(activity => {
      const activityDate = activity.timestamp?.toDate().setHours(0, 0, 0, 0);
      return activityDate === today;
    });

    // Calculate stats
    const totalSteps = todaysActivities.reduce((sum, act) => sum + (act.steps || 0), 0);
    
    // Get the latest symmetry value
    const latestSymmetryActivity = [...activities]
      .filter(act => act.symmetry)
      .sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate())[0];
    const latestSymmetry = latestSymmetryActivity?.symmetry || 0;
    
    // Calculate total distance
    const totalDistance = todaysActivities.reduce((sum, act) => sum + (parseFloat(act.distance) || 0), 0);
    
    // Calculate total duration
    const totalDuration = todaysActivities.reduce((sum, act) => sum + (act.duration || 0), 0);

    return {
      steps: totalSteps.toLocaleString(),
      symmetry: `${latestSymmetry}%`,
      distance: `${totalDistance.toFixed(1)}km`,
      duration: `${totalDuration}min`
    };
  };

  const handleActivityAdded = () => {
    loadActivities(); // Refresh activities when a new one is added
  };

  // Add this function to handle completing a step tracking session
  const handleActivitySessionComplete = (sessionStats) => {
    // Open the activity modal with pre-filled data
    setModalOpen(true);
    
    // Pre-fill the activity data when the modal opens
    setPrefilledActivityData({
      type: 'Walking',
      steps: sessionStats.steps,
      distance: sessionStats.distance,
      symmetry: sessionStats.symmetry,
      duration: Math.round(sessionStats.duration / 60)
    });
  };

  // Using the stats variable by displaying it in the UI
  const currentStats = calculateStats();

  return (
    <div className="patient-home">
      <div className="page-header">
        <h2>Patient Dashboard</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button 
            variant="primary" 
            onClick={() => setModalOpen(true)}
            className="log-activity-btn"
          >
            Log Activity
          </Button>
          <Button
            variant={showMock ? 'secondary' : 'primary'}
            onClick={() => setShowMock((prev) => !prev)}
          >
            {showMock ? 'Show My Data' : 'Show Demo Data'}
          </Button>
        </div>
      </div>
      
      {/* Display stats for today */}
      <div className="stats-cards">
        <Card className="stat-card">
          <div className="stat-value">{currentStats.steps}</div>
          <div className="stat-label">Today's Steps</div>
        </Card>
        
        <Card className="stat-card">
          <div className="stat-value">{currentStats.symmetry}</div>
          <div className="stat-label">Gait Symmetry</div>
        </Card>
        
        <Card className="stat-card">
          <div className="stat-value">{currentStats.distance}</div>
          <div className="stat-label">Distance</div>
        </Card>
        
        <Card className="stat-card">
          <div className="stat-value">{currentStats.duration}</div>
          <div className="stat-label">Exercise Time</div>
        </Card>
      </div>
      
      {/* Always display the step tracker */}
      <StepTracker 
        onSessionComplete={handleActivitySessionComplete}
        userSettings={{ 
          height: user?.height || 170,
          gender: user?.gender || 'neutral',
          stepGoal: user?.stepGoal || 10000
        }} 
      />
      
      <div className="dashboard-content">
        <div className="content-left">
          <Card className="chart-card">
            <ProgressChart activities={activities} />
          </Card>
          <Card className="calendar-card">
            <CalendarHeatmap activities={activities} />
          </Card>
        </div>
        <div className="content-right">
          {showMock && (
            <Card className="activities-card">
              <RecentActivities activities={activities} loading={loading} />
            </Card>
          )}
          {!showMock && (
            <Card className="activities-card">
              {loading ? (
                <p>Loading activities...</p>
              ) : activities.length > 0 ? (
                <RecentActivities activities={activities} />
              ) : (
                <p>No activities found. Start logging your progress!</p>
              )}
            </Card>
          )}
          
          <Card className="achievements-card">
            <h3>Recent Achievements</h3>
            {user && <AchievementsList userId={user.uid} limit={3} />}
            <div className="view-all-achievements">
              <Link to="/achievements" className="view-all-link">View All Achievements</Link>
            </div>
          </Card>
        </div>
      </div>

      <ActivityModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onActivityAdded={handleActivityAdded}
        prefilledData={prefilledActivityData}
      />
    </div>
  );
}

export default PatientHome;