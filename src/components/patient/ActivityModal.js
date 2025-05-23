import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { checkActivityAchievements } from '../../utils/achievementUtils';
import AchievementModal from './AchievementModal';
import './ActivityModal.css';

const ActivityModal = ({ isOpen, onClose, onActivityAdded, prefilledData }) => {
  const { user } = useAuth();
  const [activityType, setActivityType] = useState('Walking');
  const [duration, setDuration] = useState('');
  const [steps, setSteps] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [symmetry, setSymmetry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newAchievement, setNewAchievement] = useState(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (prefilledData) {
        setActivityType(prefilledData.type || 'Walking');
        setDuration(prefilledData.duration?.toString() || '');
        setSteps(prefilledData.steps?.toString() || '');
        setDistance(prefilledData.distance?.toString() || '');
        setSymmetry(prefilledData.symmetry?.toString() || '');
        setNotes(prefilledData.notes || '');
      } else {
        setActivityType('Walking');
        setDuration('');
        setSteps('');
        setDistance('');
        setSymmetry('');
        setNotes('');
      }
      setError('');
    }
  }, [isOpen, prefilledData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to add activities');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const activityData = {
        uid: user.uid,
        timestamp: serverTimestamp(),
        type: activityType,
        duration: parseInt(duration) || 0,
        steps: parseInt(steps) || 0,
        distance: parseFloat(distance) || 0,
        symmetry: parseInt(symmetry) || 0,
        notes
      };
      
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log('Activity added with ID:', docRef.id);
      
      const achievements = await checkActivityAchievements(user.uid, activityData);
      
      if (achievements && achievements.length > 0) {
        setNewAchievement(achievements[0]);
        setShowAchievementModal(true);
      }
      
      if (onActivityAdded) {
        onActivityAdded();
      }
      
      if (!achievements || achievements.length === 0) {
        onClose();
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      setError('Failed to add activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAchievementModalClose = () => {
    setShowAchievementModal(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Log Activity</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="activityType">Activity Type</label>
                <select
                  id="activityType"
                  value={activityType}
                  onChange={e => setActivityType(e.target.value)}
                  required
                >
                  <option value="Walking">Walking</option>
                  <option value="Running">Running</option>
                  <option value="Cycling">Cycling</option>
                  <option value="Swimming">Swimming</option>
                  <option value="Physiotherapy">Physiotherapy</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="duration">Duration (minutes)</label>
                <input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  placeholder="Duration in minutes"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="steps">Steps</label>
                  <input
                    id="steps"
                    type="number"
                    value={steps}
                    onChange={e => setSteps(e.target.value)}
                    placeholder="Number of steps"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="distance">Distance (km)</label>
                  <input
                    id="distance"
                    type="number"
                    step="0.01"
                    value={distance}
                    onChange={e => setDistance(e.target.value)}
                    placeholder="Distance in km"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="symmetry">Gait Symmetry (%)</label>
                <input
                  id="symmetry"
                  type="number"
                  min="0"
                  max="100"
                  value={symmetry}
                  onChange={e => setSymmetry(e.target.value)}
                  placeholder="Symmetry percentage"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes about your activity"
                  rows="3"
                ></textarea>
              </div>
              
              {error && <div className="error-message">{error}</div>}
            </div>
            
            <div className="modal-footer">
              <button 
                type="button" 
                className="cancel-button" 
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="save-button"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Activity'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <AchievementModal
        isOpen={showAchievementModal}
        onClose={handleAchievementModalClose}
        achievement={newAchievement}
      />
    </>
  );
};

export default ActivityModal;