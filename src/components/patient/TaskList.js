import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../contexts/TasksContext';
import Card from '../common/Card';
import Button from '../common/Button';
import './TaskList.css';

const TaskList = () => {
  const { user } = useAuth();
  const { tasks, loading, error, completeTask } = useTasks();
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [completionNotes, setCompletionNotes] = useState({});

  const patientTasks = tasks.filter(task => task.patientId === user?.uid);

  // Sort tasks by completion status and due date
  const sortedTasks = [...patientTasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed - b.completed;
    }
    const aDate = a.dueDate?.toDate?.() || new Date(a.dueDate);
    const bDate = b.dueDate?.toDate?.() || new Date(b.dueDate);
    return aDate - bDate;
  });

  const handleToggleExpand = (taskId) => {
    setExpandedTaskId(prevId => (prevId === taskId ? null : taskId));
    if (expandedTaskId !== taskId) {
      setCompletionNotes(prev => ({ 
        ...prev, 
        [taskId]: prev[taskId] || '' 
      }));
    }
  };

  const handleNotesChange = (taskId, notes) => {
    setCompletionNotes(prev => ({ ...prev, [taskId]: notes }));
  };

  const handleCompleteTask = async (taskId) => {
    const notes = completionNotes[taskId] || '';
    await completeTask(taskId, {
      notes: notes,
      completionDate: new Date()
    });
    setCompletionNotes(prev => ({ ...prev, [taskId]: '' }));
    setExpandedTaskId(null);
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return 'No due date';
    
    let date;
    if (dateInput.toDate && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else {
      date = new Date(dateInput);
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTaskStatus = (task) => {
    if (task.completed) {
      return { class: 'completed', badge: 'Completed' };
    }
    
    const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      return { class: 'overdue', badge: 'Overdue' };
    }
    
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);
    
    if (dueDate <= twoDaysFromNow) {
      return { class: 'urgent', badge: 'Due Soon' };
    }
    
    return { class: 'active', badge: 'Pending' };
  };

  if (loading) {
    return <div className="task-loading">Loading your tasks...</div>;
  }
  
  if (error) {
    return <div className="task-error">Error loading tasks: {error}</div>;
  }
  
  if (!user) {
    return <div className="task-error">Please log in to see your tasks.</div>;
  }
  
  if (patientTasks.length === 0) {
    return (
      <Card className="task-card empty-tasks">
        <div className="empty-tasks-message">
          <i className="fas fa-clipboard-list"></i>
          <h3>No Tasks Assigned</h3>
          <p>Your therapist hasn't assigned any tasks yet, or you've completed them all!</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="task-card">
      <h3>My Rehabilitation Tasks</h3>
      <div className="task-list">
        {sortedTasks.map(task => {
          const status = getTaskStatus(task);
          const isExpanded = expandedTaskId === task.id;
          
          return (
            <div key={task.id} className={`task-item ${status.class} ${isExpanded ? 'expanded' : ''}`}>
              <div className="task-header" onClick={() => handleToggleExpand(task.id)}>
                <div className="task-title-section">
                  <h4 className="task-title">{task.title}</h4>
                  <span className={`task-badge ${status.class}`}>{status.badge}</span>
                </div>
                <div className="task-meta">
                  <span className="task-due-date">{formatDate(task.dueDate)}</span>
                  <span className="task-expand-icon">▶</span>
                </div>
              </div>

              {isExpanded && (
                <div className="task-details">
                  <p className="task-description">{task.description}</p>
                  <div className="task-type-info">
                    <span className="task-type">Type: {task.type}</span>
                    {task.targetReps && <span className="task-reps">Reps: {task.targetReps}</span>}
                    {task.targetDuration && <span className="task-duration">Duration: {task.targetDuration} min</span>}
                  </div>

                  {!task.completed && (
                    <div className="task-completion-form">
                      <textarea
                        placeholder="Add completion notes (optional)..."
                        value={completionNotes[task.id] || ''}
                        onChange={(e) => handleNotesChange(task.id, e.target.value)}
                        rows={3}
                      />
                      <Button
                        variant="primary"
                        onClick={() => handleCompleteTask(task.id)}
                        className="complete-task-btn"
                      >
                        Mark as Complete
                      </Button>
                    </div>
                  )}

                  {task.completed && task.completionNotes && (
                    <div className="task-completion-info">
                      <p className="completion-notes">
                        <strong>Completion Notes:</strong> {task.completionNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default TaskList;