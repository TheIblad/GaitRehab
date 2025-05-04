import React, { useState, useEffect } from 'react';
import ProgressChart from '../components/patient/ProgressChart';
import CalendarHeatmap from '../components/patient/CalendarHeatmap';
import RecentActivities from '../components/patient/RecentActivities';
import ActivityModal from '../components/patient/ActivityModal';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import './PatientHome.css';
import { fetchUserActivities } from '../utils/firestoreQueries';
import { useAuth } from '../contexts/AuthContext';
import { mockActivities } from '../mock/mockActivities'; // Import mock data

function PatientHome() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMock, setShowMock] = useState(false); 

  // Function to load activities data - KEEP ONLY ONE VERSION
  const loadActivities = async () => {
    setLoading(true);
    if (user && !showMock) {
      try {
        console.log("Fetching activities for user:", user.uid);
        const userActivities = await fetchUserActivities(user.uid);
        console.log("Fetched activities:", userActivities);
        setActivities(userActivities);
      } catch (error) {
        console.error("Error fetching activities:", error);
        // Fallback to mock data if fetch fails
        setActivities([]);
      }
    } else if (showMock) {
      console.log("Using mock activities");
      setActivities(mockActivities);
    } else {
      console.log("No user logged in");
      setActivities([]);
    }
    setLoading(false);
  };

  // Single useEffect for loading activities
  useEffect(() => {
    loadActivities();
  }, [user, showMock]);

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

  const stats = calculateStats();

  return (
    <div className="patient-home">
      <div className="page-header">
        <h2>Patient Dashboard</h2>
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
          style={{ marginLeft: '10px' }}
        >
          {showMock ? 'Show My Data' : 'Show Demo Data'}
        </Button>
      </div>
      
      <div className="stats-cards">
        <Card className="stat-card">
          <div className="stat-value">{stats.steps}</div>
          <div className="stat-label">Today's Steps</div>
          <div className="stat-trend positive">+12% from yesterday</div>
        </Card>
        
        <Card className="stat-card">
          <div className="stat-value">{stats.symmetry}</div>
          <div className="stat-label">Gait Symmetry</div>
          <div className="stat-trend positive">+3% from last week</div>
        </Card>
        
        <Card className="stat-card">
          <div className="stat-value">{stats.distance}</div>
          <div className="stat-label">Distance</div>
          <div className="stat-trend neutral">Same as average</div>
        </Card>
        
        <Card className="stat-card">
          <div className="stat-value">{stats.duration}</div>
          <div className="stat-label">Exercise Time</div>
          <div className="stat-trend negative">-10min from goal</div>
        </Card>
      </div>
      
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
        </div>
      </div>

      {/* Activity Modal with onActivityAdded callback */}
      <ActivityModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onActivityAdded={handleActivityAdded}
      />
    </div>
  );
}

export default PatientHome;