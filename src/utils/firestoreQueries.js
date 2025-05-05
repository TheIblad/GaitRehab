import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy
} from "firebase/firestore";
import { db } from "../firebase/config";

// Update fetchUserData to include more debugging and handle name fields better
export async function fetchUserData(userId) {
  try {
    const userDoc = doc(db, "users", userId);
    const userSnapshot = await getDoc(userDoc);

    if (userSnapshot.exists()) {
      const data = userSnapshot.data();
      
      // Make sure we have a displayName - check various possible fields
      const userData = { 
        id: userSnapshot.id, 
        ...data,
        // Ensure displayName exists by checking various possible name fields
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

// Get user activities by userId
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

// Get user achievements by userId
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

// For therapists: Get all patients assigned to a therapist
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

// Fetch messages between two users
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