import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../contexts/TasksContext';
import Button from '../common/Button';
import './TaskAssignModal.css'; // Ensure this CSS file exists and is styled

const TaskAssignModal = ({ isOpen, onClose, patientId, patientName }) => {
  const { user } = useAuth(); // Therapist's user object
  const { addTask } = useTasks();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    type: 'Exercise',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 1 week from now
    targetReps: '',
    targetDuration: '',
    difficulty: 'medium',
    pointsReward: 10
  });

  useEffect(() => {
    // Reset form when modal opens
    if (isOpen) {
      setTaskData({
        title: '',
        description: '',
        type: 'Exercise',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        targetReps: '',
        targetDuration: '',
        difficulty: 'medium',
        pointsReward: 10
      });
      setError('');
    }
  }, [isOpen, patientId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientId || !user) {
      setError("Patient or therapist information is missing.");
      return;
    }
    setLoading(true);
    setError('');

    try {
      const newTaskData = {
        ...taskData,
        patientId: patientId,
        patientName: patientName,
        therapistId: user.uid,
        therapistName: user.displayName || 'Therapist',
        status: 'pending',
        assignedAt: new Date(),
      };
      await addTask(newTaskData);
      onClose();
    } catch (err) {
      console.error("Error assigning task:", err);
      setError('Failed to assign task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="task-assign-modal">
        <div className="modal-header">
          <h3>Assign Task to {patientName || 'Patient'}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Task Title</label>
            <input type="text" id="title" name="title" value={taskData.title} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" value={taskData.description} onChange={handleChange} rows="3"></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Task Type</label>
              <select id="type" name="type" value={taskData.type} onChange={handleChange}>
                <option value="Exercise">Exercise</option>
                <option value="Walking">Walking</option>
                <option value="Balance">Balance Training</option>
                <option value="Education">Educational Material</option>
                <option value="Survey">Survey/Feedback</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="dueDate">Due Date</label>
              <input type="date" id="dueDate" name="dueDate" value={taskData.dueDate} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="targetReps">Target Reps (if applicable)</label>
              <input type="number" id="targetReps" name="targetReps" value={taskData.targetReps} onChange={handleChange} placeholder="e.g., 10" />
            </div>
            <div className="form-group">
              <label htmlFor="targetDuration">Target Duration (minutes, if applicable)</label>
              <input type="number" id="targetDuration" name="targetDuration" value={taskData.targetDuration} onChange={handleChange} placeholder="e.g., 30" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="difficulty">Difficulty</label>
              <select id="difficulty" name="difficulty" value={taskData.difficulty} onChange={handleChange}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="pointsReward">Points Reward</label>
              <input type="number" id="pointsReward" name="pointsReward" value={taskData.pointsReward} onChange={handleChange} />
            </div>
          </div>

          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskAssignModal;