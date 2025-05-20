import React, { useState } from 'react';
import { useTasks } from '../../contexts/TasksContext';
import Card from '../common/Card';
import Button from '../common/Button';
import './TaskList.css';

// Shows your rehab tasks and lets you mark them as done
const TaskList = () => {
  const { tasks, loading, error, completeTask } = useTasks();
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');

  // Put undone tasks first, then sort by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by completion status first
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    // Then by due date
    const aDate = a.dueDate?.toDate?.() || new Date(a.dueDate);
    const bDate = b.dueDate?.toDate?.() || new Date(b.dueDate);
    return aDate - bDate;
  });

  // Open or close a task's details
  const handleToggleExpand = (taskId) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
    setCompletionNotes('');
  };

  // Mark a task as done
  const handleCompleteTask = async (taskId) => {
    await completeTask(taskId, { 
      notes: completionNotes,
      completionDate: new Date()
    });
    setExpandedTaskId(null);
    setCompletionNotes('');
  };

  // Make dates look nice
  const formatDate = (date) => {
    if (!date) return 'No due date';
    
    // Handle Firestore timestamps
    if (date.toDate) {
      date = date.toDate();
    } else if (!(date instanceof Date)) {
      date = new Date(date);
    }
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  // Work out if a task is done, late, or due soon
  const getTaskStatus = (task) => {
    if (task.completed) {
      return { class: 'completed', badge: 'Completed' };
    }
    
    const dueDate = task.dueDate?.toDate?.() || new Date(task.dueDate);
    const today = new Date();
    
    if (dueDate < today) {
      return { class: 'overdue', badge: 'Overdue' };
    }
    
    // Due within 2 days
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(today.getDate() + 2);
    
    if (dueDate <= twoDaysFromNow) {
      return { class: 'urgent', badge: 'Due Soon' };
    }
    
    return { class: 'active', badge: 'Active' };
  };

  // Show loading message
  if (loading) {
    return <div className="task-loading">Loading your tasks...</div>;
  }

  // Show error message
  if (error) {
    return <div className="task-error">{error}</div>;
  }

  // Show message if no tasks
  if (!tasks.length) {
    return (
      <Card className="task-card empty-tasks">
        <div className="empty-tasks-message">
          <i className="fas fa-clipboard-list"></i>
          <h3>No Tasks Assigned</h3>
          <p>Your therapist hasn't assigned any tasks yet.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="task-card">
      <h3>Rehabilitation Tasks</h3>
      <div className="task-list">
        {sortedTasks.map(task => {
          const status = getTaskStatus(task);
          const isExpanded = expandedTaskId === task.id;
          
          return (
            <div 
              key={task.id} 
              className={`task-item ${status.class} ${isExpanded ? 'expanded' : ''}`}
            >
              {/* Task header with title and status */}
              <div 
                className="task-header"
                onClick={() => !task.completed && handleToggleExpand(task.id)}
              >
                <div className="task-title-section">
                  <h4 className="task-title">{task.title}</h4>
                  <span className={`task-badge ${status.class}`}>{status.badge}</span>
                </div>
                <div className="task-meta">
                  <span className="task-due-date">
                    {task.completed 
                      ? `Completed on ${formatDate(task.completedAt)}` 
                      : `Due: ${formatDate(task.dueDate)}`}
                  </span>
                  {!task.completed && (
                    <span className="task-expand-icon">
                      {isExpanded ? '▼' : '►'}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Show task details when expanded */}
              {isExpanded && !task.completed && (
                <div className="task-details">
                  <p className="task-description">{task.description}</p>
                  
                  {/* Show exercise info */}
                  <div className="task-type-info">
                    <span className="task-type">{task.type || 'Exercise'}</span>
                    {task.targetReps && (
                      <span className="task-reps">Target: {task.targetReps} reps</span>
                    )}
                    {task.targetDuration && (
                      <span className="task-duration">Duration: {task.targetDuration} minutes</span>
                    )}
                  </div>
                  
                  {/* Form to mark task as done */}
                  <div className="task-completion-form">
                    <textarea
                      placeholder="Add notes about how you completed this task (optional)"
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      rows="2"
                    ></textarea>
                    
                    <Button
                      variant="primary"
                      className="complete-task-btn"
                      onClick={() => handleCompleteTask(task.id)}
                    >
                      Mark as Completed
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Show completion notes if task is done */}
              {task.completed && (
                <div className="task-completion-info">
                  {task.notes && (
                    <p className="completion-notes">{task.notes}</p>
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