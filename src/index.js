import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { TasksProvider } from './contexts/TasksContext';
import { AuthProvider } from './contexts/AuthContext'; // Add this import

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <TasksProvider>
        <App />
      </TasksProvider>
    </AuthProvider>
  </React.StrictMode>
);