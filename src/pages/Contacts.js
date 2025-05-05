import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc,
  arrayUnion,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import './Contacts.css';

function Contacts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user data and contacts on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setCurrentUserData(userData);
          
          // Fetch contacts
          if (userData.role === 'therapist') {
            // For therapists, fetch their patients
            const patientsQuery = query(
              collection(db, 'users'),
              where('assignedTherapistId', '==', user.uid)
            );
            const patientsSnapshot = await getDocs(patientsQuery);
            
            const patientsList = [];
            patientsSnapshot.forEach((doc) => {
              patientsList.push({ id: doc.id, ...doc.data() });
            });
            
            setContacts(patientsList);
          } else {
            // For patients, fetch their therapist if assigned
            if (userData.assignedTherapistId) {
              const therapistDoc = await getDoc(doc(db, 'users', userData.assignedTherapistId));
              if (therapistDoc.exists()) {
                setContacts([{ id: therapistDoc.id, ...therapistDoc.data() }]);
              }
            }
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);

  // Search for users
  const handleSearch = async () => {
    if (!searchTerm.trim() || !user) return;
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      // Search by display name (case insensitive would require a different approach in Firestore)
      const nameQuery = query(
        collection(db, 'users'),
        where('displayName', '>=', searchTerm),
        where('displayName', '<=', searchTerm + '\uf8ff')
      );
      
      // Also search by email if the search term looks like an email
      const emailQuery = searchTerm.includes('@') ? 
        query(collection(db, 'users'), where('email', '==', searchTerm.toLowerCase())) : null;
      
      const nameSnapshot = await getDocs(nameQuery);
      const results = [];
      
      // Add name query results
      nameSnapshot.forEach((doc) => {
        // Don't include the current user in results
        if (doc.id !== user.uid) {
          results.push({ id: doc.id, ...doc.data() });
        }
      });
      
      // Add email query results if we did that search
      if (emailQuery) {
        const emailSnapshot = await getDocs(emailQuery);
        emailSnapshot.forEach((doc) => {
          // Check if this user is already in the results and not the current user
          if (doc.id !== user.uid && !results.some(r => r.id === doc.id)) {
            results.push({ id: doc.id, ...doc.data() });
          }
        });
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching for users:', error);
    } finally {
      setSearching(false);
    }
  };

  // Connect with a user
  const handleConnect = async (targetUser) => {
    if (!user || !currentUserData || !targetUser) return;
    
    try {
      const isCurrentUserTherapist = currentUserData.role === 'therapist';
      const isTargetUserPatient = targetUser.role === 'patient';
      const isTargetUserTherapist = targetUser.role === 'therapist';
      
      // Handle Therapist connecting to a Patient
      if (isCurrentUserTherapist && isTargetUserPatient) {
        // Update the patient to assign therapist
        await updateDoc(doc(db, 'users', targetUser.id), {
          assignedTherapistId: user.uid
        });
        
        // Create a conversation document if it doesn't exist
        const conversationId = [user.uid, targetUser.id].sort().join('_');
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationSnap = await getDoc(conversationRef);
        
        if (!conversationSnap.exists()) {
          await setDoc(conversationRef, {
            participants: [user.uid, targetUser.id],
            lastMessage: '',
            timestamp: new Date(),
            participantNames: {
              [user.uid]: user.displayName || currentUserData.displayName || '',
              [targetUser.id]: targetUser.displayName || ''
            },
            unreadCount: {
              [user.uid]: 0,
              [targetUser.id]: 0
            }
          });
        }
        
        alert(`You are now connected to patient: ${targetUser.displayName}`);
        // Refresh contacts
        window.location.reload();
      }
      // Handle Patient connecting to a Therapist
      else if (!isCurrentUserTherapist && isTargetUserTherapist) {
        // Patients can request therapists
        await updateDoc(doc(db, 'users', user.uid), {
          assignedTherapistId: targetUser.id
        });
        
        // Create a conversation
        const conversationId = [user.uid, targetUser.id].sort().join('_');
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationSnap = await getDoc(conversationRef);
        
        if (!conversationSnap.exists()) {
          await setDoc(conversationRef, {
            participants: [user.uid, targetUser.id],
            lastMessage: '',
            timestamp: new Date(),
            participantNames: {
              [user.uid]: user.displayName || currentUserData.displayName || '',
              [targetUser.id]: targetUser.displayName || ''
            },
            unreadCount: {
              [user.uid]: 0,
              [targetUser.id]: 0
            }
          });
        }
        
        alert(`You are now connected to therapist: ${targetUser.displayName}`);
        // Refresh contacts
        window.location.reload();
      }
      // Handle other connections (for future enhancement)
      else {
        alert("Connections are currently only supported between therapists and patients.");
      }
    } catch (error) {
      console.error('Error connecting with user:', error);
      alert(`Failed to connect: ${error.message}`);
    }
  };

  // Start a conversation with a contact
  const handleStartConversation = (contactId) => {
    navigate(`/messages?user=${contactId}`);
  };

  // Check if user is already connected
  const isUserConnected = (userId) => {
    if (!contacts || contacts.length === 0) return false;
    return contacts.some(contact => contact.id === userId);
  };

  return (
    <div className="contacts-container">
      <h1>Contacts</h1>
      
      {loading ? (
        <p>Loading your contacts...</p>
      ) : !user ? (
        <p>Please log in to view and manage your contacts.</p>
      ) : (
        <>
          {/* Current user info */}
          <Card className="user-info-card">
            <h3>Your Profile</h3>
            <p><strong>Name:</strong> {currentUserData?.displayName || user.displayName || 'N/A'}</p>
            <p><strong>Role:</strong> {currentUserData?.role || 'N/A'}</p>
            {currentUserData?.role === 'patient' && (
              <p>
                <strong>Therapist:</strong> {
                  contacts.length > 0 
                    ? contacts[0].displayName 
                    : 'No therapist assigned'
                }
              </p>
            )}
          </Card>
          
          {/* Contacts list */}
          <Card className="contacts-list-card">
            <h3>Your Contacts</h3>
            {contacts.length === 0 ? (
              <p>You don't have any contacts yet. Search below to connect with users.</p>
            ) : (
              <ul className="contacts-list">
                {contacts.map(contact => (
                  <li key={contact.id} className="contact-item">
                    <div className="contact-info">
                      <div className="contact-avatar">
                        {contact.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <h4>{contact.displayName}</h4>
                        <p>Role: {contact.role}</p>
                      </div>
                    </div>
                    <Button 
                      variant="primary" 
                      size="small"
                      onClick={() => handleStartConversation(contact.id)}
                    >
                      Message
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          
          {/* Search for users */}
          <Card className="search-card">
            <h3>Find Users</h3>
            <div className="search-input-container">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email"
                className="search-input"
              />
              <Button 
                variant="primary"
                onClick={handleSearch}
                disabled={searching || !searchTerm.trim()}
              >
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            
            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="search-results">
                <h4>Search Results</h4>
                <ul className="results-list">
                  {searchResults.map(result => (
                    <li key={result.id} className="result-item">
                      <div className="result-info">
                        <div className="result-avatar">
                          {result.displayName?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <h4>{result.displayName}</h4>
                          <p>Role: {result.role}</p>
                        </div>
                      </div>
                      {isUserConnected(result.id) ? (
                        <Button 
                          variant="secondary" 
                          size="small"
                          onClick={() => handleStartConversation(result.id)}
                        >
                          Message
                        </Button>
                      ) : (
                        <Button 
                          variant="primary" 
                          size="small"
                          onClick={() => handleConnect(result)}
                        >
                          Connect
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {searchTerm && searchResults.length === 0 && !searching && (
              <p>No users found matching your search.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default Contacts; 