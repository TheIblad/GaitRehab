import React, { useEffect, useState } from "react";
import PatientList from "../components/therapist/PatientList";
import Card from "../components/common/Card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchUserData, fetchTherapistPatients, fetchUserActivities, fetchUserAchievements } from "../utils/firestoreQueries";
import { mockPatients, mockAchievements, mockTodos } from "../mock/mockTherapistData";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase/config";
import "./TherapistHome.css";
import RecentActivities from "../components/patient/RecentActivities";

function TherapistHome() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [todos, setTodos] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMock, setShowMock] = useState(false);
  const [activeTab, setActiveTab] = useState('activities');
  const navigate = useNavigate();

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

  // Function to load all therapist data
  const loadData = async () => {
    setLoading(true);
    
    if (showMock) {
      // Use mock data
      setPatients(mockPatients);
      setAchievements(mockAchievements);
      setTodos(mockTodos);
      setActivities(mockPatients.flatMap(patient => patient.activities || []));
      setLoading(false);
      return;
    }
    
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

          // Fetch activities from all patients
          const allActivities = [];
          for (const patient of processedPatients) {
            const patientActivities = await fetchUserActivities(patient.id);
            allActivities.push(...patientActivities.map(activity => ({
              ...activity,
              patientName: patient.displayName || patient.name,
              timestamp: activity.timestamp?.toDate?.() || new Date(activity.timestamp)
            })));
          }
          
          // Sort activities by timestamp and take most recent
          const recentActivities = allActivities
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);

          setActivities(recentActivities);

          // Fetch achievements from all patients
          const allAchievements = [];
          for (const patient of processedPatients) {
            const patientAchievements = await fetchUserAchievements(patient.id);
            allAchievements.push(...patientAchievements.map(achievement => ({
              ...achievement,
              patientName: patient.displayName || patient.name,
              earnedAt: achievement.earnedAt?.toDate?.() || new Date(achievement.earnedAt)
            })));
          }
          
          // Sort achievements by earnedAt and take most recent
          const recentAchievements = allAchievements
            .sort((a, b) => b.earnedAt - a.earnedAt)
            .slice(0, 10);

          setAchievements(recentAchievements);
          setTodos([]); // TODO: Implement real todos
        }
      } catch (error) {
        console.error("Error loading therapist data:", error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user, showMock]);

  const handleMessagePatient = (patientId) => {
    navigate(`/messages?user=${patientId}`);
  };
  
  const handleTodoToggle = (todoId) => {
    setTodos(prevTodos => 
      prevTodos.map(todo => 
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  return (
    <div className="therapist-home">
      <div className="therapist-header">
        <h2>Therapist Dashboard</h2>
        <button 
          className="toggle-data-button" 
          onClick={() => setShowMock(!showMock)}
        >
          {showMock ? "Show Real Data" : "Show Demo Data"}
        </button>
      </div>

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
          onPatientAdded={loadData}
        />
      </div>

      {!loading && (
        <div className="dashboard-grid">
          <Card className="dashboard-card" title="Recent Achievements">
            {achievements.length > 0 ? (
              <ul className="achievements-list">
                {achievements.map((achievement) => (
                  <li key={achievement.id} className="achievement-item">
                    <div className="achievement-header">
                      <span className="achievement-patient">{achievement.patientName}</span>
                      <span className="achievement-date">
                        {formatTimestamp(achievement.earnedAt)}
                      </span>
                    </div>
                    <div className="achievement-content">
                      <span className="achievement-badge">{achievement.badgeIcon}</span>
                      <span className="achievement-text">{achievement.badgeName}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No recent achievements found.</p>
            )}
          </Card>

          <Card className="dashboard-card" title="Recent Activities">
            <RecentActivities activities={activities} loading={loading} showMock={showMock} />
          </Card>

          <Card className="dashboard-card" title="To-Do List">
            {todos.length > 0 ? (
              <ul className="todo-list">
                {todos.map((todo) => (
                  <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                    <input 
                      type="checkbox" 
                      id={`todo-${todo.id}`} 
                      checked={todo.completed}
                      onChange={() => handleTodoToggle(todo.id)}
                    />
                    <label htmlFor={`todo-${todo.id}`}>
                      {todo.description}
                      <span className="todo-date">
                        {todo.dueDate instanceof Date
                          ? todo.dueDate.toLocaleDateString()
                          : new Date().toLocaleDateString()}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No tasks found.</p>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'activities' && (
        <Card title="Activity Log" className="full-width-card">
          <RecentActivities activities={activities} loading={loading} showMock={showMock} />
        </Card>
      )}
    </div>
  );
}

export default TherapistHome;