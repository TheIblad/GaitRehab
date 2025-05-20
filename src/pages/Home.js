import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserData } from '../utils/firestoreQueries';
import './Home.css';

// Show the welcome page
function Home() {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  
  useEffect(() => {
    if (user) {
      fetchUserData(user.uid).then(data => setUserData(data));
    }
  }, [user]);

  // Get the right dashboard link
  const dashboardLink = userData?.role === 'therapist' ? '/therapist' : '/patient';

  return (
    <div>
      <section className="hero">
        <h1>Welcome to Gait Rehabilitation</h1>
        <p>Empower your recovery with our innovative tracking tools.</p>
        {!user && (
          <div className="hero-buttons">
            <Link to="/login">
              <button className="cta-btn">Login</button>
            </Link>
            <Link to="/register" style={{ marginLeft: '10px' }}>
              <button className="cta-btn secondary">Register</button>
            </Link>
          </div>
        )}
        {user && (
          <Link to={dashboardLink}>
            <button className="cta-btn">Go to Dashboard</button>
          </Link>
        )}
      </section>
      <section className="features">
        <h2>Key Features</h2>
        <div className="cards-container">
          <div className="card">
            <h3>Progress Tracking</h3>
            <p>Monitor your steps and gait symmetry over time.</p>
          </div>
          <div className="card">
            <h3>Activity Heatmap</h3>
            <p>Visualize your daily activity and improvement.</p>
          </div>
          <div className="card">
            <h3>Achievement Badges</h3>
            <p>Earn badges as you meet your rehabilitation goals.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;