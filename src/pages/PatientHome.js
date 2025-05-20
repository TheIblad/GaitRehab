import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import { useAuth } from '../contexts/AuthContext';
import { fetchUserActivities } from '../utils/firestoreQueries';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ActivityModal from '../components/patient/ActivityModal';
import RecentActivities from '../components/patient/RecentActivities';
import ProgressChart from '../components/patient/ProgressChart';
import CalendarHeatmap from '../components/patient/CalendarHeatmap';
// import { mockActivities } from '../mock/mockActivities'; // Commented out as it's not used
import './PatientHome.css';
import StepTracker from '../components/patient/StepTracker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import TaskList from '../components/patient/TaskList';

function PatientHome() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMock, setShowMock] = useState(false); // Reinstated setShowMock
  const [showTracker, setShowTracker] = useState(false);
  const [prefilledActivityData, setPrefilledActivityData] = useState(null);

  // Function to load activities data
  const loadActivities = useCallback(async () => { // Wrapped in useCallback
    setLoading(true);
    if (user && !showMock) {
      try {
        console.log("Fetching activities for user:", user.uid);
        const userActivities = await fetchUserActivities(user.uid);
        console.log("Fetched activities:", userActivities);
        setActivities(userActivities);
      } catch (error) {
        console.error("Error fetching activities:", error);
        setActivities([]);
      }
    } else if (showMock) {
      // Use mock data
      // Dynamically import mockActivities only when needed
      import('../mock/mockActivities').then(module => {
        setActivities(module.mockActivities);
      });
    }
    setLoading(false);
  }, [user, showMock]); // Added dependencies for useCallback

  // Single useEffect for loading activities
  useEffect(() => {
    loadActivities();
  }, [loadActivities]); // Added loadActivities to dependency array

  // Calculate stats based on activities
  const calculateStats = useCallback(() => { // Wrapped in useCallback
    if (activities.length === 0) {
      return {
        steps: "0",
        symmetry: "0%",
        distance: "0km",
        duration: "0min"
      };
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const todaysActivities = activities.filter(activity => {
      const activityTimestamp = activity.timestamp?.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp);
      const activityDate = activityTimestamp.setHours(0, 0, 0, 0);
      return activityDate === today;
    });

    const totalSteps = todaysActivities.reduce((sum, act) => sum + (act.steps || 0), 0);
    
    const latestSymmetryActivity = [...activities]
      .filter(act => act.symmetry !== undefined && act.symmetry !== null)
      .sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return dateB - dateA;
      })[0];
    const latestSymmetry = latestSymmetryActivity?.symmetry || 0;
    
    const totalDistance = todaysActivities.reduce((sum, act) => sum + (parseFloat(act.distance) || 0), 0);
    const totalDuration = todaysActivities.reduce((sum, act) => sum + (act.duration || 0), 0);

    return {
      steps: totalSteps.toLocaleString(),
      symmetry: `${latestSymmetry}%`,
      distance: `${totalDistance.toFixed(1)}km`,
      duration: `${totalDuration}min`
    };
  }, [activities]); // Added activities as a dependency

  const handleActivityAdded = () => {
    console.log("Activity added, refreshing list...");
    loadActivities();
  };

  // Handler for recording step tracking session
  // const handleTrackerActivityRecord = async (sessionData) => {
  //   if (!user) return;
  //   setPrefilledActivityData({
  //     type: 'Walking', // Default to walking for tracker sessions
  //     duration: Math.round(sessionData.duration / 60), // Convert seconds to minutes
  //     steps: sessionData.steps,
  //     distance: sessionData.distance.toFixed(2),
  //     symmetry: sessionData.symmetry,
  //   });
  //   setModalOpen(true); // Open modal with prefilled data
  //   setShowTracker(false); // Hide tracker
  // };

  const handleActivitySessionComplete = async (sessionStats) => {
    console.log("Step tracking session complete:", sessionStats);
    if (!user) {
      console.error("User not available to save session.");
      return;
    }
    try {
      const activityData = {
        uid: user.uid,
        timestamp: serverTimestamp(),
        type: 'Walking', // Or derive from sessionStats if available
        duration: Math.round(sessionStats.duration / 60), // Assuming duration is in seconds
        steps: sessionStats.steps,
        distance: parseFloat(sessionStats.distance.toFixed(2)),
        symmetry: sessionStats.symmetry,
        notes: `Tracked session: ${sessionStats.steps} steps in ${Math.round(sessionStats.duration / 60)} min.`
      };
      await addDoc(collection(db, 'activities'), activityData);
      console.log('Tracked activity session saved.');
      loadActivities(); // Refresh activities list
    } catch (error) {
      console.error('Error saving tracked activity session:', error);
    }
    setShowTracker(false); // Close the tracker view
  };

  const stats = useMemo(() => calculateStats(), [calculateStats]); // Used useMemo for stats

  return (
    <div className="patient-home">
      <div className="page-header">
        <h2>Patient Dashboard</h2>
        <div>
          <Button 
            variant="secondary" 
            onClick={() => setShowMock(prev => !prev)} 
            style={{marginRight: '10px'}}
          >
            {showMock ? "Show Real Data" : "Show Demo Data"}
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setShowTracker(true)} 
            className="log-activity-btn"
            style={{marginRight: '10px'}}
          >
            Start Step Tracker
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setPrefilledActivityData(null); // Clear any prefilled data
              setModalOpen(true);
            }} 
            className="log-activity-btn"
          >
            Log Activity
          </Button>
        </div>
      </div>

      {/* Display stats */}
      <div className="stats-cards">
        <Card className="stat-card">
          <div className="stat-value">{stats.steps}</div>
          <div className="stat-label">Today's Steps</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">{stats.symmetry}</div>
          <div className="stat-label">Gait Symmetry</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">{stats.distance}</div>
          <div className="stat-label">Distance Today</div>
        </Card>
        <Card className="stat-card">
          <div className="stat-value">{stats.duration}</div>
          <div className="stat-label">Exercise Time Today</div>
        </Card>
      </div>

      {showTracker && (
        <Card className="step-tracker-container">
           <Button onClick={() => setShowTracker(false)} variant="secondary" style={{marginBottom: '15px'}}>Close Tracker</Button>
          <StepTracker 
            onSessionComplete={handleActivitySessionComplete} 
            userSettings={{ height: 170, gender: 'male', stepGoal: 5000 }} // Example settings
          />
        </Card>
      )}

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
          <Card className="activities-card">
            <RecentActivities activities={activities} loading={loading} />
          </Card>
          <Card className="tasks-card">
            <TaskList />
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