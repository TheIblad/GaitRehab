import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc
} from "firebase/firestore";
import { db } from "../firebase/config";

// Update fetchUserData to include more debugging
export async function fetchUserData(userId) {
  try {
    const userDoc = doc(db, "users", userId);
    const userSnapshot = await getDoc(userDoc);

    if (userSnapshot.exists()) {
      const userData = { id: userSnapshot.id, ...userSnapshot.data() };
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