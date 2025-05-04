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
      <Button
        variant={showMock ? 'secondary' : 'primary'}
        style={{ marginBottom: 16 }}
        onClick={() => setShowMock((prev) => !prev)}
      >
        {showMock ? 'Show My Data' : 'Show Demo Data'}
      </Button>
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
      <Card className="progress-section">
        <ProgressChart activities={filteredActivities} />
      </Card>
      <Card className="progress-section">
        <CalendarHeatmap activities={allActivities} />
      </Card>
      <Card className="progress-section">
        <h3>Filtered Activity Log</h3>
        <RecentActivities activities={filteredActivities} loading={loading} />
      </Card>
    </div>
  );
}

export default Progress;