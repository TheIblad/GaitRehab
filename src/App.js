import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { auth, db } from './firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { fetchUserData } from './utils/firestoreQueries';

// Import Page Components
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientHome from './pages/PatientHome';
import TherapistHome from './pages/TherapistHome';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import Progress from './pages/Progress';

// Import Global Styles
import './index.css';

// --- Dashboard Redirect Component ---
// This component now correctly runs within the Router context
function DashboardRedirect() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [roleLoading, setRoleLoading] = useState(true);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    console.log("DashboardRedirect - Component mounted/updated");
    console.log("Auth loading:", authLoading);
    console.log("User:", user?.uid);

    // Prevent multiple redirect attempts in a single component mount
    if (redirectAttempted) {
      console.log("Already attempted redirect, skipping");
      return;
    }

    // Wait for auth loading to finish
    if (authLoading) {
      console.log("Auth still loading, waiting...");
      return;
    }

    const checkUserRole = async () => {
      if (!user) {
        console.log("No user, redirecting to login");
        navigate("/login", { replace: true });
        return;
      }

      try {
        console.log("Fetching user document for role check");
        const userDocRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
          const userData = userSnapshot.data();
          console.log("Dashboard redirect - user role:", userData.role);
          
          setRedirectAttempted(true); // Prevent additional redirects
          
          if (userData.role === 'therapist') {
            console.log("Redirecting to therapist dashboard");
            navigate("/therapist", { replace: true });
          } else {
            console.log("Redirecting to patient dashboard");
            navigate("/patient", { replace: true });
          }
        } else {
          console.error("User document doesn't exist!");
          setRedirectAttempted(true);
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("Error in dashboard redirect:", error);
        setRedirectAttempted(true);
        navigate("/login", { replace: true });
      } finally {
        setRoleLoading(false);
      }
    };

    // Only run this once
    if (!redirectAttempted) {
      checkUserRole();
    }
  }, [user, authLoading, navigate, redirectAttempted]);

  // Show loading while we're figuring things out
  return <div>Redirecting to your dashboard...</div>;
}

// --- Role-Based Route Component ---
// This component now correctly runs within the Router context
function RoleBasedRoute({ element, requiredRole }) {
  const { user, loading: authLoading } = useAuth(); // Use auth loading state
  const [roleData, setRoleData] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth loading
    if (authLoading) {
      return;
    }

    const checkUserRole = async () => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userDocRef);

        if (userSnapshot.exists()) {
          const data = userSnapshot.data();
          console.log(`RoleBasedRoute (${requiredRole}) - user role:`, data.role);
          setRoleData(data); // Store role data

          if (data.role !== requiredRole) {
            // Redirect to their actual dashboard if role doesn't match
            navigate(data.role === 'therapist' ? "/therapist" : "/patient", { replace: true });
            return;
          }
          // Role matches, proceed
        } else {
          console.error("User document doesn't exist! Logging out.");
          await auth.signOut();
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("Error in role validation:", error);
        navigate("/login", { replace: true }); // Redirect on error
      } finally {
        setRoleLoading(false);
      }
    };

    checkUserRole();
  }, [user, authLoading, requiredRole, navigate]);

  if (authLoading || roleLoading) {
    return <div>Verifying access...</div>;
  }

  // Render the element only if auth is done, role check is done, and role matches
  if (roleData && roleData.role === requiredRole) {
    return element;
  }

  // Return null or a loading indicator if redirection is happening
  return null;
}

// --- Main App Content Component ---
// This component now correctly runs within the Router context
function AppContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading: authLoading } = useAuth(); // Use auth loading state
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate(); // useNavigate is now valid here

  // Fetch user data only when auth is confirmed and user exists
  useEffect(() => {
    if (!authLoading && user) {
      fetchUserData(user.uid).then(data => setUserData(data));
    } else if (!authLoading && !user) {
      setUserData(null); // Clear user data on logout
    }
    // Dependency: authLoading and user
  }, [user, authLoading]);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const dashboardLink = userData?.role === 'therapist' ? '/therapist' : '/patient';

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      // Navigate should work reliably now
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      // Fallback if navigate fails for some reason
      window.location.href = '/';
    }
  };

  // Don't render the main layout until auth state is resolved
  if (authLoading) {
     return <div>Loading Application...</div>; // Or a proper spinner component
  }

  return (
    <> {/* Use Fragment as Router is now outside */}
      <header>
        <div className="logo">Gait Rehab</div>
        <nav>
          <div className="hamburger" onClick={toggleMenu}>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <ul className={menuOpen ? 'open' : ''}>
            <li>
              <Link to="/" onClick={() => setMenuOpen(false)}>
                Home
              </Link>
            </li>
            {user ? (
              <>
                <li>
                  {/* Link directly to the user's dashboard */}
                  <Link to={userData?.role === 'therapist' ? '/therapist' : '/patient'} onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                </li>
                 {userData?.role === 'therapist' && (
                   <li>
                     <Link to="/progress" onClick={() => setMenuOpen(false)}>
                       Progress
                     </Link>
                   </li>
                 )}
                <li>
                  <Link to="/messages" onClick={() => setMenuOpen(false)}>
                    Messages
                  </Link>
                </li>
                <li>
                  <Link to="/settings" onClick={() => setMenuOpen(false)}>
                    Settings
                  </Link>
                </li>
                <li>
                  <button onClick={handleSignOut} className="signout-btn">
                    Sign Out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/login" onClick={() => setMenuOpen(false)}>
                    Login
                  </Link>
                </li>
                <li>
                  <Link to="/register" onClick={() => setMenuOpen(false)}>
                    Register
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </header>
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

          {/* Redirect /dashboard */}
          {/* Ensure this route is only accessible when logged in */}
          <Route 
            path="/dashboard" 
            element={
              authLoading ? (
                <div>Loading authentication...</div>
              ) : user ? (
                <DashboardRedirect />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />

          {/* Role-Protected Routes */}
          <Route
            path="/patient"
            element={<RoleBasedRoute element={<PatientHome />} requiredRole="patient" />}
          />
          <Route
            path="/therapist"
            element={<RoleBasedRoute element={<TherapistHome />} requiredRole="therapist" />}
          />
           <Route
             path="/progress"
             element={<RoleBasedRoute element={<Progress />} requiredRole="therapist" />}
           />

          {/* General Authenticated Routes */}
          <Route
            path="/messages"
            element={user ? <Messages /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings"
            element={user ? <Settings /> : <Navigate to="/login" />}
          />

          {/* Catch-all for Not Found */}
          <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Routes>
      </main>
    </>
  );
}

// --- Main App Component ---
function App() {
  return (
    <AuthProvider> {/* AuthProvider wraps Router */}
      <Router> {/* Router now wraps AppContent */}
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;