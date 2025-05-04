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
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchUserData } from '../utils/firestoreQueries';
import './Messages.css';

function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // Get the conversation partner's ID from the query parameter
  const partnerId = searchParams.get('user');
  console.log('Partner ID:', partnerId);

  // Scroll to the bottom of the messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!user || !partnerId) {
      console.error('User or Partner ID is missing.');
      return;
    }

    // Fetch partner user data to get their name
    const fetchPartnerData = async () => {
      try {
        const partnerData = await fetchUserData(partnerId);
        if (partnerData) {
          setPartnerName(partnerData.displayName || 'Unknown User');
        } else {
          setPartnerName('Unknown User');
        }
      } catch (error) {
        console.error('Error fetching partner data:', error);
        setPartnerName('Unknown User');
      }
    };

    // Fetch the conversation metadata
    const fetchConversation = async () => {
      const conversationId = [user.uid, partnerId].sort().join('_');
      const conversationRef = doc(db, 'conversations', conversationId);

      try {
        const conversationDoc = await getDoc(conversationRef);
        if (conversationDoc.exists()) {
          const conversationData = conversationDoc.data();
          console.log('Conversation Data:', conversationData);
          // If we already have participant names, use those
          if (conversationData.participantNames && conversationData.participantNames[partnerId]) {
            setPartnerName(conversationData.participantNames[partnerId]);
          } else {
            // Otherwise fetch partner data separately
            fetchPartnerData();
          }
        } else {
          fetchPartnerData();
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
        fetchPartnerData();
      }
    };

    fetchConversation();

    // Fetch messages between the logged-in user and the partner
    const messagesQuery = query(
      collection(db, 'messages'),
      where('senderId', 'in', [user.uid, partnerId]),
      where('receiverId', 'in', [user.uid, partnerId]),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(fetchedMessages);
      setLoading(false);
      
      // Scroll to bottom after messages load
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubscribe();
  }, [user, partnerId]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    console.log('Sender ID:', user.uid);
    console.log('Receiver ID:', partnerId);
    console.log('Partner Name:', partnerName);

    try {
      const messageData = {
        senderId: user.uid,
        receiverId: partnerId,
        content: newMessage,
        timestamp: serverTimestamp(),
      };

      // Add the message to the `messages` collection
      await addDoc(collection(db, 'messages'), messageData);

      // Update the `conversations` collection
      const conversationId = [user.uid, partnerId].sort().join('_');
      const conversationRef = doc(db, 'conversations', conversationId);

      const conversationDoc = await getDoc(conversationRef);
      const unreadCount = conversationDoc.exists()
        ? conversationDoc.data()?.unreadCount || {}
        : {};

      await setDoc(
        conversationRef,
        {
          participants: [user.uid, partnerId],
          lastMessage: newMessage,
          timestamp: serverTimestamp(),
          participantNames: {
            [user.uid]: user.displayName || '',
            [partnerId]: partnerName || '',
          },
          unreadCount: {
            ...unreadCount,
            [user.uid]: 0,
            [partnerId]: (unreadCount[partnerId] || 0) + 1,
          },
        },
        { merge: true }
      );

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const grouped = {};
    
    messages.forEach(message => {
      if (!message.timestamp) return;
      
      const date = message.timestamp.toDate().toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    
    return grouped;
  };
  
  const groupedMessages = groupMessagesByDate();

  // Get first letter of name for avatar
  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };
  
  return (
    <div className="messages-container">
      <div className="messages-header">
        <div className="partner-avatar">
          {getInitials(partnerName)}
        </div>
        <h2>{partnerName}</h2>
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
                  <div className="message-content">{message.content}</div>
                  <span className="message-time">
                    {message.timestamp?.toDate().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
        <button type="submit" className="send-button">
          →
        </button>
      </form>
    </div>
  );
}

export default Messages;