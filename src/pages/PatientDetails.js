import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchUserData, fetchUserActivities } from '../utils/firestoreQueries';
import ProgressChart from '../components/patient/ProgressChart';
import CalendarHeatmap from '../components/patient/CalendarHeatmap';
import RecentActivities from '../components/patient/RecentActivities';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { mockPatients } from '../mock/mockTherapistData';
import AchievementsList from '../components/patient/AchievementsList';
import TaskAssignModal from '../components/therapist/TaskAssignModal';
import { useTasks } from '../contexts/TasksContext';
import './PatientDetails.css';

function PatientDetails() {
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('id');
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMock, setShowMock] = useState(true); // Default to true to show mock data
  const [activeTab, setActiveTab] = useState('overview');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const { tasks, loading: tasksLoading } = useTasks();
  
  // Added for chart filtering
  const [timeRange, setTimeRange] = useState('week');
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  
  // Helper function to format timestamps
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    // Check if it's a Firebase timestamp with toDate method
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    
    // Check if it's a Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    
    // If it's already a string, return it
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    
    // Default fallback
    return 'N/A';
  };

  // Helper function to format dates consistently
  const formatDate = (date) => {
    if (!date) return "No date available";
    
    // Handle Firestore timestamps
    if (date.toDate && typeof date.toDate === 'function') {
      date = date.toDate();
    } else if (!(date instanceof Date)) {
      // Try to convert string or timestamp to Date
      date = new Date(date);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    
    // Format the date
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    const loadPatientData = async () => {
      setLoading(true);
      
      if (showMock) {
        // Load mock data
        const mockPatient = mockPatients.find(p => p.id === patientId);
        
        if (mockPatient) {
          setPatient(mockPatient);
          
          // Create a more complete activities dataset for mock data
          const today = new Date();
          const mockActs = [];
          
          // Generate 90 days of mock data
          for (let i = 0; i < 90; i++) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            
            // Skip some days randomly to create gaps
            if (Math.random() > 0.8) continue;
            
            const steps = Math.floor(3000 + Math.random() * 8000);
            const symmetry = Math.floor(60 + Math.random() * 30);
            const distance = (steps / 1300).toFixed(1);
            
            mockActs.push({
              id: `mock-${i}`,
              type: i % 3 === 0 ? 'Walking' : i % 3 === 1 ? 'Exercise Routine' : 'Physiotherapy Session',
              timestamp: {
                toDate: () => new Date(date)
              },
              steps,
              symmetry,
              distance,
              duration: Math.floor(20 + Math.random() * 40),
              date: date.toLocaleDateString(),
              formattedDate: date.toLocaleDateString()
            });
          }
          
          setActivities(mockActs);
        } else {
          // If patient ID doesn't match any mock data, use the first one
          setPatient(mockPatients[0]);
          
          // Create similar mock activities for the first patient
          const mockActs = [];
          const today = new Date();
          
          for (let i = 0; i < 90; i++) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            
            if (Math.random() > 0.8) continue;
            
            const steps = Math.floor(3000 + Math.random() * 8000);
            const symmetry = Math.floor(60 + Math.random() * 30);
            const distance = (steps / 1300).toFixed(1);
            
            mockActs.push({
              id: `mock-${i}`,
              type: i % 3 === 0 ? 'Walking' : i % 3 === 1 ? 'Exercise Routine' : 'Physiotherapy Session',
              timestamp: {
                toDate: () => new Date(date)
              },
              steps,
              symmetry,
              distance,
              duration: Math.floor(20 + Math.random() * 40),
              date: date.toLocaleDateString(),
              formattedDate: date.toLocaleDateString()
            });
          }
          
          setActivities(mockActs);
        }
        
        setLoading(false);
        return;
      }
      
      try {
        if (!patientId) {
          console.error('No patient ID provided');
          setLoading(false);
          return;
        }
        
        // Fetch real patient data
        const patientData = await fetchUserData(patientId);
        if (patientData) {
          // Process any timestamp data to prevent rendering issues
          const processedPatient = {
            ...patientData,
            // Format timestamps in user data if present
            lastActive: patientData.lastActive ? formatTimestamp(patientData.lastActive) : 'N/A',
            createdAt: patientData.createdAt ? formatTimestamp(patientData.createdAt) : 'N/A'
          };
          
          setPatient(processedPatient);
          
          // Fetch activities
          const patientActivities = await fetchUserActivities(patientId);
          
          // Process activities to format timestamps
          const processedActivities = patientActivities.map(activity => ({
            ...activity,
            // Format the timestamp in each activity
            timestamp: activity.timestamp ? activity.timestamp : null,
            formattedDate: activity.timestamp ? formatTimestamp(activity.timestamp) : 'N/A'
          }));
          
          setActivities(processedActivities);
        } else {
          console.error('Patient not found');
        }
      } catch (error) {
        console.error('Error loading patient data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadPatientData();
  }, [patientId, showMock]);

  // Filter activities based on time range
  const filteredActivities = useMemo(() => {
    let filtered = [...activities];
    
    // Filter by activity type if not 'all'
    if (activityTypeFilter !== 'all') {
      filtered = filtered.filter(activity => activity.type === activityTypeFilter);
    }
    
    // Apply date range filter
    if (timeRange === 'custom') {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Include the entire day
      
      filtered = filtered.filter(activity => {
        const activityDate = activity.timestamp?.toDate ? 
          activity.timestamp.toDate() : 
          new Date(activity.date || Date.now());
        return activityDate >= fromDate && activityDate <= toDate;
      });
    } else {
      // Apply predefined time range
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 7); // Default to week
      }
      
      filtered = filtered.filter(activity => {
        const activityDate = activity.timestamp?.toDate ? 
          activity.timestamp.toDate() : 
          new Date(activity.date || Date.now());
        return activityDate >= startDate;
      });
    }
    
    return filtered;
  }, [activities, timeRange, dateFrom, dateTo, activityTypeFilter]);

  // Get unique activity types for the filter dropdown
  const activityTypes = useMemo(() => {
    const types = new Set(activities.map(activity => activity.type));
    return ['all', ...Array.from(types)];
  }, [activities]);

  // Filter tasks for this patient
  const patientTasks = useMemo(() => {
    return tasks.filter(task => task.patientId === patientId);
  }, [tasks, patientId]);

  const handleMessagePatient = () => {
    navigate(`/messages?user=${patientId}`);
  };
  
  if (loading) {
    return <div className="loading-state">Loading patient data...</div>;
  }
  
  if (!patient) {
    return (
      <div className="error-state">
        <h2>Patient Not Found</h2>
        <p>The patient you are looking for could not be found.</p>
        <Button variant="primary" onClick={() => navigate('/therapist')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="patient-details-container" style={{ maxWidth: '100%', width: '100%' }}>
      <div className="patient-details-header">
        <div className="header-left">
          <Button 
            variant="secondary" 
            className="back-button"
            onClick={() => navigate('/therapist')}
          >
            ← Back to List
          </Button>
          <h2>{patient.displayName}</h2>
          {patient.condition && (
            <span className="condition-badge">{patient.condition}</span>
          )}
        </div>
        
        <div className="header-right">
          <Button 
            variant="ghost" 
            className="toggle-button"
            onClick={() => setShowMock(!showMock)}
          >
            {showMock ? "Show Real Data" : "Show Demo Data"}
          </Button>
          <Button 
            variant="primary" 
            className="message-button"
            onClick={handleMessagePatient}
          >
            Message Patient
          </Button>
        </div>
      </div>
      
      <div className="patient-details-grid">
        <div className="details-sidebar">
          <Card className="patient-info-card">
            <h3>Patient Information</h3>
            <div className="patient-info-item">
              <span className="label">Email:</span>
              <span className="value">{patient.email}</span>
            </div>
            <div className="patient-info-item">
              <span className="label">Phone:</span>
              <span className="value">{patient.phone || 'Not provided'}</span>
            </div>
            <div className="patient-info-item">
              <span className="label">Last Active:</span>
              <span className="value">{typeof patient.lastActive === 'string' ? patient.lastActive : formatTimestamp(patient.lastActive)}</span>
            </div>
            <div className="patient-info-item">
              <span className="label">Patient ID:</span>
              <span className="value">{patient.id || 'N/A'}</span>
            </div>
            <div className="patient-notes">
              <h4>Notes</h4>
              <p>{patient.notes || 'No notes available.'}</p>
            </div>
          </Card>
          
          <Card className="patient-stats-card">
            <h3>Key Metrics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{patient.stats?.symmetry || '-'}%</span>
                <span className="stat-label">Gait Symmetry</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{patient.stats?.averageSteps?.toLocaleString() || '-'}</span>
                <span className="stat-label">Daily Steps</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{patient.stats?.weeklyProgress > 0 ? '+' : ''}{patient.stats?.weeklyProgress || '-'}%</span>
                <span className="stat-label">Weekly Progress</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{patient.stats?.complianceRate || '-'}%</span>
                <span className="stat-label">Compliance</span>
              </div>
            </div>
          </Card>
          
          <Card className="treatment-card">
            <h3>Treatment Plan</h3>
            <div className="treatment-progress">
              <div className="progress-label">
                <span>Overall Progress</span>
                <span>{patient.progressPercent || 0}%</span>
              </div>
              <div className="treatment-progress-bar">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${patient.progressPercent || 0}%` }}
                ></div>
              </div>
            </div>
            <ul className="treatment-list">
              <li className="completed">Initial assessment</li>
              <li className="completed">Baseline measurements</li>
              <li className="in-progress">Gait training sessions (8/12)</li>
              <li>Strength improvement</li>
              <li>Final evaluation</li>
            </ul>
          </Card>
        </div>
        
        <div className="details-main">
          <Card className="chart-card" style={{ width: '100%', minWidth: '100%' }}>
            <h3>Progress Overview</h3>
            
            <div className="chart-filters">
              <div className="chart-filter-group">
                <label>Activity Type:</label>
                <select 
                  value={activityTypeFilter}
                  onChange={(e) => setActivityTypeFilter(e.target.value)}
                >
                  {activityTypes.map(type => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Activities' : type}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="chart-filter-group">
                <label>Time Range:</label>
                <div className="time-range-buttons">
                  <Button
                    size="small"
                    variant={timeRange === 'day' ? 'primary' : 'secondary'}
                    className={timeRange === 'day' ? 'active' : ''}
                    onClick={() => {
                      setTimeRange('day');
                    }}
                  >
                    Day
                  </Button>
                  <Button
                    size="small"
                    variant={timeRange === 'week' ? 'primary' : 'secondary'}
                    className={timeRange === 'week' ? 'active' : ''}
                    onClick={() => {
                      setTimeRange('week');
                    }}
                  >
                    Week
                  </Button>
                  <Button
                    size="small"
                    variant={timeRange === 'month' ? 'primary' : 'secondary'}
                    className={timeRange === 'month' ? 'active' : ''}
                    onClick={() => {
                      setTimeRange('month');
                    }}
                  >
                    Month
                  </Button>
                  <Button
                    size="small"
                    variant={timeRange === 'year' ? 'primary' : 'secondary'}
                    className={timeRange === 'year' ? 'active' : ''}
                    onClick={() => {
                      setTimeRange('year');
                    }}
                  >
                    Year
                  </Button>
                  <Button
                    size="small"
                    variant={timeRange === 'custom' ? 'primary' : 'secondary'}
                    className={timeRange === 'custom' ? 'active' : ''}
                    onClick={() => {
                      setTimeRange('custom');
                    }}
                  >
                    Custom
                  </Button>
                </div>
              </div>
              
              {timeRange === 'custom' && (
                <div className="chart-filter-group">
                  <div className="date-range-picker">
                    <label>From:</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                    <label>To:</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <ProgressChart 
              activities={filteredActivities} 
              timeRange={timeRange}
            />
          </Card>
          
          <div className="details-main-split">
            <Card className="calendar-card" style={{ width: '100%', minWidth: '100%' }}>
              <h3>Activity Calendar</h3>
              <CalendarHeatmap activities={activities} />
            </Card>
            
            <Card className="activities-card" style={{ width: '100%', minWidth: '100%' }}>
              <h3>Recent Activities</h3>
              <RecentActivities activities={filteredActivities} loading={false} />
            </Card>
          </div>
        </div>
      </div>
      
      <div className="patient-details-tabs">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'activities' ? 'active' : ''}`}
            onClick={() => setActiveTab('activities')}
          >
            Activities
          </button>
          <button 
            className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks
          </button>
          <button 
            className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('progress')}
          >
            Progress
          </button>
          <button 
            className={`tab ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => setActiveTab('achievements')}
          >
            Achievements
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              {/* Existing overview content */}
            </div>
          )}
          
          {activeTab === 'activities' && (
            <div className="activities-tab">
              <h3>Recent Activities</h3>
              {activities.length > 0 ? (
                <RecentActivities activities={activities} />
              ) : (
                <p>No activities recorded yet.</p>
              )}
            </div>
          )}
          
          {activeTab === 'tasks' && (
            <div className="tasks-tab">
              <div className="tasks-header">
                <h3>Rehabilitation Tasks</h3>
                <Button 
                  variant="primary"
                  className="assign-task-button"
                  onClick={() => setShowTaskModal(true)}
                >
                  <i className="fas fa-plus"></i> Assign New Task
                </Button>
              </div>
              
              {tasksLoading ? (
                <p className="loading-message">Loading tasks...</p>
              ) : patientTasks.length === 0 ? (
                <div className="empty-state">
                  <p>No tasks assigned to this patient yet.</p>
                  <Button 
                    variant="primary"
                    className="assign-task-button"
                    onClick={() => setShowTaskModal(true)}
                  >
                    <i className="fas fa-plus"></i> Assign First Task
                  </Button>
                </div>
              ) : (
                <div className="tasks-list">
                  {patientTasks.map(task => {
                    const isOverdue = !task.completed && new Date(task.dueDate) < new Date();
                    const isUrgent = !task.completed && new Date(task.dueDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
                    
                    return (
                      <div 
                        key={task.id} 
                        className={`task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} ${isUrgent ? 'urgent' : ''}`}
                      >
                        <div className="task-item-header">
                          <h4>{task.title}</h4>
                          <span className="task-status">
                            {task.completed 
                              ? 'Completed' 
                              : isOverdue 
                                ? 'Overdue' 
                                : isUrgent 
                                  ? 'Due Soon' 
                                  : `Due: ${formatDate(task.dueDate)}`}
                          </span>
                        </div>
                        
                        <p className="task-description">{task.description}</p>
                        
                        {task.completed && (
                          <div className="task-completion-details">
                            <span className="completion-date">
                              Completed on {formatDate(task.completedAt)}
                            </span>
                            {task.notes && (
                              <p className="completion-notes">{task.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'progress' && (
            <div className="progress-tab">
              <h3>Progress Charts</h3>
              <div className="charts-container">
                <Card className="chart-card">
                  <ProgressChart activities={activities} />
                </Card>
                <Card className="chart-card">
                  <CalendarHeatmap activities={activities} />
                </Card>
              </div>
            </div>
          )}
          
          {activeTab === 'achievements' && (
            <div className="achievements-tab">
              <h3>Patient Achievements</h3>
              {patientId && <AchievementsList userId={patientId} />}
            </div>
          )}
        </div>
      </div>
      
      {/* Task Assignment Modal */}
      <TaskAssignModal 
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        patientId={patientId}
        patientName={patient?.displayName || 'Patient'}
      />
    </div>
  );
}

export default PatientDetails;