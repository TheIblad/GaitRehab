import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TasksContext';
import { fetchUserActivities } from '../utils/firestoreQueries';
import { mockPatients } from '../mock/mockTherapistData'; 
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import ProgressChart from '../components/patient/ProgressChart'; 
import CalendarHeatmap from '../components/patient/CalendarHeatmap';
import RecentActivities from '../components/patient/RecentActivities';
import TaskAssignModal from '../components/therapist/TaskAssignModal';
import './PatientDetails.css';

function PatientDetails() {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('id');
  const navigate = useNavigate();
  const { user: therapistUser } = useAuth(); 
  const { tasks } = useTasks(); // Get tasks from context

  const [patient, setPatient] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMock, setShowMock] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isAssignTaskModalOpen, setIsAssignTaskModalOpen] = useState(false);

  // Filter tasks for this specific patient
  const patientTasks = useMemo(() => {
    return tasks.filter(task => task.patientId === patientId);
  }, [tasks, patientId]);

  // Chart filtering states
  const [timeRange, setTimeRange] = useState('week');
  const initialDateFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  };
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  useEffect(() => {
    const fetchPatientData = async () => {
      setLoading(true);
      if (showMock) {
        const mockPatient = mockPatients.find(p => p.id === patientId);
        setPatient(mockPatient || mockPatients[0]);
        setActivities(mockPatient?.activities || []);
        setLoading(false);
        return;
      }

      if (!patientId) {
        setLoading(false);
        navigate('/therapist');
        return;
      }

      try {
        const patientDocRef = doc(db, 'users', patientId);
        const patientSnap = await getDoc(patientDocRef);

        if (patientSnap.exists()) {
          const patientData = { id: patientSnap.id, ...patientSnap.data() };
          setPatient(patientData);
          const fetchedActivities = await fetchUserActivities(patientId);
          setActivities(fetchedActivities);
        } else {
          console.error("Patient not found");
          navigate('/therapist');
        }
      } catch (error) {
        console.error("Error fetching patient details:", error);
      }
      setLoading(false);
    };

    fetchPatientData();
  }, [patientId, showMock, navigate]);

  const filteredActivities = useMemo(() => {
    let dateFiltered = activities;
    if (timeRange !== 'all') {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);

      dateFiltered = activities.filter(act => {
        const actDate = act.timestamp?.toDate ? act.timestamp.toDate() : new Date(act.date || act.timestamp);
        return actDate >= from && actDate <= to;
      });
    }
    if (activityTypeFilter === 'all') {
      return dateFiltered;
    }
    return dateFiltered.filter(activity => activity.type === activityTypeFilter);
  }, [activities, timeRange, dateFrom, dateTo, activityTypeFilter]);

  const activityTypes = useMemo(() => {
    const types = new Set(activities.map(act => act.type));
    return ['all', ...Array.from(types)];
  }, [activities]);

  const handleMessagePatient = () => {
    navigate(`/messages?user=${patientId}`);
  };

  if (loading) {
    return <div className="loading-state">Loading patient details...</div>;
  }

  if (!patient) {
    return (
      <div className="error-state">
        <h2>Patient Not Found</h2>
        <p>The patient you are looking for does not exist or could not be loaded.</p>
        <Button onClick={() => navigate('/therapist')}>Back to Patient List</Button>
      </div>
    );
  }

  const patientStats = patient.stats || { symmetry: 'N/A', averageSteps: 'N/A', weeklyProgress: 'N/A', complianceRate: 'N/A' };
  const treatmentPlan = patient.treatmentPlan || { goals: [], notes: patient.notes || "No specific treatment notes." };

  return (
    <div className="patient-details-container">
      <div className="patient-details-header">
        <div className="header-left">
          <Button onClick={() => navigate(-1)} variant="secondary" className="back-button">
            &larr; Back
          </Button>
          <h2>{patient.displayName || patient.name}</h2>
          {patient.condition && <span className="condition-badge">{patient.condition}</span>}
        </div>
        <div className="header-right">
          <Button onClick={() => setShowMock(!showMock)} className="toggle-button">
            {showMock ? "Show Real Data" : "Show Demo Data"}
          </Button>
          <Button 
            variant="primary" 
            onClick={() => setIsAssignTaskModalOpen(true)}
            className="assign-task-button"
          >
            Assign Task
          </Button>
          <Button onClick={handleMessagePatient} className="message-button">
            Message Patient
          </Button>
        </div>
      </div>

      {/* Tabs for different sections */}
      <div className="patient-details-tabs">
        <div className="tabs">
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`tab ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')}>Activities</button>
          <button className={`tab ${activeTab === 'charts' ? 'active' : ''}`} onClick={() => setActiveTab('charts')}>Progress Charts</button>
          <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Assigned Tasks</button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="patient-details-grid">
          <aside className="details-sidebar">
            <Card title="Patient Information" className="patient-info-card">
              <div className="patient-info-item">
                <span className="label">Email:</span>
                <span className="value">{patient.email}</span>
              </div>
              <div className="patient-info-item">
                <span className="label">Phone:</span>
                <span className="value">{patient.phone || 'N/A'}</span>
              </div>
              <div className="patient-info-item">
                <span className="label">Joined:</span>
                <span className="value">{patient.createdAt ? formatTimestamp(patient.createdAt) : 'N/A'}</span>
              </div>
              <div className="patient-notes">
                <h4>Therapist Notes:</h4>
                <p>{patient.notes || "No notes provided."}</p>
              </div>
            </Card>
            <Card title="Key Stats" className="patient-stats-card">
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{patientStats.symmetry}%</span>
                  <span className="stat-label">Avg. Symmetry</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{patientStats.averageSteps}</span>
                  <span className="stat-label">Avg. Daily Steps</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{patientStats.weeklyProgress}%</span>
                  <span className="stat-label">Weekly Progress</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{patientStats.complianceRate}%</span>
                  <span className="stat-label">Compliance Rate</span>
                </div>
              </div>
            </Card>
          </aside>
          <main className="details-main">
            <Card title="Treatment Plan & Notes" className="treatment-card">
              <p>{treatmentPlan.notes}</p>
              {treatmentPlan.goals && treatmentPlan.goals.length > 0 && (
                <>
                  <h4>Goals:</h4>
                  <ul>{treatmentPlan.goals.map((goal, i) => <li key={i}>{goal}</li>)}</ul>
                </>
              )}
            </Card>
            <Card title="Recent Activity Summary">
              <p>Display a summary of the latest activities or trends here.</p>
            </Card>
          </main>
        </div>
      )}

      {activeTab === 'activities' && (
        <Card title="Activity Log" className="full-width-card">
          <RecentActivities activities={activities} loading={loading} />
        </Card>
      )}

      {activeTab === 'charts' && (
        <div className="charts-container">
          <Card title="Progress Charts" className="chart-card">
            <ProgressChart activities={activities} />
          </Card>
          <Card title="Activity Heatmap" className="calendar-card">
            <CalendarHeatmap activities={activities} />
          </Card>
        </div>
      )}
      
      {activeTab === 'tasks' && (
        <Card title="Assigned Tasks" className="full-width-card">
          {patientTasks.length > 0 ? (
            <div className="therapist-task-list">
              {patientTasks.map(task => (
                <div key={task.id} className={`task-item ${task.completed ? 'completed' : task.dueDate < new Date() ? 'overdue' : ''}`}>
                  <div className="task-header">
                    <div className="task-title-section">
                      <span className={`task-badge ${task.completed ? 'completed' : new Date(task.dueDate) < new Date() ? 'overdue' : 'active'}`}>
                        {task.completed ? 'Completed' : new Date(task.dueDate) < new Date() ? 'Overdue' : 'Active'}
                      </span>
                      <h4 className="task-title">{task.title}</h4>
                    </div>
                    <div className="task-meta">
                      <span className="task-due-date">
                        Due: {task.dueDate?.toDate ? task.dueDate.toDate().toLocaleDateString() : new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="task-details">
                    <p className="task-description">{task.description || 'No description provided.'}</p>
                    <div className="task-type-info">
                      {task.type && <span className="task-type">Type: {task.type}</span>}
                      {task.targetReps && <span className="task-reps">Reps: {task.targetReps}</span>}
                      {task.targetDuration && <span className="task-duration">Duration: {task.targetDuration} min</span>}
                    </div>
                    {task.completed && task.completionNotes && (
                      <div className="task-completion-info">
                        <p><strong>Patient Notes:</strong> {task.completionNotes}</p>
                        <p><small>Completed on: {task.completedAt?.toDate ? 
                            task.completedAt.toDate().toLocaleDateString() : 
                            new Date(task.completedAt).toLocaleDateString()}</small></p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-tasks-message">
              <p>No tasks have been assigned to this patient yet.</p>
              <Button 
                variant="primary"
                onClick={() => setIsAssignTaskModalOpen(true)}
              >
                Assign First Task
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Task Assignment Modal */}
      <TaskAssignModal
        isOpen={isAssignTaskModalOpen}
        onClose={() => setIsAssignTaskModalOpen(false)}
        patientId={patientId}
        patientName={patient.displayName || patient.name}
      />
    </div>
  );
}

export default PatientDetails;