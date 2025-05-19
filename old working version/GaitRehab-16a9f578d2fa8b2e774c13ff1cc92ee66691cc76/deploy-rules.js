const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const fs = require('fs');
const https = require('https');

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

// Read rules file
const rulesContent = fs.readFileSync('./firebase.rules', 'utf8');

// Function to deploy rules
async function deployRules() {
  try {
    // Get admin credentials from environment variables or prompt
    const email = process.env.FIREBASE_EMAIL || process.argv[2];
    const password = process.env.FIREBASE_PASSWORD || process.argv[3];
    
    if (!email || !password) {
      console.error('Please provide admin email and password as arguments:');
      console.error('node deploy-rules.js <email> <password>');
      process.exit(1);
    }
    
    // Sign in with admin credentials
    console.log('Signing in...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    
    // Deploy the rules
    console.log('Deploying Firestore rules...');
    
    // Create the request to Firebase API
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${firebaseConfig.projectId}/databases/(default)/firebaseRules`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      }
    };
    
    // Make the request
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('Rules deployed successfully!');
        } else {
          console.error(`Failed to deploy rules: ${res.statusCode}`);
          console.error(data);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error(`Request error: ${e.message}`);
    });
    
    // Send the rules content
    const requestBody = {
      rules: {
        files: [
          {
            content: rulesContent
          }
        ]
      }
    };
    
    req.write(JSON.stringify(requestBody));
    req.end();
    
  } catch (error) {
    console.error('Error deploying rules:', error);
  }
}

// Run the deployment
deployRules(); 