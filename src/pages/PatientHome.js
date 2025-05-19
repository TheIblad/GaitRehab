import React, { useState, useEffect } from 'react';
import ProgressChart from '../components/patient/ProgressChart';
import CalendarHeatmap from '../components/patient/CalendarHeatmap';
import RecentActivities from '../components/patient/RecentActivities';
import ActivityModal from '../components/patient/ActivityModal';
import StepTracker from '../components/patient/StepTracker'; // Add import for StepTracker
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import './PatientHome.css';
import { fetchUserActivities } from '../utils/firestoreQueries';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // Add imports for Firestore
import { db } from '../firebase/config'; // Import db
import { mockActivities } from '../mock/mockActivities';
import AchievementsList from '../components/patient/AchievementsList';
import { Link } from 'react-router-dom';

function PatientHome() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMock, setShowMock] = useState(false);
  const [prefilledActivityData, setPrefilledActivityData] = useState(null); // State to store prefilled activity data

  // Function to load activities data
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

  // Handler for recording step tracking session
  const handleTrackerActivityRecord = async (sessionData) => {
    if (!user) return;

    try {
      // Add a new activity with the session data
      const activityData = {
        uid: user.uid,
        timestamp: serverTimestamp(),
        type: 'Step Tracking',
        steps: sessionData.steps,
        distance: sessionData.distance,
        duration: sessionData.duration,
        symmetry: sessionData.symmetry,
        cadence: sessionData.cadence || 0,
        notes: 'Recorded with step tracker',
      };

      console.log('Saving step tracking activity:', activityData);
      await addDoc(collection(db, 'activities'), activityData);
      console.log('Activity saved successfully');
      
      // Refresh activities list
      loadActivities();
      
      // Show success message
      alert('Activity recorded successfully!');
    } catch (error) {
      console.error('Error saving step tracking activity:', error);
      alert('Failed to save activity. Please try again.');
    }
  };

  // Add this function to handle completing a step tracking session
  const handleActivitySessionComplete = (sessionStats) => {
    // Open the activity modal with pre-filled data
    setModalOpen(true);
    
    // Pre-fill the activity data when the modal opens
    // You can implement this by adding a state variable to store prefilledData
    // and passing it to the ActivityModal component
    setPrefilledActivityData({
      type: 'Walking',
      steps: sessionStats.steps,
      distance: sessionStats.distance,
      symmetry: sessionStats.symmetry,
      duration: Math.round(sessionStats.duration / 60) // Convert seconds to minutes
    });
  };

  const stats = calculateStats();

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
      
      <div className="dashboard-content">
        <div className="content-left">
          {/* Always show StepTracker - no conditional rendering */}
          <StepTracker 
            onSessionComplete={handleActivitySessionComplete}
            userSettings={{ 
              height: user?.height || 170,
              gender: user?.gender || 'neutral',
              stepGoal: user?.stepGoal || 10000
            }} 
          />
          
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
        </div>
      </div>

      <ActivityModal 
        isOpen={modalOpen} 
        onClose={() => {
          setModalOpen(false);
          setPrefilledActivityData(null); // Clear prefilled data when closing
        }}
        onActivityAdded={handleActivityAdded}
        prefilledData={prefilledActivityData}
      />
    </div>
  );
}

export default PatientHome;