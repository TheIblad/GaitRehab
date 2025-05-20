import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { auth, db } from './firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { fetchUserData } from './utils/firestoreQueries';
import { TasksProvider } from './contexts/TasksContext';

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

// Send you to your dashboard
function DashboardRedirect() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [roleLoading, setRoleLoading] = useState(true);
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  useEffect(() => {
    console.log("DashboardRedirect - Component mounted/updated");
    console.log("Auth loading:", authLoading);
    console.log("User:", user?.uid);

    // Stop if we already tried to send you somewhere
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
          
          setRedirectAttempted(true); // Stop trying to send you somewhere
          
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

// Check if you can go to a page
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
          setRoleData(data); // Keep track of your role

          if (data.role !== requiredRole) {
            // Send you to your dashboard if you can't go here
            navigate(data.role === 'therapist' ? "/therapist" : "/patient", { replace: true });
            return;
          }
          // You can go here
        } else {
          console.error("User document doesn't exist! Logging out.");
          await auth.signOut();
          navigate("/login", { replace: true });
        }
      } catch (error) {
        console.error("Error in role validation:", error);
        navigate("/login", { replace: true }); // Send you to login if there's an error
      } finally {
        setRoleLoading(false);
      }
    };

    checkUserRole();
  }, [user, authLoading, requiredRole, navigate]);

  if (authLoading || roleLoading) {
    return <div>Verifying access...</div>;
  }

  // Show the page if you can go here
  if (roleData && roleData.role === requiredRole) {
    return element;
  }

  // Show nothing while sending you somewhere else
  return null;
}

// Main app content
function AppContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading: authLoading } = useAuth(); // Use auth loading state
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate(); // useNavigate is now valid here

  // Get your info when you log in
  useEffect(() => {
    if (!authLoading && user) {
      fetchUserData(user.uid).then(data => setUserData(data));
    } else if (!authLoading && !user) {
      setUserData(null); // Clear your info when you log out
    }
    // Dependency: authLoading and user
  }, [user, authLoading]);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const dashboardLink = userData?.role === 'therapist' ? '/therapist' : '/patient';

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      // Send you to home page
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      // Try another way if the first way fails
      window.location.href = '/';
    }
  };

  // Show loading while we check if you're logged in
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
                  {/* Link to your dashboard */}
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
                  <button onClick={handleSignOut}>
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
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<DashboardRedirect />} />
          
          {/* Patient Routes */}
          <Route 
            path="/patient" 
            element={
              <RoleBasedRoute 
                element={<PatientHome />} 
                requiredRole="patient" 
              />
            } 
          />
          
          {/* Therapist Routes */}
          <Route 
            path="/therapist" 
            element={
              <RoleBasedRoute 
                element={<TherapistHome />} 
                requiredRole="therapist" 
              />
            } 
          />
          <Route 
            path="/progress" 
            element={
              <RoleBasedRoute 
                element={<Progress />} 
                requiredRole="therapist" 
              />
            } 
          />
          <Route 
            path="/patient/:id" 
            element={
              <RoleBasedRoute 
                element={<PatientDetails />} 
                requiredRole="therapist" 
              />
            } 
          />
          
          {/* Shared Routes */}
          <Route 
            path="/messages" 
            element={
              <RoleBasedRoute 
                element={<Messages />} 
                requiredRole={userData?.role || 'patient'} 
              />
            } 
          />
          <Route 
            path="/contacts" 
            element={
              <RoleBasedRoute 
                element={<Contacts />} 
                requiredRole={userData?.role || 'patient'} 
              />
            } 
          />
          <Route 
            path="/settings" 
            element={
              <RoleBasedRoute 
                element={<Settings />} 
                requiredRole={userData?.role || 'patient'} 
              />
            } 
          />
          <Route 
            path="/achievements" 
            element={
              <RoleBasedRoute 
                element={<Achievements />} 
                requiredRole={userData?.role || 'patient'} 
              />
            } 
          />
        </Routes>
      </main>
    </>
  );
}

// Main app
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TasksProvider>
          <AppContent />
        </TasksProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;