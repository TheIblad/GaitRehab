import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

// Keep track of tasks for the user
const TasksContext = createContext();

// Wrap the app to manage tasks
export function TasksProvider({ children }) {
  const { user } = useAuth();
  const [userTasks, setUserTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get all tasks for the user
  const fetchTasks = async () => {
    if (!user) {
      setUserTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Get tasks given to the user (if they are a patient)
      const patientTasksQuery = query(
        collection(db, 'tasks'),
        where('patientId', '==', user.uid)
      );
      
      // Get tasks made by the user (if they are a therapist)
      const therapistTasksQuery = query(
        collection(db, 'tasks'),
        where('therapistId', '==', user.uid)
      );
      
      // Get both sets of tasks
      const [patientTasksSnapshot, therapistTasksSnapshot] = await Promise.all([
        getDocs(patientTasksQuery),
        getDocs(therapistTasksQuery)
      ]);
      
      // Put all tasks in one list
      const tasks = new Map();
      
      // Add tasks given to the user
      patientTasksSnapshot.forEach(doc => {
        tasks.set(doc.id, { id: doc.id, ...doc.data() });
      });
      
      // Add tasks made by the user
      therapistTasksSnapshot.forEach(doc => {
        tasks.set(doc.id, { id: doc.id, ...doc.data() });
      });
      
      // Sort tasks by due date
      const taskArray = Array.from(tasks.values())
        .sort((a, b) => {
          // Put incomplete tasks first
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          
          // Then sort by due date
          const aDate = a.dueDate?.toDate?.() || new Date(a.dueDate);
          const bDate = b.dueDate?.toDate?.() || new Date(b.dueDate);
          return aDate - bDate;
        });
      
      setUserTasks(taskArray);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Make a new task
  const addTask = async (taskData) => {
    if (!user) return null;
    
    try {
      // Add info about who made the task
      const newTask = {
        ...taskData,
        createdAt: serverTimestamp(),
        therapistId: user.uid,
        completed: false
      };
      
      const docRef = await addDoc(collection(db, 'tasks'), newTask);
      console.log('New task added with ID:', docRef.id);
      
      // Get the updated list of tasks
      fetchTasks();
      
      return { id: docRef.id, ...newTask };
    } catch (err) {
      console.error('Error adding task:', err);
      setError('Failed to add task');
      return null;
    }
  };
  
  // Change a task
  const updateTask = async (taskId, updates) => {
    if (!user) return false;
    
    try {
      await updateDoc(doc(db, 'tasks', taskId), updates);
      console.log('Task updated:', taskId);
      
      // Get the updated list of tasks
      fetchTasks();
      
      return true;
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task');
      return false;
    }
  };
  
  // Mark a task as done
  const completeTask = async (taskId, completionData = {}) => {
    if (!user) return false;
    
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
        setError('Task not found.');
        return false;
      }
      
      const taskData = taskSnap.data();
      
      const updates = {
        completed: true,
        completedAt: serverTimestamp(),
        completedBy: user.uid,
        ...completionData
      };
      
      // Save the changes
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      // Update the task in our list
      setUserTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, ...updates, updatedAt: new Date() } : task
        )
      );
      
      // Give points to the patient if the task has points
      if (taskData.pointsReward && taskData.patientId) {
        // TODO: Add points to patient's total
      }
      
      return true;
    } catch (err) {
      console.error('Error completing task:', err);
      setError('Failed to complete task. Please try again.');
      return false;
    }
  };
  
  // Remove a task
  const deleteTask = async (taskId) => {
    if (!user) return false;
    
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      console.log('Task deleted:', taskId);
      
      // Remove from our list
      setUserTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task');
      return false;
    }
  };
  
  // Get tasks when the app starts and when user changes
  useEffect(() => {
    fetchTasks();
  }, [user]);
  
  const value = {
    tasks: userTasks,
    loading,
    error,
    fetchTasks,
    addTask,
    updateTask,
    completeTask,
    deleteTask
  };
  
  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

// Easy way to get tasks anywhere in the app
export function useTasks() {
  return useContext(TasksContext);
}