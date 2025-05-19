import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Utility for directly querying the messages collection and printing results
 * @param {string} conversationId - The ID of the conversation to check
 */
export const debugCheckMessages = async (conversationId) => {
  try {
    // First try to query with no extra parameters to avoid permissions issues
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId)
    );
    
    const querySnapshot = await getDocs(messagesQuery);
    
    console.log(`DEBUG: Found ${querySnapshot.size} messages for conversation ${conversationId}`);
    
    // Sort messages by clientTimestamp first (since it's more reliable)
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by timestamp or clientTimestamp
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
    
    // Print each message
    messages.forEach((message) => {
      console.log(`Message ID: ${message.id}`);
      console.log(`- Sender: ${message.senderId}`);
      console.log(`- Receiver: ${message.receiverId}`);
      console.log(`- Content: ${message.content}`);
      console.log(`- Timestamp:`, message.timestamp);
      console.log(`- Client Timestamp:`, message.clientTimestamp);
      console.log('---');
    });
    
    return messages.length; // Return the count of messages
  } catch (error) {
    console.error('Error in debug message check:', error);
    return 0;
  }
};

/**
 * Create a test message directly in Firestore
 */
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
    
    console.log(`DEBUG: Created test message with ID: ${docRef.id}`);
    
    // Verify the message was added by fetching it directly
    try {
      const messageRef = doc(db, 'messages', docRef.id);
      const messageDoc = await getDoc(messageRef);
      if (messageDoc.exists()) {
        console.log('Message verified in database:', messageDoc.data());
      } else {
        console.warn('Message could not be verified after creation');
      }
    } catch (verifyError) {
      console.warn('Error verifying message creation:', verifyError);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating test message:', error);
    return null;
  }
};

/**
 * Open the browser console and run the following to debug messages:
 * 
 * import { debugCheckMessages, createTestMessage } from './utils/messagingDebug';
 * 
 * // Check existing messages 
 * debugCheckMessages('USER_ID_1_USER_ID_2'); // Replace with actual IDs
 * 
 * // Create a test message
 * createTestMessage('USER_ID_1', 'USER_ID_2', 'This is a test message');
 */ 