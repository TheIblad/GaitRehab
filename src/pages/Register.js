import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Button from '../components/common/Button';
import './Register.css';

// Some test activities
const mockActivities = [
  {
    id: 'activity1',
    type: 'Walking',
    timestamp: { toDate: () => new Date() },
  },
  {
    id: 'activity2',
    type: 'Exercise Routine',
    timestamp: { toDate: () => new Date() },
  },
];

// Let users make a new account
function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient'); // Start as patient
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Make new user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save their name
      await updateProfile(user, { displayName });

      // Save user info
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName,
        email,
        role,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      // Send them to the right page
      if (role === 'therapist') {
        navigate('/therapist');
      } else {
        navigate('/patient');
      }
    } catch (err) {
      console.error('Error registering user:', err);
      setError('Failed to create an account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h2>Create an Account</h2>
          <p>Sign up to start your rehabilitation journey</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="displayName">Name</label>
            <input
              type="text"
              id="displayName"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="patient">Patient</option>
              <option value="therapist">Therapist</option>
            </select>
          </div>

          <Button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>

        <div className="register-footer">
          Already have an account? <Link to="/login">Log In</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;