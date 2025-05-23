import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import Contacts from './pages/Contacts';
import PatientDetails from './pages/PatientDetails';
import Achievements from './pages/Achievements';

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

    if (redirectAttempted) {
      console.log("Already attempted redirect, skipping");
      return;
    }

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
          
          setRedirectAttempted(true);
          
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
  const { user, loading: authLoading } = useAuth();
  const [roleData, setRoleData] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
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
          setRoleData(data);

          if (data.role !== requiredRole) {
            navigate(data.role === 'therapist' ? "/therapist" : "/patient", { replace: true });
            return;
          }
        } else {
          console.error("User document doesn't exist! Logging out.");
          await auth.signOut();
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("Error in role validation:", error);
        navigate("/login", { replace: true });
      } finally {
        setRoleLoading(false);
      }
    };

    checkUserRole();
  }, [user, authLoading, requiredRole, navigate]);

  if (authLoading || roleLoading) {
    return <div>Verifying access...</div>;
  }

  if (roleData && roleData.role === requiredRole) {
    return element;
  }

  return null;
}

// --- Main App Content Component ---
// This component now correctly runs within the Router context
function AppContent() {
  const { user, loading } = useAuth();
  const [role, setRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          }
        } catch (error) {
          console.error('Error checking user role:', error);
        }
      }
    };
    checkUserRole();
  }, [user]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!loading && user) {
      fetchUserData(user.uid).then(data => setUserData(data));
    } else if (!loading && !user) {
      setUserData(null);
    }
  }, [user, loading]);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/';
    }
  };

  // Don't render the main layout until auth state is resolved
  if (loading) {
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
                  <Link to={role === 'therapist' ? '/therapist' : '/patient'} onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                </li>
                 {role === 'therapist' && (
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
                  <Link to="/contacts" onClick={() => setMenuOpen(false)}>
                    Contacts
                  </Link>
                </li>
                <li>
                  <Link to="/settings" onClick={() => setMenuOpen(false)}>
                    Settings
                  </Link>
                </li>
                <li>
                  <Link to="/achievements" onClick={() => setMenuOpen(false)}>
                    Achievements
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
              loading ? (
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
          <Route
            path="/patient-details"
            element={user ? <PatientDetails /> : <Navigate to="/login" />}
          />

          {/* General Authenticated Routes */}
          <Route
            path="/messages"
            element={user ? <Messages /> : <Navigate to="/login" />}
          />
          <Route
            path="/contacts"
            element={user ? <Contacts /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings"
            element={user ? <Settings /> : <Navigate to="/login" />}
          />
          <Route
            path="/achievements"
            element={user ? <Achievements /> : <Navigate to="/login" />}
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