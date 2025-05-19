import React, { useEffect } from 'react';
import './AchievementModal.css';
import { ACHIEVEMENTS } from '../../utils/achievementUtils';

const AchievementModal = ({ isOpen, onClose, achievement }) => {
  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !achievement) {
    return null;
  }

  // Get achievement details from our constants
  const achievementDetails = Object.values(ACHIEVEMENTS).find(
    a => a.badgeName === achievement.badgeName
  ) || {
    badgeName: achievement.badgeName,
    badgeIcon: achievement.badgeIcon || '🏆',
    description: 'Achievement unlocked!'
  };

  return (
    <div className="achievement-modal-overlay" onClick={onClose}>
      <div className="achievement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="achievement-modal-content">
          <div className="achievement-modal-header">
            <h2>Achievement Unlocked!</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          
          <div className="achievement-modal-body">
            <div className="achievement-badge">
              <div className="badge-icon">{achievementDetails.badgeIcon}</div>
              <div className="badge-glow"></div>
            </div>
            
            <h3 className="achievement-title">{achievementDetails.badgeName}</h3>
            <p className="achievement-description">{achievementDetails.description}</p>
            
            <div className="achievement-confetti"></div>
          </div>
          
          <div className="achievement-modal-footer">
            <button className="primary-button" onClick={onClose}>
              Awesome!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementModal; 