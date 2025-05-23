import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { db } from "../firebase/config";

// Get user data with fallback display name
export async function fetchUserData(userId) {
  try {
    const userDoc = doc(db, "users", userId);
    const userSnapshot = await getDoc(userDoc);

    if (userSnapshot.exists()) {
      const data = userSnapshot.data();
      
      const userData = { 
        id: userSnapshot.id, 
        ...data,
        displayName: data.displayName || data.fullName || data.name || data.username || `User ${userId.substr(0, 4)}`
      };
      
      console.log("Fetched user data for ID", userId, ":", userData);
      return userData;
    } else {
      console.log("No user document found for ID:", userId);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user data for ID", userId, ":", error);
    return null;
  }
}

// Get user's activities
export async function fetchUserActivities(userId) {
  try {
    const activitiesQuery = query(
      collection(db, "activities"),
      where("uid", "==", userId)
    );
    const querySnapshot = await getDocs(activitiesQuery);

    const activities = [];
    querySnapshot.forEach((doc) => {
      activities.push({ id: doc.id, ...doc.data() });
    });

    return activities;
  } catch (error) {
    console.error("Error fetching activities:", error);
    return [];
  }
}

// Get user's achievements
export async function fetchUserAchievements(userId) {
  try {
    const achievementsQuery = query(
      collection(db, "achievements"),
      where("uid", "==", userId)
    );
    const querySnapshot = await getDocs(achievementsQuery);

    const achievements = [];
    querySnapshot.forEach((doc) => {
      achievements.push({ id: doc.id, ...doc.data() });
    });

    return achievements;
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return [];
  }
}

// Get all patients assigned to a therapist
export async function fetchTherapistPatients(therapistId) {
  try {
    const patientsQuery = query(
      collection(db, "users"),
      where("role", "==", "patient"),
      where("assignedTherapistId", "==", therapistId)
    );
    const querySnapshot = await getDocs(patientsQuery);

    const patients = [];
    querySnapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() });
    });

    return patients;
  } catch (error) {
    console.error("Error fetching therapist patients:", error);
    return [];
  }
}

// Get messages between two users
export async function fetchMessages(userId, partnerId) {
  try {
    const conversationId = [userId, partnerId].sort().join('_');
    
    const messagesQuery = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("timestamp", "asc")
    );
    
    const querySnapshot = await getDocs(messagesQuery);
    
    const messages = [];
    querySnapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Fetched ${messages.length} messages for conversation ${conversationId}`);
    return messages;
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
}

// Add a new activity
export async function addActivity(activityData) {
  try {
    if (!activityData.timestamp) {
      activityData.timestamp = serverTimestamp();
    }
    
    const docRef = await addDoc(collection(db, "activities"), activityData);
    console.log("Activity added with ID: ", docRef.id);
    return { id: docRef.id, ...activityData };
  } catch (error) {
    console.error("Error adding activity:", error);
    throw error;
  }
}

// Add a new achievement
export async function addAchievement(userId, achievementData) {
  try {
    const achievement = {
      uid: userId,
      earnedAt: serverTimestamp(),
      ...achievementData
    };
    
    const docRef = await addDoc(collection(db, "achievements"), achievement);
    console.log("Achievement added with ID: ", docRef.id);
    return { id: docRef.id, ...achievement };
  } catch (error) {
    console.error("Error adding achievement:", error);
    throw error;
  }
}

// Check if user has a specific achievement
export async function hasAchievement(userId, badgeName) {
  try {
    const achievementsQuery = query(
      collection(db, "achievements"),
      where("uid", "==", userId),
      where("badgeName", "==", badgeName)
    );
    
    const querySnapshot = await getDocs(achievementsQuery);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking achievement:", error);
    return false;
  }
}