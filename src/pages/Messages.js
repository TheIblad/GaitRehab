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

// Let you chat with your contacts
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

  // Get who you're talking to from the URL
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

  // Get who you can talk to
  useEffect(() => {
    if (!user) return;
    
    const fetchPartners = async () => {
      try {
        // Get your info to see if you're a therapist
        const userData = await fetchUserData(user.uid);
        
        if (userData?.role === 'therapist') {
          // Get your patients
          const patients = await fetchTherapistPatients(user.uid);
          console.log("Fetched patients for therapist:", patients);
          setPartners(patients);
        } else {
          // Get your therapist
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

    // Get your chats
    const fetchConversations = async () => {
      try {
        // Get chats you're in
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

  // Get messages when you pick someone to talk to
  useEffect(() => {
    if (!user || !partnerId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get their name
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

    // Make a chat room ID
    const conversationId = [user.uid, partnerId].sort().join('_');
    console.log('Conversation ID:', conversationId);

    // Clear unread messages when you look at them
    const updateUnreadCount = async () => {
      try {
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationSnap = await getDoc(conversationRef);
        
        if (conversationSnap.exists()) {
          const data = conversationSnap.data();
          if (data.unreadCount && data.unreadCount[user.uid] > 0) {
            // Clear your unread count
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

    // Get the messages
    const fetchMessagesDirectly = async () => {
      try {
        const messagesRef = collection(db, 'messages');
        console.log('Attempting to fetch messages for conversation:', conversationId);
        
        // Make sure the chat room exists
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
        
        // Try to get messages in order
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
            
            // Check if there are any messages
            const countQuery = query(
              messagesRef,
              where('conversationId', '==', conversationId),
              limit(1)
            );
            
            const countSnapshot = await getDocs(countQuery);
            console.log('Simple query result:', countSnapshot.size, 'messages');
            
            if (!countSnapshot.empty) {
              console.warn('Messages exist but orderBy query returned empty - index might not be available yet');
              // Try without order
              processMessages(countSnapshot);
            } else {
              console.log('No messages exist for this conversation');
              setMessages([]);
            }
          }
        } catch (orderByError) {
          // If we can't get them in order, try without order
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
            console.log('No messages found in fallback query');
            setMessages([]);
          }
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessagesDirectly();

    // Listen for new messages
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, 
      (snapshot) => {
        console.log('Received message snapshot with', snapshot.size, 'messages');
        handleMessagesSnapshot(snapshot);
      },
      (error) => {
        console.error('Error in messages snapshot:', error);
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up message listener');
      unsubscribe();
    };
  }, [user, partnerId, partnerName]);

  // Process messages from a snapshot
  const processMessages = (snapshot) => {
    const messagesList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
      };
    });
    
    console.log('Processed messages:', messagesList.length);
    setMessages(messagesList);
    scrollToBottom();
  };

  // Handle new messages
  function handleMessagesSnapshot(snapshot) {
    const messagesList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
      };
    });
    
    console.log('Processed snapshot messages:', messagesList.length);
    setMessages(messagesList);
    scrollToBottom();
  }

  // Send a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !partnerId) return;

    try {
      const conversationId = [user.uid, partnerId].sort().join('_');
      
      // Add the message
      const messageData = {
        conversationId,
        senderId: user.uid,
        text: newMessage.trim(),
        timestamp: serverTimestamp(),
        read: false
      };
      
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      console.log('Message sent with ID:', docRef.id);
      
      // Update the chat room
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        const updatedUnreadCount = { ...data.unreadCount };
        updatedUnreadCount[partnerId] = (updatedUnreadCount[partnerId] || 0) + 1;
        
        await setDoc(conversationRef, {
          lastMessage: newMessage.trim(),
          timestamp: serverTimestamp(),
          unreadCount: updatedUnreadCount
        }, { merge: true });
      }
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Pick who to talk to
  const handlePartnerSelect = (partnerId) => {
    navigate(`/messages?user=${partnerId}`);
  };

  // Get date from timestamp
  const getDateFromTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleDateString();
  };

  // Put messages in groups by date
  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(message => {
      const date = getDateFromTimestamp(message.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  // Get initials from name
  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  // Format message time
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get other person's ID
  const getOtherParticipantId = (conversation) => {
    return conversation.participants.find(id => id !== user.uid);
  };

  // Format last message time
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Debug: Check messages
  const debugCheckMessages = async () => {
    try {
      const messagesRef = collection(db, 'messages');
      const snapshot = await getDocs(messagesRef);
      console.log('Total messages in database:', snapshot.size);
      
      snapshot.forEach(doc => {
        console.log('Message:', doc.id, doc.data());
      });
    } catch (error) {
      console.error('Error checking messages:', error);
    }
  };

  // Debug: Make a test message
  const createTestMessage = async () => {
    if (!user || !partnerId) return;
    
    try {
      const conversationId = [user.uid, partnerId].sort().join('_');
      
      const messageData = {
        conversationId,
        senderId: user.uid,
        text: 'Test message ' + new Date().toISOString(),
        timestamp: serverTimestamp(),
        read: false
      };
      
      const docRef = await addDoc(collection(db, 'messages'), messageData);
      console.log('Test message sent with ID:', docRef.id);
    } catch (error) {
      console.error('Error creating test message:', error);
    }
  };

  // Clean up old messages
  const handleCleanupMessages = async () => {
    try {
      const result = await cleanupMessages();
      console.log('Cleanup result:', result);
      alert(`Cleaned up ${result.deleted} messages`);
    } catch (error) {
      console.error('Error cleaning up messages:', error);
      alert('Failed to clean up messages');
    }
  };

  // Clean up old chats
  const handleCleanupConversation = async () => {
    try {
      const result = await cleanupConversationMessages();
      console.log('Cleanup result:', result);
      alert(`Cleaned up ${result.deleted} conversations`);
    } catch (error) {
      console.error('Error cleaning up conversations:', error);
      alert('Failed to clean up conversations');
    }
  };

  return (
    <div className="messages-container">
      <div className="messages-sidebar">
        <div className="conversations-list">
          <h3>Chats</h3>
          {conversations.map(conversation => {
            const otherId = getOtherParticipantId(conversation);
            const otherName = conversation.participantNames?.[otherId] || 'Unknown';
            const unreadCount = conversation.unreadCount?.[user.uid] || 0;
            
            return (
              <Card
                key={conversation.id}
                className={`conversation-card ${otherId === partnerId ? 'active' : ''}`}
                onClick={() => handlePartnerSelect(otherId)}
              >
                <div className="conversation-info">
                  <div className="conversation-avatar">
                    {getInitials(otherName)}
                  </div>
                  <div className="conversation-details">
                    <h4>{otherName}</h4>
                    <p className="last-message">{conversation.lastMessage || 'No messages yet'}</p>
                  </div>
                  {unreadCount > 0 && (
                    <div className="unread-badge">{unreadCount}</div>
                  )}
                </div>
                <div className="conversation-time">
                  {formatLastMessageTime(conversation.timestamp)}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      
      <div className="messages-main">
        {partnerId ? (
          <>
            <div className="messages-header">
              <h3>{partnerName}</h3>
            </div>
            
            {loading ? (
              <div className="loading-container">
                <p>Loading messages...</p>
              </div>
            ) : (
              <div className="messages-list">
                {Object.entries(groupMessagesByDate()).map(([date, messages]) => (
                  <div key={date} className="message-group">
                    <div className="date-divider">{date}</div>
                    {messages.map(message => (
                      <div
                        key={message.id}
                        className={`message ${message.senderId === user.uid ? 'sent' : 'received'}`}
                      >
                        <div className="message-content">
                          <div className="message-text">{message.text}</div>
                          <div className="message-time">
                            {formatMessageTime(message.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
            
            <form onSubmit={handleSendMessage} className="message-input-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="message-input"
              />
              <Button type="submit" disabled={!newMessage.trim()}>
                Send
              </Button>
            </form>
          </>
        ) : (
          <div className="no-conversation">
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;