import { db } from '../firebase/config';
import { collection, getDocs, deleteDoc, doc, query, where, limit, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const cleanupMessages = async () => {
  try {
    console.log('Starting message cleanup...');
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error('No authenticated user found');
      return {
        success: false,
        error: 'Not authenticated. Please log in and try again.'
      };
    }
    
    const currentUserId = currentUser.uid;
    console.log(`Running cleanup for user: ${currentUserId}`);
    
    // Try using batched writes for better performance and atomic operations
    try {
      // Query messages where current user is a participant
      const messagesRef = collection(db, 'messages');
      
      // First attempt - try to get messages where current user is sender or receiver
      console.log('Querying messages where user is a participant...');
      const senderQuery = query(messagesRef, where('senderId', '==', currentUserId));
      const receiverQuery = query(messagesRef, where('receiverId', '==', currentUserId));
      
      // Execute queries
      const senderSnapshot = await getDocs(senderQuery);
      const receiverSnapshot = await getDocs(receiverQuery);
      
      console.log(`Found ${senderSnapshot.size} messages as sender`);
      console.log(`Found ${receiverSnapshot.size} messages as receiver`);
      
      // Combine results (avoiding duplicates)
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
      
      console.log(`Combined total: ${messagesToDelete.length} messages to delete`);
      
      if (messagesToDelete.length === 0) {
        console.log('No messages to delete.');
        return {
          success: true,
          deletedCount: 0,
          message: 'No messages found to delete'
        };
      }
      
      // Use batched writes for better performance (max 500 operations per batch)
      const BATCH_SIZE = 250;
      let totalDeleted = 0;
      let currentBatch = 0;
      
      // Process messages in batches
      for (let i = 0; i < messagesToDelete.length; i += BATCH_SIZE) {
        currentBatch++;
        const batch = writeBatch(db);
        const batchMessages = messagesToDelete.slice(i, i + BATCH_SIZE);
        
        console.log(`Processing batch ${currentBatch} with ${batchMessages.length} messages...`);
        
        // Add operations to batch
        batchMessages.forEach(message => {
          batch.delete(doc(db, 'messages', message.id));
        });
        
        try {
          // Commit the batch
          console.log(`Committing batch ${currentBatch}...`);
          await batch.commit();
          console.log(`Batch ${currentBatch} committed successfully.`);
          totalDeleted += batchMessages.length;
        } catch (batchError) {
          console.error(`Error with batch ${currentBatch}:`, batchError);
          
          // If batch fails, try deleting messages individually
          console.log('Falling back to individual message deletion...');
          let individualSuccesses = 0;
          
          for (const message of batchMessages) {
            try {
              await deleteDoc(doc(db, 'messages', message.id));
              individualSuccesses++;
              console.log(`Deleted message: ${message.id}`);
            } catch (deleteError) {
              console.error(`Failed to delete message ${message.id}:`, deleteError);
            }
          }
          
          console.log(`Individual fallback: deleted ${individualSuccesses}/${batchMessages.length} messages`);
          totalDeleted += individualSuccesses;
        }
      }
      
      console.log(`Cleanup complete: deleted ${totalDeleted}/${messagesToDelete.length} messages`);
      
      return {
        success: totalDeleted > 0,
        deletedCount: totalDeleted,
        totalMessages: messagesToDelete.length,
        message: `Deleted ${totalDeleted} out of ${messagesToDelete.length} messages`
      };
      
    } catch (permissionError) {
      console.error('Error with batched operations:', permissionError);
      
      // Fall back to manual deletion of each message
      console.log('Permission error, trying alternative approach...');
      return await manualCleanupFallback(currentUserId);
    }
  } catch (error) {
    console.error('Unexpected error in cleanup messages:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
};

// Fallback manual cleanup function
async function manualCleanupFallback(currentUserId) {
  try {
    console.log('Using manual cleanup as fallback...');
    
    if (!currentUserId) {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        return {
          success: false,
          error: 'Not authenticated'
        };
      }
      currentUserId = user.uid;
    }
    
    // Try individual queries for sender and receiver
    const messagesRef = collection(db, 'messages');
    let senderMessages = [];
    let receiverMessages = [];
    
    try {
      const senderQuery = query(messagesRef, where('senderId', '==', currentUserId));
      const senderSnapshot = await getDocs(senderQuery);
      senderMessages = senderSnapshot.docs;
      console.log(`Fallback found ${senderMessages.length} messages as sender`);
    } catch (senderError) {
      console.error('Error querying sender messages:', senderError);
    }
    
    try {
      const receiverQuery = query(messagesRef, where('receiverId', '==', currentUserId));
      const receiverSnapshot = await getDocs(receiverQuery);
      receiverMessages = receiverSnapshot.docs;
      console.log(`Fallback found ${receiverMessages.length} messages as receiver`);
    } catch (receiverError) {
      console.error('Error querying receiver messages:', receiverError);
    }
    
    // Combine results (avoiding duplicates)
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
    
    console.log(`Fallback found ${messagesToDelete.length} total messages to delete`);
    
    if (messagesToDelete.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: 'No messages found in fallback'
      };
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // Try deleting each message individually
    for (const message of messagesToDelete) {
      try {
        await deleteDoc(doc(db, 'messages', message.id));
        successCount++;
        console.log(`Deleted message (fallback): ${message.id}`);
      } catch (deleteError) {
        errorCount++;
        console.error(`Error deleting message ${message.id}:`, deleteError);
      }
    }
    
    console.log(`Fallback cleanup: ${successCount} succeeded, ${errorCount} failed`);
    
    return {
      success: successCount > 0,
      deletedCount: successCount,
      failedCount: errorCount,
      message: `Fallback deleted ${successCount} messages, ${errorCount} failed`
    };
  } catch (fallbackError) {
    console.error('Error in fallback cleanup:', fallbackError);
    return {
      success: false,
      error: `Fallback failed: ${fallbackError.message}`
    };
  }
}

// For specific conversation cleanup
export const cleanupConversationMessages = async (conversationId) => {
  if (!conversationId) {
    console.error('No conversation ID provided');
    return {
      success: false,
      error: 'No conversation ID provided'
    };
  }
  
  try {
    console.log(`Cleaning up messages for conversation: ${conversationId}`);
    
    // Use a batched operation for conversation messages
    try {
      // First try a filtered query for efficiency
      const messagesRef = collection(db, 'messages');
      const filterQuery = query(messagesRef, where('conversationId', '==', conversationId));
      
      console.log('Executing filtered query for messages...');
      const messagesSnapshot = await getDocs(filterQuery);
      console.log(`Found ${messagesSnapshot.size} messages for conversation`);
      
      if (messagesSnapshot.empty) {
        return {
          success: true,
          deletedCount: 0,
          message: 'No messages found for this conversation'
        };
      }
      
      // Use batch for better performance
      const batch = writeBatch(db);
      messagesSnapshot.forEach(message => {
        batch.delete(doc(db, 'messages', message.id));
      });
      
      // Commit the batch
      console.log('Committing batch delete for conversation...');
      await batch.commit();
      console.log('Batch committed successfully');
      
      return {
        success: true,
        deletedCount: messagesSnapshot.size,
        conversationId,
        message: `Deleted ${messagesSnapshot.size} messages from conversation`
      };
      
    } catch (batchError) {
      console.error('Error with batch deletion:', batchError);
      console.log('Trying individual message deletion...');
      
      // Fall back to individual deletes
      const messagesRef = collection(db, 'messages');
      let messagesSnapshot;
      
      try {
        // Try with filter
        const filterQuery = query(messagesRef, where('conversationId', '==', conversationId));
        messagesSnapshot = await getDocs(filterQuery);
      } catch (filterError) {
        console.error('Filter query failed:', filterError);
        
        // If filter fails, scan all messages
        messagesSnapshot = await getDocs(messagesRef);
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      // Try each message individually
      for (const document of messagesSnapshot.docs) {
        const data = document.data();
        
        // If we had to scan all messages, check if this one belongs to our conversation
        if (!data.conversationId || data.conversationId !== conversationId) {
          continue;
        }
        
        try {
          await deleteDoc(doc(db, 'messages', document.id));
          successCount++;
          console.log(`Deleted message: ${document.id}`);
        } catch (deleteError) {
          errorCount++;
          console.error(`Failed to delete message ${document.id}:`, deleteError);
        }
      }
      
      console.log(`Individual deletes: ${successCount} succeeded, ${errorCount} failed`);
      
      return {
        success: successCount > 0,
        deletedCount: successCount,
        errorCount: errorCount,
        conversationId,
        message: `Deleted ${successCount} messages, ${errorCount} failed` 
      };
    }
  } catch (error) {
    console.error('Error cleaning up conversation messages:', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 