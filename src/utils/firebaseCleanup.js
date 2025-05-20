import { db } from '../firebase/config';
import { collection, getDocs, deleteDoc, doc, query, where, limit, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Get rid of all your messages
export const cleanupMessages = async () => {
  try {
    console.log('Starting to delete messages...');
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error('No user logged in');
      return {
        success: false,
        error: 'Please log in first.'
      };
    }
    
    const currentUserId = currentUser.uid;
    console.log(`Cleaning up messages for user: ${currentUserId}`);
    
    // Delete messages in groups to go faster
    try {
      // Find all your messages
      const messagesRef = collection(db, 'messages');
      
      // Get messages you sent or got
      console.log('Looking for user messages...');
      const senderQuery = query(messagesRef, where('senderId', '==', currentUserId));
      const receiverQuery = query(messagesRef, where('receiverId', '==', currentUserId));
      
      // Get the messages
      const senderSnapshot = await getDocs(senderQuery);
      const receiverSnapshot = await getDocs(receiverQuery);
      
      console.log(`Found ${senderSnapshot.size} sent messages`);
      console.log(`Found ${receiverSnapshot.size} received messages`);
      
      // Put all messages in one list, no repeats
      const messageIds = new Set();
      const messagesToDelete = [];
      
      senderSnapshot.forEach(doc => {
        if (!messageIds.has(doc.id)) {
          messageIds.add(doc.id);
          messagesToDelete.push(doc);
        }
      });
      
      receiverSnapshot.forEach(doc => {
        if (!messageIds.has(doc.id)) {
          messageIds.add(doc.id);
          messagesToDelete.push(doc);
        }
      });
      
      console.log(`Total messages to delete: ${messagesToDelete.length}`);
      
      if (messagesToDelete.length === 0) {
        console.log('No messages to delete.');
        return {
          success: true,
          deletedCount: 0,
          message: 'No messages found'
        };
      }
      
      // Delete messages in groups (max 250 at once)
      const BATCH_SIZE = 250;
      let totalDeleted = 0;
      let currentBatch = 0;
      
      // Go through messages in groups
      for (let i = 0; i < messagesToDelete.length; i += BATCH_SIZE) {
        currentBatch++;
        const batch = writeBatch(db);
        const batchMessages = messagesToDelete.slice(i, i + BATCH_SIZE);
        
        console.log(`Working on group ${currentBatch} with ${batchMessages.length} messages...`);
        
        // Add messages to delete
        batchMessages.forEach(message => {
          batch.delete(doc(db, 'messages', message.id));
        });
        
        try {
          // Try to delete the group
          console.log(`Deleting group ${currentBatch}...`);
          await batch.commit();
          console.log(`Group ${currentBatch} deleted.`);
          totalDeleted += batchMessages.length;
        } catch (batchError) {
          console.error(`Error with group ${currentBatch}:`, batchError);
          
          // If group delete fails, try one by one
          console.log('Trying to delete messages one by one...');
          let individualSuccesses = 0;
          
          for (const message of batchMessages) {
            try {
              await deleteDoc(doc(db, 'messages', message.id));
              individualSuccesses++;
              console.log(`Deleted message: ${message.id}`);
            } catch (deleteError) {
              console.error(`Could not delete message ${message.id}:`, deleteError);
            }
          }
          
          console.log(`Deleted ${individualSuccesses}/${batchMessages.length} messages one by one`);
          totalDeleted += individualSuccesses;
        }
      }
      
      console.log(`Done: deleted ${totalDeleted}/${messagesToDelete.length} messages`);
      
      return {
        success: totalDeleted > 0,
        deletedCount: totalDeleted,
        totalMessages: messagesToDelete.length,
        message: `Deleted ${totalDeleted} out of ${messagesToDelete.length} messages`
      };
      
    } catch (permissionError) {
      console.error('Error with group delete:', permissionError);
      
      // If group delete fails, try one by one
      console.log('Permission error, trying one by one...');
      return await manualCleanupFallback(currentUserId);
    }
  } catch (error) {
    console.error('Error deleting messages:', error);
    return {
      success: false,
      error: `Error: ${error.message}`
    };
  }
};

