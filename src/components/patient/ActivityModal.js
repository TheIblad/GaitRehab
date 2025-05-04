import React, { useState } from 'react';
import Button from '../common/Button';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import './ActivityModal.css';

function ActivityModal({ isOpen, onClose, onActivityAdded }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState({
    type: 'Walking',
    duration: '',
    steps: '',
    distance: '',
    symmetry: '',
    location: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setActivity({
      ...activity,
      [name]: name === 'steps' || name === 'symmetry' || name === 'duration' 
        ? value === '' ? '' : Number(value)
        : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      console.error('No user logged in');
      return;
    }

    setLoading(true);

    try {
      const activityData = {
        uid: user.uid,
        timestamp: serverTimestamp(),
        ...activity,
      };

      console.log('Attempting to save activity data:', activityData);

      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log('Document written with ID:', docRef.id);

      setActivity({
        type: 'Walking',
        duration: '',
        steps: '',
        distance: '',
        symmetry: '',
        location: '',
        notes: '',
      });

      if (onActivityAdded) {
        onActivityAdded();
      }

      onClose();
    } catch (error) {
      console.error('Error adding activity:', error.message);
      alert(`Failed to save activity. Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="activity-modal">
        <div className="modal-header">
          <h3>Log New Activity</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="type">Activity Type</label>
            <select 
              id="type" 
              name="type" 
              value={activity.type} 
              onChange={handleChange}
              required
            >
              <option value="Walking">Walking</option>
              <option value="Exercise Routine">Exercise Routine</option>
              <option value="Physiotherapy Session">Physiotherapy Session</option>
              <option value="Gait Training">Gait Training</option>
              <option value="Balance Exercise">Balance Exercise</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="duration">Duration (minutes)</label>
            <input 
              type="number" 
              id="duration" 
              name="duration"
              min="1" 
              max="300"
              value={activity.duration} 
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="steps">Steps</label>
              <input 
                type="number" 
                id="steps" 
                name="steps"
                min="0"
                value={activity.steps} 
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="distance">Distance (km)</label>
              <input 
                type="text" 
                id="distance" 
                name="distance" 
                value={activity.distance} 
                onChange={handleChange}
                placeholder="e.g. 2.5"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="symmetry">Gait Symmetry (%)</label>
            <input 
              type="number" 
              id="symmetry" 
              name="symmetry"
              min="0"
              max="100"
              value={activity.symmetry} 
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input 
              type="text" 
              id="location" 
              name="location" 
              value={activity.location} 
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea 
              id="notes" 
              name="notes" 
              rows="3"
              value={activity.notes} 
              onChange={handleChange}
            ></textarea>
          </div>
          
          <div className="button-group">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Activity"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ActivityModal;