import React, { useEffect, useState } from "react";
import PatientList from "../components/therapist/PatientList";
import Card from "../components/common/Card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchUserData, fetchTherapistPatients } from "../utils/firestoreQueries";
import "./TherapistHome.css";

function TherapistHome() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Function to load all therapist data
  const loadData = async () => {
    setLoading(true);
    if (user) {
      try {
        // Get the therapist's user data
        const userData = await fetchUserData(user.uid);

        if (userData?.role === "therapist") {
          // Fetch patients assigned to this therapist
          const therapistPatients = await fetchTherapistPatients(user.uid);

          // Convert Firestore Timestamps to readable strings
          const processedPatients = therapistPatients.map(patient => ({
            ...patient,
            lastActive: patient.lastActive?.toDate().toLocaleDateString() || 'N/A',
          }));

          setPatients(processedPatients);
        }
      } catch (error) {
        console.error("Error loading therapist data:", error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleMessagePatient = (patientId) => {
    navigate(`/messages?user=${patientId}`);
  };

  return (
    <div className="therapist-home">
      <h2>Therapist Dashboard</h2>

      <div className="dashboard-summary">
        <Card className="summary-card">
          <h3 className="summary-title">Total Patients</h3>
          <div className="summary-value">{patients.length}</div>
          <div className="summary-trend">+2 this month</div>
        </Card>

        <Card className="summary-card">
          <h3 className="summary-title">Avg. Engagement</h3>
          <div className="summary-value">78%</div>
          <div className="summary-trend">+5% from last week</div>
        </Card>

        <Card className="summary-card">
          <h3 className="summary-title">Upcoming Sessions</h3>
          <div className="summary-value">7</div>
          <div className="summary-trend">Next: Today, 3:00 PM</div>
        </Card>

        <Card className="summary-card">
          <h3 className="summary-title">Alerts</h3>
          <div className="summary-value">3</div>
          <div className="summary-trend urgent">Requires attention</div>
        </Card>
      </div>

      <div className="patients-section">
        <PatientList 
          patients={patients} 
          onMessage={handleMessagePatient} 
          onPatientAdded={loadData}
        />
      </div>

      {!loading && patients.length > 0 && (
        <div className="dashboard-grid">
          <Card className="dashboard-card" title="Recent Achievements">
            {achievements.length > 0 ? (
              <ul className="achievements-list">
                {achievements.map((achievement) => (
                  <li key={achievement.id}>
                    <span className="achievement-patient">{achievement.badgeName}</span>
                    <span className="achievement-badge">{achievement.badgeIcon}</span>
                    <span className="achievement-text">
                      {achievement.earnedAt instanceof Date 
                        ? achievement.earnedAt.toDateString() 
                        : new Date().toDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No recent achievements found.</p>
            )}
          </Card>

          <Card className="dashboard-card" title="To-Do List">
            {activities.length > 0 ? (
              <ul className="todo-list">
                {activities.map((activity) => (
                  <li key={activity.id} className="todo-item">
                    <input type="checkbox" id={`todo-${activity.id}`} />
                    <label htmlFor={`todo-${activity.id}`}>
                      {activity.type} - {
                        activity.timestamp && typeof activity.timestamp.toDate === 'function'
                          ? activity.timestamp.toDate().toLocaleDateString()
                          : new Date().toLocaleDateString()
                      }
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No activities found.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default TherapistHome;