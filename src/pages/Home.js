import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

function Home() {
  const { user } = useAuth();

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
          <Link to={user ? '/dashboard' : '/login'}>
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