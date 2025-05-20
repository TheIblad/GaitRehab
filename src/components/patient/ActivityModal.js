import React, { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
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

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      // If we have prefilled data, use it
      if (prefilledData) {
        setActivityType(prefilledData.type || 'Walking');
        setDuration(prefilledData.duration?.toString() || '');
        setSteps(prefilledData.steps?.toString() || '');
        setDistance(prefilledData.distance?.toString() || '');
        setSymmetry(prefilledData.symmetry?.toString() || '');
        setNotes('');
      } else {
        // Otherwise reset to defaults
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
      // Prepare activity data
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
      
      console.log("Adding activity:", activityData);
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log('Activity added with ID:', docRef.id);
      
      // Call onActivityAdded callback to refresh the activity list
      if (onActivityAdded) {
        onActivityAdded();
      }

      // Check for "first activity" achievement
      if (user && user.uid) {
        try {
          // Create a first activity achievement
          const achievementData = {
            userId: user.uid,
            achievementId: 'first_activity',
            title: 'First Steps',
            description: 'Logged your first activity',
            icon: '🏆',
            earnedAt: serverTimestamp()
          };

          // Add the achievement
          const achievementRef = await addDoc(collection(db, 'achievements'), achievementData);
          console.log('First activity achievement added:', achievementRef.id);
        } catch (achievementError) {
          console.error('Error adding achievement:', achievementError);
        }
      }
      
      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error adding activity:', error);
      setError('Failed to add activity: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="activity-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Log Activity</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
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
              min="1"
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
                min="0"
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
                min="0"
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
          
          <div className="button-group">
            <Button 
              type="button" 
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Activity'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActivityModal;