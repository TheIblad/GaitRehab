import React, { useState, useEffect } from 'react';
import { fetchUserAchievements } from '../../utils/firestoreQueries';
import { ACHIEVEMENTS } from '../../utils/achievementUtils';
import Card from '../common/Card';
import './AchievementsList.css';

const AchievementsList = ({ userId, limit }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAchievements = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const userAchievements = await fetchUserAchievements(userId);
        setAchievements(userAchievements);
      } catch (error) {
        console.error("Error loading achievements:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();
  }, [userId]);

  // Filter and limit achievements if needed
  const displayAchievements = limit ? achievements.slice(0, limit) : achievements;

  if (loading) {
    return (
      <div className="achievements-loading">
        <p>Loading achievements...</p>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card className="no-achievements-card">
        <div className="no-achievements">
          <span className="no-achievements-icon">🏅</span>
          <h3>No Achievements Yet</h3>
          <p>Complete activities to earn badges and achievements!</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="achievements-list">
      {displayAchievements.map((achievement) => (
        <Card key={achievement.id} className="achievement-card">
          <div className="achievement-icon">{achievement.badgeIcon}</div>
          <div className="achievement-details">
            <h3 className="achievement-name">{achievement.badgeName}</h3>
            <p className="achievement-description">
              {Object.values(ACHIEVEMENTS).find(a => a.badgeName === achievement.badgeName)?.description || 'Achievement unlocked!'}
            </p>
            <p className="achievement-date">
              {achievement.earnedAt?.toDate ? 
                `Earned on ${achievement.earnedAt.toDate().toLocaleDateString()}` : 
                'Recently earned'}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default AchievementsList; 