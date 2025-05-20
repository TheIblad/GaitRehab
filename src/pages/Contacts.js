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

// Show your contacts and let you add new ones
function Contacts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get your info and contacts when you start
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
          
          // Get your contacts
          if (userData.role === 'therapist') {
            // Get your patients
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
            // Get your therapist
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

  // Look for users
  const handleSearch = async () => {
    if (!searchTerm.trim() || !user) return;
    
    setSearching(true);
    setSearchResults([]);
    
    try {
      // Look by name
      const nameQuery = query(
        collection(db, 'users'),
        where('displayName', '>=', searchTerm),
        where('displayName', '<=', searchTerm + '\uf8ff')
      );
      
      // Look by email if it looks like an email
      const emailQuery = searchTerm.includes('@') ? 
        query(collection(db, 'users'), where('email', '==', searchTerm.toLowerCase())) : null;
      
      const nameSnapshot = await getDocs(nameQuery);
      const results = [];
      
      // Add name results
      nameSnapshot.forEach((doc) => {
        // Don't show yourself
        if (doc.id !== user.uid) {
          results.push({ id: doc.id, ...doc.data() });
        }
      });
      
      // Add email results if we looked by email
      if (emailQuery) {
        const emailSnapshot = await getDocs(emailQuery);
        emailSnapshot.forEach((doc) => {
          // Don't show yourself or duplicates
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

  // Add a new contact
  const handleConnect = async (targetUser) => {
    if (!user || !currentUserData || !targetUser) return;
    
    try {
      const isCurrentUserTherapist = currentUserData.role === 'therapist';
      const isTargetUserPatient = targetUser.role === 'patient';
      const isTargetUserTherapist = targetUser.role === 'therapist';
      
      // Let therapist add a patient
      if (isCurrentUserTherapist && isTargetUserPatient) {
        // Save the patient's therapist
        await updateDoc(doc(db, 'users', targetUser.id), {
          assignedTherapistId: user.uid
        });
        
        // Make a chat room
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
        // Get new contacts
        window.location.reload();
      }
      // Let patient add a therapist
      else if (!isCurrentUserTherapist && isTargetUserTherapist) {
        // Save the patient's therapist
        await updateDoc(doc(db, 'users', user.uid), {
          assignedTherapistId: targetUser.id
        });
        
        // Make a chat room
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
        // Get new contacts
        window.location.reload();
      }
      // Other connections not allowed yet
      else {
        alert("Connections are currently only supported between therapists and patients.");
      }
    } catch (error) {
      console.error('Error connecting with user:', error);
      alert(`Failed to connect: ${error.message}`);
    }
  };

  // Start a chat with a contact
  const handleStartConversation = (contactId) => {
    navigate(`/messages?user=${contactId}`);
  };

  // Check if you're already connected
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
          {/* Your info */}
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
          
          {/* Search for new contacts */}
          <Card className="search-card">
            <h3>Find People</h3>
            <div className="search-form">
              <input
                type="text"
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="search-results">
                <h4>Results</h4>
                {searchResults.map((result) => (
                  <Card key={result.id} className="search-result-card">
                    <div className="result-info">
                      <h4>{result.displayName}</h4>
                      <p>{result.role}</p>
                    </div>
                    {!isUserConnected(result.id) && (
                      <Button
                        onClick={() => handleConnect(result)}
                        disabled={result.role === currentUserData?.role}
                      >
                        Connect
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>
          
          {/* Your contacts */}
          <Card className="contacts-card">
            <h3>Your Contacts</h3>
            {contacts.length > 0 ? (
              <div className="contacts-list">
                {contacts.map((contact) => (
                  <Card key={contact.id} className="contact-card">
                    <div className="contact-info">
                      <h4>{contact.displayName}</h4>
                      <p>{contact.role}</p>
                    </div>
                    <Button onClick={() => handleStartConversation(contact.id)}>
                      Message
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <p>No contacts yet. Search for people to connect with.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default Contacts; 