import React, { useEffect, useState } from "react";
import PatientList from "../components/therapist/PatientList";
import Card from "../components/common/Card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { fetchUserData, fetchTherapistPatients } from "../utils/firestoreQueries";
import { mockPatients, mockAchievements, mockTodos } from "../mock/mockTherapistData";
import "./TherapistHome.css";

function TherapistHome() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMock, setShowMock] = useState(false);
  const navigate = useNavigate();

  // Function to load all therapist data
  const loadData = async () => {
    setLoading(true);
    
    if (showMock) {
      // Use mock data
      setPatients(mockPatients);
      setAchievements(mockAchievements);
      setTodos(mockTodos);
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
          // In a real app, you would fetch real achievements and todos
          setAchievements([]);
          setTodos([]);
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
                  <li key={achievement.id}>
                    <span className="achievement-patient">{achievement.patientName}</span>
                    <span className="achievement-badge">{achievement.badgeIcon}</span>
                    <span className="achievement-text">
                      {achievement.badgeName} - {' '}
                      {achievement.earnedAt instanceof Date 
                        ? achievement.earnedAt.toLocaleDateString() 
                        : new Date().toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No recent achievements found.</p>
            )}
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
    </div>
  );
}

export default TherapistHome;