// If group delete fails, try one by one
async function manualCleanupFallback(currentUserId) {
  try {
    console.log('Using one by one delete...');
    
    if (!currentUserId) {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        return {
          success: false,
          error: 'Not logged in'
        };
      }
      currentUserId = user.uid;
    }
    
    // Get messages you sent or got
    const messagesRef = collection(db, 'messages');
    let senderMessages = [];
    let receiverMessages = [];
    
    try {
      const senderQuery = query(messagesRef, where('senderId', '==', currentUserId));
      const senderSnapshot = await getDocs(senderQuery);
      senderMessages = senderSnapshot.docs;
      console.log(`Found ${senderMessages.length} sent messages`);
    } catch (senderError) {
      console.error('Error getting sent messages:', senderError);
    }
    
    try {
      const receiverQuery = query(messagesRef, where('receiverId', '==', currentUserId));
      const receiverSnapshot = await getDocs(receiverQuery);
      receiverMessages = receiverSnapshot.docs;
      console.log(`Found ${receiverMessages.length} received messages`);
    } catch (receiverError) {
      console.error('Error getting received messages:', receiverError);
    }
    
    // Put all messages in one list, no repeats
    const messageIds = new Set();
    const messagesToDelete = [];
    
    senderMessages.forEach(doc => {
      if (!messageIds.has(doc.id)) {
        messageIds.add(doc.id);
        messagesToDelete.push(doc);
      }
    });
    
    receiverMessages.forEach(doc => {
      if (!messageIds.has(doc.id)) {
        messageIds.add(doc.id);
        messagesToDelete.push(doc);
      }
    });
    
    console.log(`Found ${messagesToDelete.length} total messages to delete`);
    
    if (messagesToDelete.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: 'No messages found'
      };
    }
    
    // Delete messages one by one
    let deletedCount = 0;
    
    for (const message of messagesToDelete) {
      try {
        await deleteDoc(doc(db, 'messages', message.id));
        deletedCount++;
        console.log(`Deleted message: ${message.id}`);
      } catch (error) {
        console.error(`Could not delete message ${message.id}:`, error);
      }
    }
    
    console.log(`Done: deleted ${deletedCount}/${messagesToDelete.length} messages`);
    
    return {
      success: deletedCount > 0,
      deletedCount,
      totalMessages: messagesToDelete.length,
      message: `Deleted ${deletedCount} out of ${messagesToDelete.length} messages`
    };
  } catch (error) {
    console.error('Error in manual cleanup:', error);
    return {
      success: false,
      error: `Error: ${error.message}`
    };
  }
}

// Get rid of all messages in a chat
export const cleanupConversationMessages = async (conversationId) => {
  try {
    console.log(`Starting to delete messages in chat ${conversationId}...`);
    
    // Get all messages in this chat
    const messagesRef = collection(db, 'messages');
    const messagesQuery = query(messagesRef, where('conversationId', '==', conversationId));
    const querySnapshot = await getDocs(messagesQuery);
    
    console.log(`Found ${querySnapshot.size} messages to delete`);
    
    if (querySnapshot.size === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: 'No messages found'
      };
    }
    
    // Delete messages in groups
    const BATCH_SIZE = 250;
    let totalDeleted = 0;
    let currentBatch = 0;
    
    // Go through messages in groups
    for (let i = 0; i < querySnapshot.docs.length; i += BATCH_SIZE) {
      currentBatch++;
      const batch = writeBatch(db);
      const batchMessages = querySnapshot.docs.slice(i, i + BATCH_SIZE);
      
      console.log(`Working on group ${currentBatch} with ${batchMessages.length} messages...`);
      
      // Add messages to delete
      batchMessages.forEach(message => {
        batch.delete(doc(db, 'messages', message.id));
      });
      
      try {
        // Try to delete the group
        console.log(`Deleting group ${currentBatch}...`);
        await batch.commit();
        console.log(`Group ${currentBatch} deleted.`);
        totalDeleted += batchMessages.length;
      } catch (batchError) {
        console.error(`Error with group ${currentBatch}:`, batchError);
        
        // If group delete fails, try one by one
        console.log('Trying to delete messages one by one...');
        let individualSuccesses = 0;
        
        for (const message of batchMessages) {
          try {
            await deleteDoc(doc(db, 'messages', message.id));
            individualSuccesses++;
            console.log(`Deleted message: ${message.id}`);
          } catch (deleteError) {
            console.error(`Could not delete message ${message.id}:`, deleteError);
          }
        }
        
        console.log(`Deleted ${individualSuccesses}/${batchMessages.length} messages one by one`);
        totalDeleted += individualSuccesses;
      }
    }
    
    console.log(`Done: deleted ${totalDeleted}/${querySnapshot.size} messages`);
    
    return {
      success: totalDeleted > 0,
      deletedCount: totalDeleted,
      totalMessages: querySnapshot.size,
      message: `Deleted ${totalDeleted} out of ${querySnapshot.size} messages`
    };
  } catch (error) {
    console.error('Error deleting conversation messages:', error);
    return {
      success: false,
      error: `Error: ${error.message}`
    };
  }
}; 