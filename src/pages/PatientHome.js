import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserActivities } from '../utils/firestoreQueries';
import { mockActivities } from '../mock/mockActivities';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ProgressChart from '../components/patient/ProgressChart';
import CalendarHeatmap from '../components/patient/CalendarHeatmap';
import RecentActivities from '../components/patient/RecentActivities';
import ActivityModal from '../components/patient/ActivityModal';
import StepTracker from '../components/patient/StepTracker';
import AchievementsList from '../components/achievements/AchievementsList';
import TaskList from '../components/patient/TaskList'; // Import TaskList
import './PatientHome.css';

function PatientHome() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMock, setShowMock] = useState(false);
  const [prefilledActivityData, setPrefilledActivityData] = useState(null);

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
      setActivities(mockActivities);
    } else {
      setActivities([]); // No user and not showing mock
    }
    setLoading(false);
  }, [user, showMock]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const calculateStats = () => {
    if (activities.length === 0 && !showMock) { // Show N/A if no real activities and not in mock mode
        return { steps: 'N/A', symmetry: 'N/A', distance: 'N/A', duration: 'N/A' };
    }
    // Use mock/demo stats if showMock is true or if activities are empty (fallback for demo)
    const sourceActivities = (showMock || activities.length === 0) ? mockActivities : activities;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysActivities = sourceActivities.filter(act => {
        const actDate = act.timestamp?.toDate ? act.timestamp.toDate() : new Date(act.date || act.timestamp);
        actDate.setHours(0,0,0,0);
        return actDate.getTime() === today.getTime();
    });

    const totalSteps = todaysActivities.reduce((sum, act) => sum + (act.steps || 0), 0);
    const totalDuration = todaysActivities.reduce((sum, act) => sum + (act.duration || 0), 0);
    
    let avgSymmetry = 0;
    const symmetryActivities = todaysActivities.filter(act => typeof act.symmetry === 'number');
    if (symmetryActivities.length > 0) {
        avgSymmetry = symmetryActivities.reduce((sum, act) => sum + act.symmetry, 0) / symmetryActivities.length;
    }
    
    const totalDistance = todaysActivities.reduce((sum, act) => {
        const dist = parseFloat(act.distance);
        return sum + (isNaN(dist) ? 0 : dist);
    }, 0);

    return {
      steps: totalSteps.toLocaleString(),
      symmetry: avgSymmetry > 0 ? `${Math.round(avgSymmetry)}%` : 'N/A',
      distance: `${totalDistance.toFixed(1)}km`,
      duration: `${totalDuration}min`
    };
  };

  const handleActivityAdded = () => {
    setModalOpen(false);
    loadActivities(); // Refresh activities list
    setPrefilledActivityData(null); // Clear prefilled data
  };

  const handleActivitySessionComplete = (sessionStats) => {
    console.log("Step tracker session completed:", sessionStats);
    setPrefilledActivityData({
      type: 'Walking', // Default type for step tracker
      steps: sessionStats.steps,
      distance: sessionStats.distance.toFixed(2),
      duration: Math.round(sessionStats.duration / 60), // Convert seconds to minutes
      symmetry: sessionStats.symmetry,
      timestamp: new Date(sessionStats.startTime)
    });
    setModalOpen(true); // Open modal to log this activity
  };

  const currentStats = calculateStats();

  return (
    <div className="patient-home">
      <div className="page-header">
        <h2>Patient Dashboard</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="primary"
            onClick={() => {
              setPrefilledActivityData(null); // Ensure no prefilled data for manual log
              setModalOpen(true);
            }}
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

      <StepTracker
        onSessionComplete={handleActivitySessionComplete}
        userSettings={{
          height: user?.height || 170, // Fetch from user profile or use default
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
          {/* Render TaskList here */}
          <TaskList />

          <Card className="activities-card">
            <RecentActivities activities={activities} loading={loading} />
          </Card>
          
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
        onClose={() => {
          setModalOpen(false);
          setPrefilledActivityData(null); // Clear prefilled data when modal closes
        }}
        onActivityAdded={handleActivityAdded}
        prefilledData={prefilledActivityData}
      />
    </div>
  );
}

export default PatientHome;