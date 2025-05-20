import React, { useState } from 'react';
import Button from '../common/Button';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../contexts/TasksContext';
import './TaskAssignModal.css';

const TaskAssignModal = ({ isOpen, onClose, patientId, patientName }) => {
  const { user } = useAuth();
  const { addTask } = useTasks();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    type: 'Exercise',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
    targetReps: '',
    targetDuration: '',
    difficulty: 'medium',
    pointsReward: 10
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData({
      ...taskData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Format task data
      const taskToAdd = {
        title: taskData.title,
        description: taskData.description,
        type: taskData.type,
        dueDate: new Date(taskData.dueDate),
        targetReps: taskData.targetReps ? parseInt(taskData.targetReps) : null,
        targetDuration: taskData.targetDuration ? parseInt(taskData.targetDuration) : null,
        difficulty: taskData.difficulty,
        pointsReward: parseInt(taskData.pointsReward),
        completed: false,
        patientId: patientId,
        therapistId: user.uid,
        createdAt: serverTimestamp()
      };

      // Add to Firestore tasks collection
      const docRef = await addDoc(collection(db, 'tasks'), taskToAdd);
      console.log("Task added with ID:", docRef.id);
      
      // Show success message and close modal
      alert('Task assigned successfully');
      onClose();
    } catch (error) {
      console.error('Error assigning task:', error);
      setError('Failed to assign task: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="task-assign-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Assign Task to {patientName}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Task Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={taskData.title}
              onChange={handleChange}
              required
              placeholder="E.g., Morning Stretching Routine"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              value={taskData.description}
              onChange={handleChange}
              required
              placeholder="Provide detailed instructions for the patient"
            ></textarea>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Task Type</label>
              <select
                id="type"
                name="type"
                value={taskData.type}
                onChange={handleChange}
                required
              >
                <option value="Exercise">Exercise</option>
                <option value="Stretching">Stretching</option>
                <option value="Walking">Walking</option>
                <option value="Balance">Balance Training</option>
                <option value="Strength">Strength Training</option>
                <option value="Measurement">Measurement</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="dueDate">Due Date</label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={taskData.dueDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="targetReps">Target Repetitions (if applicable)</label>
              <input
                type="number"
                id="targetReps"
                name="targetReps"
                value={taskData.targetReps}
                onChange={handleChange}
                placeholder="E.g., 10"
                min="0"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="targetDuration">Duration (minutes, if applicable)</label>
              <input
                type="number"
                id="targetDuration"
                name="targetDuration"
                value={taskData.targetDuration}
                onChange={handleChange}
                placeholder="E.g., 15"
                min="0"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="difficulty">Difficulty Level</label>
              <select
                id="difficulty"
                name="difficulty"
                value={taskData.difficulty}
                onChange={handleChange}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="pointsReward">Progress Points Reward</label>
              <input
                type="number"
                id="pointsReward"
                name="pointsReward"
                value={taskData.pointsReward}
                onChange={handleChange}
                min="1"
                max="100"
              />
            </div>
          </div>
          
          <div className="modal-footer">
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
              {loading ? 'Assigning...' : 'Assign Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskAssignModal;