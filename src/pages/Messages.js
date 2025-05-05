import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchUserData, fetchTherapistPatients } from '../utils/firestoreQueries';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import './Messages.css';
import { cleanupMessages, cleanupConversationMessages } from '../utils/firebaseCleanup';

function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState('');
  const [partners, setPartners] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [conversations, setConversations] = useState([]);

  // Get the conversation partner's ID from the query parameter
  const partnerId = searchParams.get('user');
  
  // Debug info for troubleshooting
  useEffect(() => {
    console.log('Current user ID:', user?.uid);
    console.log('Partner ID from URL:', partnerId);
  }, [user, partnerId]);

  // Scroll to the bottom of the messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch available conversation partners
  useEffect(() => {
    if (!user) return;
    
    const fetchPartners = async () => {
      try {
        // Get user data to check role
        const userData = await fetchUserData(user.uid);
        
        if (userData?.role === 'therapist') {
          // If therapist, fetch their patients
          const patients = await fetchTherapistPatients(user.uid);
          console.log("Fetched patients for therapist:", patients);
          setPartners(patients);
        } else {
          // If patient, fetch their therapist
          if (userData?.assignedTherapistId) {
            const therapistData = await fetchUserData(userData.assignedTherapistId);
            if (therapistData) {
              console.log("Fetched therapist for patient:", therapistData);
              setPartners([therapistData]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching partners:', error);
      }
    };

    // Fetch existing conversations for user
    const fetchConversations = async () => {
      try {
        // Query conversations where the user is a participant
        const conversationsQuery = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', user.uid)
        );
        
        const snapshot = await getDocs(conversationsQuery);
        const conversationsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('Fetched conversations:', conversationsList);
        setConversations(conversationsList);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
    };

    fetchPartners();
    fetchConversations();
  }, [user]);

  // Fetch messages when partnerId changes
  useEffect(() => {
    if (!user || !partnerId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch partner user data to get their name
    const fetchPartnerData = async () => {
      try {
        console.log('Fetching data for partner ID:', partnerId);
        const partnerData = await fetchUserData(partnerId);
        if (partnerData) {
          console.log('Partner data:', partnerData);
          setPartnerName(partnerData.displayName || 'Unknown User');
        } else {
          console.error('Partner data not found');
          setPartnerName('Unknown User');
        }
      } catch (error) {
        console.error('Error fetching partner data:', error);
        setPartnerName('Unknown User');
      }
    };

    fetchPartnerData();

    // Create conversation ID (always sort to ensure consistency)
    const conversationId = [user.uid, partnerId].sort().join('_');
    console.log('Conversation ID:', conversationId);

    // Reset unread count for current user when viewing conversation
    const updateUnreadCount = async () => {
      try {
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationSnap = await getDoc(conversationRef);
        
        if (conversationSnap.exists()) {
          const data = conversationSnap.data();
          if (data.unreadCount && data.unreadCount[user.uid] > 0) {
            // Update only the current user's unread count
            const updatedUnreadCount = { ...data.unreadCount };
            updatedUnreadCount[user.uid] = 0;
            
            await setDoc(conversationRef, 
              { unreadCount: updatedUnreadCount }, 
              { merge: true }
            );
            console.log("Reset unread count for current user");
          }
        }
      } catch (error) {
        console.error("Error updating unread count:", error);
      }
    };
    
    updateUnreadCount();

    // First, directly fetch messages to ensure we have initial data
    const fetchMessagesDirectly = async () => {
      try {
        const messagesRef = collection(db, 'messages');
        console.log('Attempting to fetch messages for conversation:', conversationId);
        
        // First create the conversation to ensure it exists
        try {
          const conversationRef = doc(db, 'conversations', conversationId);
          const conversationSnap = await getDoc(conversationRef);
          
          if (!conversationSnap.exists()) {
            console.log('Creating new conversation document');
            await setDoc(conversationRef, {
              participants: [user.uid, partnerId],
              lastMessage: "",
              timestamp: serverTimestamp(),
              participantNames: {
                [user.uid]: user.displayName || '',
                [partnerId]: partnerName || 'Partner',
              },
              unreadCount: {
                [user.uid]: 0,
                [partnerId]: 0,
              },
            });
            console.log('Conversation document created successfully');
          } else {
            console.log('Conversation document exists:', conversationSnap.data());
          }
        } catch (convError) {
          console.error('Error with conversation document:', convError);
        }
        
        // First try with a query that includes orderBy
        try {
          const q = query(
            messagesRef,
            where('conversationId', '==', conversationId),
            orderBy('timestamp', 'asc')
          );
          
          console.log('Executing direct query for messages with orderBy...');
          const querySnapshot = await getDocs(q);
          console.log('Query result with orderBy:', querySnapshot.size, 'messages');
          
          if (!querySnapshot.empty) {
            processMessages(querySnapshot);
          } else {
            console.log('No messages found with orderBy query');
            
            // Check if there should be messages
            const countQuery = query(
              messagesRef,
              where('conversationId', '==', conversationId),
              limit(1)
            );
            
            const countSnapshot = await getDocs(countQuery);
            console.log('Simple query result:', countSnapshot.size, 'messages');
            
            if (!countSnapshot.empty) {
              console.warn('Messages exist but orderBy query returned empty - index might not be available yet');
              // Try processing without orderBy
              processMessages(countSnapshot);
            } else {
              console.log('No messages exist for this conversation');
              setMessages([]);
            }
          }
        } catch (orderByError) {
          // If we get permission error with orderBy, try without it
          console.warn('Error with orderBy query:', orderByError.message);
          console.log('Trying query without orderBy...');
          
          const fallbackQuery = query(
            messagesRef,
            where('conversationId', '==', conversationId)
          );
          
          console.log('Executing fallback query without orderBy...');
          const fallbackSnapshot = await getDocs(fallbackQuery);
          console.log('Fallback query result:', fallbackSnapshot.size, 'messages');
          
          if (!fallbackSnapshot.empty) {
            processMessages(fallbackSnapshot);
          } else {
            console.log('No messages found with fallback query');
            setMessages([]);
          }
        }
      } catch (error) {
        console.error('Error in direct messages query:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        setMessages([]);
        setLoading(false);
      }
    };
    
    // Helper function to process message snapshots
    const processMessages = (snapshot) => {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Directly fetched ${fetchedMessages.length} messages for conversation:`, conversationId);
      
      // Sort messages by timestamp or clientTimestamp
      fetchedMessages.sort((a, b) => {
        const getTimestamp = (msg) => {
          if (msg.timestamp?.seconds) {
            return msg.timestamp.seconds * 1000;
          } else if (msg.clientTimestamp) {
            return new Date(msg.clientTimestamp).getTime();
          } else {
            return 0; // Default for missing timestamp
          }
        };
        
        return getTimestamp(a) - getTimestamp(b);
      });
      
      // Log each message content for debugging
      fetchedMessages.forEach((msg, idx) => {
        console.log(`Message ${idx + 1}: ${msg.content} (${msg.senderId === user.uid ? 'sent' : 'received'})`);
      });
      
      setMessages(fetchedMessages);
      setTimeout(scrollToBottom, 100);
      setLoading(false);
    };
    
    fetchMessagesDirectly();

    // Then set up real-time listener for future updates, trying to avoid orderBy if needed
    console.log('Setting up messages listener for conversation:', conversationId);
    
    let unsubscribe;
    
    try {
      // Try with orderBy first
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'asc')
      );
      
      unsubscribe = onSnapshot(messagesQuery, handleMessagesSnapshot, error => {
        console.error('Error in messages listener with orderBy:', error);
        
        // If we get an error with orderBy, try without it
        try {
          const fallbackQuery = query(
            collection(db, 'messages'),
            where('conversationId', '==', conversationId)
          );
          
          // If we're here due to an error, replace the current unsubscribe
          if (unsubscribe) {
            unsubscribe();
          }
          
          unsubscribe = onSnapshot(fallbackQuery, handleMessagesSnapshot, error => {
            console.error('Error in fallback messages listener:', error);
          });
        } catch (fallbackError) {
          console.error('Error setting up fallback listener:', fallbackError);
        }
      });
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      try {
        // Try simple listener without orderBy
        const fallbackQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId)
        );
        
        unsubscribe = onSnapshot(fallbackQuery, handleMessagesSnapshot, error => {
          console.error('Error in fallback messages listener:', error);
        });
      } catch (fallbackError) {
        console.error('Error setting up fallback listener:', fallbackError);
      }
    }
    
    // Helper function to handle message snapshots
    function handleMessagesSnapshot(snapshot) {
      const fetchedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Real-time update: ${fetchedMessages.length} messages for conversation ${conversationId}`);
      
      // Sort by timestamp or clientTimestamp
      fetchedMessages.sort((a, b) => {
        const getTimestamp = (msg) => {
          if (msg.timestamp?.seconds) {
            return msg.timestamp.seconds * 1000;
          } else if (msg.clientTimestamp) {
            return new Date(msg.clientTimestamp).getTime();
          } else {
            return 0;
          }
        };
        
        return getTimestamp(a) - getTimestamp(b);
      });
      
      setMessages(fetchedMessages);
      
      // Auto-scroll to bottom when new messages arrive
      if (fetchedMessages.length > messages.length) {
        setTimeout(scrollToBottom, 100);
      }
    }

    return () => {
      console.log('Cleaning up message listener');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, partnerId]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !user || !partnerId) return;

    console.log('Sending message:');
    console.log('- From:', user.uid);
    console.log('- To:', partnerId);
    console.log('- Content:', newMessage);

    try {
      // Create conversation ID (always sort to ensure consistency)
      const conversationId = [user.uid, partnerId].sort().join('_');
      
      const messageData = {
        senderId: user.uid,
        receiverId: partnerId,
        content: newMessage,
        conversationId: conversationId,
        timestamp: serverTimestamp(),
        clientTimestamp: new Date().toISOString(), // Backup timestamp for immediate display
      };

      console.log('Message data:', JSON.stringify(messageData));

      try {
        // First, try to create the conversation document if it doesn't exist
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationDoc = await getDoc(conversationRef);
        
        if (!conversationDoc.exists()) {
          console.log('Creating new conversation document');
          await setDoc(conversationRef, {
            participants: [user.uid, partnerId],
            lastMessage: "",
            timestamp: serverTimestamp(),
            participantNames: {
              [user.uid]: user.displayName || '',
              [partnerId]: partnerName || 'Partner',
            },
            unreadCount: {
              [user.uid]: 0,
              [partnerId]: 0,
            },
          });
          console.log('Conversation document created successfully');
        }
      } catch (conversationError) {
        console.error('Error with conversation document:', conversationError);
        // Continue with message sending despite conversation error
      }

      // Add the message to the `messages` collection
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      console.log('Message added with ID:', docRef.id);

      // Update the `conversations` collection
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      // Get current unreadCount or initialize
      const unreadCount = conversationDoc.exists() && conversationDoc.data().unreadCount
        ? { ...conversationDoc.data().unreadCount }
        : {};
      
      // Reset sender's unread count, increment receiver's
      unreadCount[user.uid] = 0;
      unreadCount[partnerId] = (unreadCount[partnerId] || 0) + 1;
      
      // Get current participant names or initialize
      let participantNames = {};
      if (conversationDoc.exists() && conversationDoc.data().participantNames) {
        participantNames = { ...conversationDoc.data().participantNames };
      }
      
      // Add missing names if needed
      if (!participantNames[user.uid]) {
        participantNames[user.uid] = user.displayName || '';
      }
      if (!participantNames[partnerId] && partnerName) {
        participantNames[partnerId] = partnerName;
      }

      await setDoc(
        conversationRef,
        {
          participants: [user.uid, partnerId],
          lastMessage: newMessage,
          timestamp: serverTimestamp(),
          participantNames: participantNames,
          unreadCount: unreadCount,
        },
        { merge: true }
      );

      console.log('Conversation updated successfully');
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      alert(`Failed to send message. Please try again. Error: ${error.message}
      
It may take a few minutes for Firestore security rules to update. If this is your first message, try again in a few minutes.`);
    }
  };

  // Function to select a partner
  const handlePartnerSelect = (partnerId) => {
    navigate(`/messages?user=${partnerId}`);
  };

  // Helper function to get a usable date from any type of timestamp
  const getDateFromTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    
    try {
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        // Native Firestore timestamp
        return timestamp.toDate();
      } else if (timestamp.seconds) {
        // Serialized Firestore timestamp
        return new Date(timestamp.seconds * 1000);
      } else if (typeof timestamp === 'string') {
        // ISO string timestamp
        return new Date(timestamp);
      } else if (timestamp instanceof Date) {
        // Already a Date object
        return timestamp;
      } else {
        // Fallback for unexpected format
        console.warn('Unexpected timestamp format:', timestamp);
        return new Date();
      }
    } catch (error) {
      console.error('Error parsing timestamp:', error, timestamp);
      return new Date();
    }
  };
  
  // Group messages by date - handles Firestore timestamps correctly
  const groupMessagesByDate = () => {
    const grouped = {};
    
    messages.forEach(message => {
      if (!message.timestamp && !message.clientTimestamp) {
        console.log('Message missing timestamp:', message);
        return;
      }
      
      // Use timestamp if available, otherwise fallback to clientTimestamp
      const timestamp = message.timestamp || message.clientTimestamp;
      const date = getDateFromTimestamp(timestamp);
      const dateStr = date.toLocaleDateString();
      
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      
      grouped[dateStr].push(message);
    });
    
    return grouped;
  };
  
  const groupedMessages = groupMessagesByDate();

  // Get first letter of name for avatar
  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };
  
  // Helper function to format message timestamps
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = getDateFromTimestamp(timestamp);
    if (!date) return '';
    
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get the other participant's ID from a conversation
  const getOtherParticipantId = (conversation) => {
    if (!conversation || !conversation.participants) return null;
    return conversation.participants.find(id => id !== user?.uid) || null;
  };

  // Format timestamp for last message
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString(undefined, { weekday: 'short' });
    } else {
      return date.toLocaleDateString();
    }
  };

  // Debug function to check message delivery
  const debugCheckMessages = async () => {
    if (!user || !partnerId) return;
    
    try {
      const conversationId = [user.uid, partnerId].sort().join('_');
      console.log('Debug: checking messages for conversation', conversationId);
      
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, where('conversationId', '==', conversationId));
      const snapshot = await getDocs(q);
      
      console.log(`Debug: found ${snapshot.size} messages`);
      snapshot.forEach(doc => {
        console.log('Message:', doc.id, doc.data());
      });
    } catch (error) {
      console.error('Debug: Error checking messages:', error);
    }
  };

  // Debug function to create a test message directly
  const createTestMessage = async () => {
    if (!user || !partnerId) return;
    
    try {
      const conversationId = [user.uid, partnerId].sort().join('_');
      console.log('Creating test message in conversation:', conversationId);
      
      const testMessage = {
        senderId: user.uid,
        receiverId: partnerId,
        content: `Test message at ${new Date().toLocaleTimeString()}`,
        conversationId: conversationId,
        timestamp: serverTimestamp(),
        clientTimestamp: new Date().toISOString(),
      };
      
      console.log('Test message data:', JSON.stringify(testMessage));
      
      try {
        // First, check if conversation exists and create if needed
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationSnap = await getDoc(conversationRef);
        
        if (!conversationSnap.exists()) {
          console.log('Creating new conversation document');
          await setDoc(conversationRef, {
            participants: [user.uid, partnerId],
            lastMessage: "",
            timestamp: serverTimestamp(),
            participantNames: {
              [user.uid]: user.displayName || '',
              [partnerId]: partnerName || 'Partner',
            },
            unreadCount: {
              [user.uid]: 0,
              [partnerId]: 0,
            },
          });
          console.log('Conversation document created successfully');
        }
      } catch (convError) {
        console.error('Error creating conversation:', convError);
      }
      
      // Add the message to the messages collection
      const docRef = await addDoc(collection(db, 'messages'), testMessage);
      console.log('Test message added with ID:', docRef.id);
      
      // Update conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      await setDoc(
        conversationRef,
        {
          participants: [user.uid, partnerId],
          lastMessage: testMessage.content,
          timestamp: serverTimestamp(),
          participantNames: {
            [user.uid]: user.displayName || '',
            [partnerId]: partnerName || 'Partner',
          },
          unreadCount: {
            [user.uid]: 0,
            [partnerId]: 1,
          },
        },
        { merge: true }
      );
      
      console.log('Test conversation updated');
      
      // Now manually fetch the message to verify it was saved
      try {
        setTimeout(async () => {
          console.log('Verifying message was saved...');
          const messageRef = doc(db, 'messages', docRef.id);
          const messageSnap = await getDoc(messageRef);
          if (messageSnap.exists()) {
            console.log('Message verification: Message exists!', messageSnap.data());
          } else {
            console.error('Message verification: Message NOT found!');
          }
        }, 1000);
      } catch (verifyError) {
        console.error('Error verifying message:', verifyError);
      }
    } catch (error) {
      console.error('Error creating test message:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      alert(`Failed to create test message. Error: ${error.message}
      
It may take a few minutes for Firestore security rules to update. Try again in a few minutes.`);
    }
  };
  
  // Add a cleanup function
  const handleCleanupMessages = async () => {
    if (!window.confirm("This will delete all messages while keeping conversations. Continue?")) {
      return;
    }
    
    try {
      console.log("Starting message cleanup...");
      setLoading(true);
      const result = await cleanupMessages();
      setLoading(false);
      
      console.log("Cleanup result:", result);
      
      if (result && result.success) {
        alert(`Cleanup successful! Deleted ${result.deletedCount} messages.`);
        // Refresh the page to show empty messages
        window.location.reload();
      } else {
        const errorMsg = result?.error || "Unknown error";
        alert(`Cleanup failed: ${errorMsg}\n\nCheck the browser console for more details.`);
        console.error("Detailed cleanup failure:", result);
      }
    } catch (error) {
      setLoading(false);
      console.error("Error during cleanup:", error);
      alert(`Cleanup error: ${error.message}\n\nCheck the browser console for more details.`);
    }
  };

  // Add a function to cleanup specific conversation
  const handleCleanupConversation = async () => {
    if (!user || !partnerId) return;
    
    if (!window.confirm(`This will delete all messages in this conversation with ${partnerName}. Continue?`)) {
      return;
    }
    
    try {
      const conversationId = [user.uid, partnerId].sort().join('_');
      console.log(`Cleaning up conversation: ${conversationId}`);
      
      setLoading(true);
      const result = await cleanupConversationMessages(conversationId);
      setLoading(false);
      
      console.log("Conversation cleanup result:", result);
      
      if (result && (result.success || result.deletedCount > 0)) {
        alert(`Cleanup successful! Deleted ${result.deletedCount} messages from this conversation.`);
        setMessages([]);
      } else {
        const errorMsg = result?.error || "Unknown error";
        alert(`Cleanup failed: ${errorMsg}\n\nCheck the browser console for more details.`);
        console.error("Detailed conversation cleanup failure:", result);
      }
    } catch (error) {
      setLoading(false);
      console.error("Error during conversation cleanup:", error);
      alert(`Cleanup error: ${error.message}\n\nCheck the browser console for more details.`);
    }
  };

  // If no partner is selected, show the partner selection UI with conversations
  if (!partnerId) {
    return (
      <div className="messages-container">
        <h2>Messages</h2>
        
        {conversations.length > 0 && (
          <Card className="recent-conversations">
            <h3>Recent Conversations</h3>
            <ul className="conversations-list">
              {conversations.map(conversation => {
                const otherParticipantId = getOtherParticipantId(conversation);
                if (!otherParticipantId) return null;
                
                const otherParticipantName = conversation.participantNames?.[otherParticipantId] || 'Unknown';
                const unreadCount = conversation.unreadCount?.[user.uid] || 0;
                
                return (
                  <li 
                    key={conversation.id} 
                    className={`conversation-item ${unreadCount > 0 ? 'unread' : ''}`}
                    onClick={() => handlePartnerSelect(otherParticipantId)}
                  >
                    <div className="partner-avatar">
                      {getInitials(otherParticipantName)}
                    </div>
                    <div className="conversation-info">
                      <span className="partner-name">{otherParticipantName}</span>
                      <span className="last-message">
                        {conversation.lastMessage || 'No message'}
                      </span>
                    </div>
                    <div className="conversation-meta">
                      <span className="last-time">
                        {formatLastMessageTime(conversation.timestamp)}
                      </span>
                      {unreadCount > 0 && (
                        <div className="unread-badge">{unreadCount}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        
        {partners.length > 0 ? (
          <Card>
            <h3>Contacts</h3>
            <ul className="partners-list">
              {partners.map(partner => (
                <li key={partner.id} onClick={() => handlePartnerSelect(partner.id)}>
                  <div className="partner-avatar">{getInitials(partner.displayName)}</div>
                  <div className="partner-info">
                    <span className="partner-name">{partner.displayName}</span>
                    <span className="partner-role">{partner.role}</span>
                  </div>
                  <Button size="small">Message</Button>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <p className="no-partners-message">
              {loading ? 'Loading contacts...' : 'No contacts found. Please contact your administrator if you need to message someone.'}
            </p>
          </Card>
        )}
      </div>
    );
  }
  
  return (
    <div className="messages-container">
      <div className="messages-header">
        <div className="partner-avatar">
          {getInitials(partnerName)}
        </div>
        <h2>{partnerName}</h2>
        <div style={{marginLeft: 'auto', display: 'flex', gap: '10px'}}>
          <Button 
            size="small" 
            variant="primary" 
            onClick={createTestMessage}
          >
            Send Test
          </Button>
          <Button 
            size="small" 
            variant="secondary" 
            onClick={() => navigate('/messages')}
          >
            Change Contact
          </Button>
        </div>
      </div>
      
      <div className="messages-debug" style={{marginBottom: '10px', fontSize: '12px', color: '#666'}}>
        <p>Conversation ID: {user && partnerId ? [user.uid, partnerId].sort().join('_') : 'N/A'}</p>
        <p>Messages loaded: {messages.length}</p>
        <button 
          className="debug-button"
          onClick={debugCheckMessages}
        >
          Debug Check
        </button>
        <button 
          className="debug-button"
          onClick={createTestMessage}
        >
          Create Direct Test
        </button>
        <button 
          className="debug-button"
          onClick={handleCleanupConversation}
          style={{backgroundColor: '#ffcccc'}}
        >
          Clear This Chat
        </button>
        <button 
          className="debug-button"
          onClick={handleCleanupMessages}
          style={{backgroundColor: '#ffaaaa'}}
        >
          Clear All Messages
        </button>
      </div>
      
      <div className="messages-list">
        {loading ? (
          <p className="loading-messages">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <React.Fragment key={date}>
              <div className="messages-date-divider">
                <div className="divider-line"></div>
                <span className="divider-text">{date}</span>
                <div className="divider-line"></div>
              </div>
              
              {dateMessages.map((message) => (
                <div
                  key={message.id}
                  className={`message-item ${
                    message.senderId === user.uid ? 'sent' : 'received'
                  }`}
                >
                  <div className="message-content">{message.content || '[Empty message]'}</div>
                  <span className="message-time">
                    {formatMessageTime(message.timestamp || message.clientTimestamp)}
                    {message.id && <span className="message-id">ID: {message.id.substr(-4)}</span>}
                  </span>
                </div>
              ))}
            </React.Fragment>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="message-form">
        <input
          className="message-input"
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" className="send-button" disabled={!newMessage.trim()}>
          →
        </button>
      </form>
    </div>
  );
}

export default Messages;