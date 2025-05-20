import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Look at all messages in a chat
export const debugCheckMessages = async (conversationId) => {
  try {
    // Get messages from the database
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId)
    );
    
    const querySnapshot = await getDocs(messagesQuery);
    
    console.log(`Found ${querySnapshot.size} messages in chat ${conversationId}`);
    
    // Put messages in order by time
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    messages.sort((a, b) => {
      const getTimestamp = (msg) => {
        if (msg.timestamp) {
          if (msg.timestamp.toDate) return msg.timestamp.toDate().getTime();
          if (msg.timestamp.seconds) return msg.timestamp.seconds * 1000;
        }
        if (msg.clientTimestamp) {
          return new Date(msg.clientTimestamp).getTime();
        }
        return 0;
      };
      
      return getTimestamp(a) - getTimestamp(b);
    });
    
    // Show each message
    messages.forEach((message) => {
      console.log(`Message ID: ${message.id}`);
      console.log(`- From: ${message.senderId}`);
      console.log(`- To: ${message.receiverId}`);
      console.log(`- Text: ${message.content}`);
      console.log(`- Time:`, message.timestamp);
      console.log(`- Local Time:`, message.clientTimestamp);
      console.log('---');
    });
    
    return messages.length; // Tell us how many messages we found
  } catch (error) {
    console.error('Error checking messages:', error);
    return 0;
  }
};

// Make a test message
export const createTestMessage = async (senderId, receiverId, content = 'Test Message') => {
  try {
    const conversationId = [senderId, receiverId].sort().join('_');
    
    const messageData = {
      senderId,
      receiverId,
      content,
      conversationId,
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
    };
    
    const docRef = await addDoc(collection(db, 'messages'), messageData);
    
    console.log(`Made test message with ID: ${docRef.id}`);
    
    // Check if the message was saved
    try {
      const messageRef = doc(db, 'messages', docRef.id);
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        console.log('Message saved:', messageDoc.data());
      } else {
        console.warn('Message not found after saving');
      }
    } catch (verifyError) {
      console.warn('Error checking if message was saved:', verifyError);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error making test message:', error);
    return null;
  }
};

/*
How to use in the browser console:

import { debugCheckMessages, createTestMessage } from './utils/messagingDebug';

debugCheckMessages('USER_ID_1_USER_ID_2'); // Put in real user IDs
createTestMessage('USER_ID_1', 'USER_ID_2', 'This is a test message');
*/ 