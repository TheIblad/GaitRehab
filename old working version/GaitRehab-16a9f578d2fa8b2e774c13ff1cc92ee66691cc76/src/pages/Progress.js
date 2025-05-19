import React, { useState, useEffect, useMemo } from 'react';
import ProgressChart from '../components/patient/ProgressChart';
import CalendarHeatmap from '../components/patient/CalendarHeatmap';
import RecentActivities from '../components/patient/RecentActivities';
import { fetchUserActivities } from '../utils/firestoreQueries';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { mockActivities } from '../mock/mockActivities'; // Import mock data
import './Progress.css';

function Progress() {
  const { user } = useAuth();
  const [allActivities, setAllActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showMock, setShowMock] = useState(false);

  // Example stats - in a real app, calculate these from activities data
  const stats = {
    steps: '6,313',
    symmetry: '80%',
    distance: '4.5km',
    duration: '117min'
  };

  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      if (user && !showMock) {
        try {
          const userActivities = await fetchUserActivities(user.uid);
          setAllActivities(userActivities);
        } catch (error) {
          setAllActivities([]);
        }
      } else if (showMock) {
        setAllActivities(mockActivities);
      }
      setLoading(false);
    };

    loadActivities();
  }, [user, showMock]);

  const filteredActivities = useMemo(() => {
    if (filterType === 'all') {
      return allActivities;
    }
    return allActivities.filter(activity => activity.type === filterType);
  }, [allActivities, filterType]);

  const activityTypes = useMemo(() => {
    const types = new Set(allActivities.map(act => act.type));
    return ['all', ...Array.from(types)];
  }, [allActivities]);

  return (
    <div className="progress-container">
      <h2>Progress Overview</h2>
      
      <div className="demo-toggle-container">
        <Button
          variant={showMock ? 'secondary' : 'primary'}
          onClick={() => setShowMock((prev) => !prev)}
        >
          {showMock ? 'Show My Data' : 'Show Demo Data'}
        </Button>
      </div>
      
      {/* Add stats cards similar to patient dashboard */}
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
      
      <Card className="filter-card">
        <div className="filter-controls">
          <label htmlFor="activityTypeFilter">Filter by Activity Type:</label>
          <select
            id="activityTypeFilter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {activityTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Activities' : type}
              </option>
            ))}
          </select>
        </div>
      </Card>
      
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <div className="progress-section chart-card">
            <ProgressChart activities={filteredActivities} />
          </div>
          
          <div className="progress-section chart-card">
            <CalendarHeatmap activities={allActivities} />
          </div>
        </div>
        
        <div className="dashboard-sidebar">
          <Card className="progress-section activity-log">
            <h3>Activity Log</h3>
            <RecentActivities activities={filteredActivities} loading={loading} />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Progress;