import React, { useState } from 'react';
import { useTasks } from '../../contexts/TasksContext';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../common/Card';
import Button from '../common/Button';
import './TaskList.css'; // Make sure this CSS file exists and is styled

// Shows your rehab tasks and lets you mark them as done
const TaskList = () => {
  const { user } = useAuth(); // Current logged-in patient
  const { tasks, loading, error, completeTask, updateTask } = useTasks(); // Using updateTask for notes
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [completionNotes, setCompletionNotes] = useState({}); // Store notes per task ID

  // Filter tasks for the current patient
  const patientTasks = tasks.filter(task => task.patientId === user?.uid);

  // Put undone tasks first, then sort by due date
  const sortedTasks = [...patientTasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1; // Incomplete tasks first
    }
    const aDate = a.dueDate?.toDate?.() || new Date(a.dueDate);
    const bDate = b.dueDate?.toDate?.() || new Date(b.dueDate);
    return aDate - bDate; // Sort by due date
  });

  const handleToggleExpand = (taskId) => {
    setExpandedTaskId(prevId => (prevId === taskId ? null : taskId));
    if (expandedTaskId !== taskId) { // If opening a new task
        const task = patientTasks.find(t => t.id === taskId);
        setCompletionNotes(prev => ({...prev, [taskId]: task?.completionNotes || ''}));
    }
  };

  const handleNotesChange = (taskId, notes) => {
    setCompletionNotes(prev => ({ ...prev, [taskId]: notes }));
  };

  const handleCompleteTask = async (taskId) => {
    const notes = completionNotes[taskId] || '';
    await completeTask(taskId, {
      notes: notes, // Save notes upon completion
      completionDate: new Date()
    });
    // Optionally, clear notes for this task after completion
    setCompletionNotes(prev => ({ ...prev, [taskId]: '' }));
    setExpandedTaskId(null); // Close the task item
  };
  
  const handleSaveNotes = async (taskId) => {
    const notes = completionNotes[taskId] || '';
    await updateTask(taskId, { completionNotes: notes, patientNotes: notes }); // Save notes
    // Optionally provide feedback to user that notes are saved
  };


  const formatDate = (dateInput) => {
    if (!dateInput) return 'No due date';
    let date;
    if (dateInput.toDate && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      return 'Invalid Date';
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
    today.setHours(0,0,0,0); // Compare dates only

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
          <i className="fas fa-clipboard-list"></i> {/* Make sure you have FontAwesome or similar */}
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
                  <span className={`task-badge ${status.class}`}>{status.badge}</span>
                  <h4 className="task-title">{task.title}</h4>
                </div>
                <div className="task-meta">
                  <span className="task-due-date">Due: {formatDate(task.dueDate)}</span>
                  <span className="task-expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>
              {isExpanded && (
                <div className="task-details">
                  <p className="task-description">{task.description || 'No description provided.'}</p>
                  <div className="task-type-info">
                    {task.type && <span className="task-type">Type: {task.type}</span>}
                    {task.targetReps && <span className="task-reps">Reps: {task.targetReps}</span>}
                    {task.targetDuration && <span className="task-duration">Duration: {task.targetDuration} min</span>}
                  </div>
                  {!task.completed && (
                    <div className="task-completion-form">
                      <textarea
                        placeholder="Add notes about your task completion (optional)..."
                        value={completionNotes[task.id] || ''}
                        onChange={(e) => handleNotesChange(task.id, e.target.value)}
                        rows="2"
                      />
                       <div className="task-actions">
                                <Button
                                    variant="secondary"
                                    onClick={() => handleSaveNotes(task.id)}
                                    className="save-notes-btn"
                                >
                                    Save Notes
                                </Button>
                                <Button
                                    variant="success" // Assuming you have a success variant
                                    onClick={() => handleCompleteTask(task.id)}
                                    className="complete-task-btn"
                                >
                                    Mark as Completed
                                </Button>
                            </div>
                    </div>
                  )}
                  {task.completed && task.completionNotes && (
                     <div className="task-completion-info">
                        <p><strong>Your Notes:</strong> {task.completionNotes}</p>
                        {task.completedAt && <p><small>Completed on: {formatDate(task.completedAt)}</small></p>}
                    </div>
                  )}
                   {task.completed && !task.completionNotes && task.completedAt && (
                     <div className="task-completion-info">
                        <p><small>Completed on: {formatDate(task.completedAt)}</small></p>
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