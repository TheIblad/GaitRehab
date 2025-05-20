import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserAchievements } from '../utils/firestoreQueries';
import { ACHIEVEMENTS } from '../utils/achievementUtils';
import AchievementsList from '../components/patient/AchievementsList';
import Card from '../components/common/Card';
import './Achievements.css';

// Show your badges and achievements
function Achievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    earned: 0,
    percentage: 0
  });

  useEffect(() => {
    const loadAchievements = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const userAchievements = await fetchUserAchievements(user.uid);
        setAchievements(userAchievements);
        
        // Work out how many badges you have
        const totalPossible = Object.keys(ACHIEVEMENTS).length;
        const earned = userAchievements.length;
        const percentage = Math.round((earned / totalPossible) * 100);
        
        setStats({
          total: totalPossible,
          earned,
          percentage
        });
      } catch (error) {
        console.error("Error loading achievements:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();
  }, [user]);

  // Put badges in groups
  const groupedAchievements = {
    earned: achievements,
    locked: Object.values(ACHIEVEMENTS).filter(achievement => 
      !achievements.some(earned => earned.badgeName === achievement.badgeName)
    )
  };

  return (
    <div className="achievements-page">
      <h2>Your Achievements</h2>
      
      <div className="achievements-stats-container">
        <Card className="achievements-stats-card">
          <div className="achievements-stats">
            <div className="stat-item">
              <div className="stat-value">{stats.earned}</div>
              <div className="stat-label">Earned</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">{stats.total - stats.earned}</div>
              <div className="stat-label">Locked</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">{stats.percentage}%</div>
              <div className="stat-label">Complete</div>
            </div>
          </div>
          
          <div className="achievements-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${stats.percentage}%` }}
              ></div>
            </div>
          </div>
        </Card>
      </div>
      
      {loading ? (
        <div className="loading-container">
          <p>Loading achievements...</p>
        </div>
      ) : (
        <>
          <div className="achievements-section">
            <h3>Earned Achievements</h3>
            {groupedAchievements.earned.length > 0 ? (
              <AchievementsList userId={user?.uid} />
            ) : (
              <Card className="no-achievements-card">
                <div className="no-achievements">
                  <span className="no-achievements-icon">🏅</span>
                  <h3>No Achievements Yet</h3>
                  <p>Complete activities to earn badges and achievements!</p>
                </div>
              </Card>
            )}
          </div>
          
          <div className="achievements-section">
            <h3>Locked Achievements</h3>
            <div className="locked-achievements-list">
              {groupedAchievements.locked.map((achievement) => (
                <Card key={achievement.badgeName} className="locked-achievement-card">
                  <div className="locked-achievement-icon">?</div>
                  <div className="locked-achievement-details">
                    <h3 className="locked-achievement-name">{achievement.badgeName}</h3>
                    <p className="locked-achievement-description">{achievement.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Achievements; 