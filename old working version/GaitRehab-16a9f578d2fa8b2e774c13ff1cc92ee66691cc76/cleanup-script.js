// Script to clean up Firestore messages directly
// Run with: node cleanup-script.js [email] [password]

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch, 
  query, 
  limit 
} = require('firebase/firestore');

// Firebase configuration - same as your app
const firebaseConfig = {
  apiKey: "AIzaSyBW9h9MSaC7wdtUjwo-L2AvJrEJKIPBqvE",
  authDomain: "gait-rehabilitation.firebaseapp.com",
  projectId: "gait-rehabilitation",
  storageBucket: "gait-rehabilitation.firebasestorage.app",
  messagingSenderId: "497138447235",
  appId: "1:497138447235:web:45faa3ec3dcc0178dabcb6",
  measurementId: "G-7NK5L86XE6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function cleanup() {
  try {
    // Get admin credentials
    const email = process.argv[2];
    const password = process.argv[3];
    
    if (!email || !password) {
      console.error('Please provide email and password:');
      console.error('node cleanup-script.js <email> <password>');
      process.exit(1);
    }
    
    // Sign in with credentials
    console.log(`Signing in as ${email}...`);
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Signed in successfully');
    
    // Clean up messages using batch operations
    console.log('Starting message cleanup...');
    const messagesRef = collection(db, 'messages');
    
    // First check access
    console.log('Checking permissions...');
    const testQuery = query(messagesRef, limit(1));
    const testSnapshot = await getDocs(testQuery);
    console.log(`Can access messages collection (found ${testSnapshot.size} test messages)`);
    
    // Get all messages
    console.log('Fetching all messages...');
    const messagesSnapshot = await getDocs(messagesRef);
    console.log(`Found ${messagesSnapshot.size} messages to delete`);
    
    if (messagesSnapshot.empty) {
      console.log('No messages to delete');
      process.exit(0);
    }
    
    // Use batches (500 operations max per batch)
    const BATCH_SIZE = 250;
    const messageDocs = messagesSnapshot.docs;
    let totalDeleted = 0;
    let currentBatch = 0;
    
    // Process in batches
    for (let i = 0; i < messageDocs.length; i += BATCH_SIZE) {
      currentBatch++;
      const batch = writeBatch(db);
      const batchMessages = messageDocs.slice(i, i + BATCH_SIZE);
      
      console.log(`Processing batch ${currentBatch} with ${batchMessages.length} messages`);
      
      // Add operations to batch
      batchMessages.forEach(message => {
        batch.delete(doc(db, 'messages', message.id));
      });
      
      try {
        // Commit the batch
        console.log(`Committing batch ${currentBatch}...`);
        await batch.commit();
        console.log(`Batch ${currentBatch} committed successfully`);
        totalDeleted += batchMessages.length;
      } catch (batchError) {
        console.error(`Error with batch ${currentBatch}:`, batchError);
        
        // If batch fails, try individual deletion
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
        
        console.log(`Individual deletion: ${individualSuccesses}/${batchMessages.length} succeeded`);
        totalDeleted += individualSuccesses;
      }
    }
    
    console.log(`Cleanup complete: deleted ${totalDeleted}/${messagesSnapshot.size} messages`);
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanup(); 