import React, { useState, useEffect } from 'react';
import { fetchUserAchievements } from '../../utils/firestoreQueries';
import Card from '../common/Card';

const AchievementsList = ({ userId, limit = 0 }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchAchievements = async () => {
      setLoading(true);
      try {
        if (userId) {
          const userAchievements = await fetchUserAchievements(userId);
          
          // Sort by most recent first
          const sortedAchievements = userAchievements.sort((a, b) => {
            const dateA = a.earnedAt?.toDate ? a.earnedAt.toDate() : new Date(a.earnedAt);
            const dateB = b.earnedAt?.toDate ? b.earnedAt.toDate() : new Date(b.earnedAt);
            return dateB - dateA;
          });
          
          // Apply limit if specified
          const limitedAchievements = limit > 0 ? sortedAchievements.slice(0, limit) : sortedAchievements;
          setAchievements(limitedAchievements);
        }
      } catch (error) {
        console.error("Error fetching achievements:", error);
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAchievements();
  }, [userId, limit]);
  
  if (loading) {
    return <div>Loading achievements...</div>;
  }
  
  if (achievements.length === 0) {
    return <div>No achievements yet. Keep going!</div>;
  }
  
  return (
    <div className="achievements-list">
      {achievements.map(achievement => (
        <div key={achievement.id} className="achievement-item">
          <span className="achievement-badge">{achievement.badgeIcon || '🏆'}</span>
          <div className="achievement-info">
            <div className="achievement-name">{achievement.badgeName}</div>
            <div className="achievement-description">{achievement.description}</div>
            <div className="achievement-date">
              {achievement.earnedAt?.toDate
                ? achievement.earnedAt.toDate().toLocaleDateString()
                : new Date(achievement.earnedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AchievementsList;