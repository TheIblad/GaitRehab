import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, getDoc, limit, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Get your info
export async function fetchUserData(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() };
    } else {
      console.log("No user data found for ID:", userId);
      return null;
    }
  } catch (error) {
    console.error("Error getting user info:", error);
    return null;
  }
}

// Get all your activities
export async function fetchUserActivities(userId) {
  try {
    const activitiesQuery = query(
      collection(db, "activities"),
      where("uid", "==", userId),
      orderBy("timestamp", "desc")
    );
    
    const querySnapshot = await getDocs(activitiesQuery);
    
    const activities = [];
    querySnapshot.forEach((doc) => {
      activities.push({ id: doc.id, ...doc.data() });
    });
    
    return activities;
  } catch (error) {
    console.error("Error getting activities:", error);
    return [];
  }
}

// Get all patients for a therapist
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
    console.error("Error getting patients:", error);
    return [];
  }
}

// See if you have a badge
export async function hasAchievement(userId, achievementId) {
  try {
    const achievementsQuery = query(
      collection(db, "achievements"),
      where("userId", "==", userId),
      where("achievementId", "==", achievementId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(achievementsQuery);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking badge:", error);
    return false;
  }
}

// Give you a badge
export async function addAchievement(userId, achievementData) {
  try {
    // Add user ID to badge info
    const achievementWithUser = {
      ...achievementData,
      userId,
      earnedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "achievements"), achievementWithUser);
    
    // Update user's badge count
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const currentCount = userData.achievementCount || 0;
      
      await updateDoc(userRef, {
        achievementCount: currentCount + 1,
        lastAchievement: serverTimestamp()
      });
    }
    
    return docRef.id;
  } catch (error) {
    console.error("Error giving badge:", error);
    return null;
  }
}

// Get all your badges
export async function fetchUserAchievements(userId, limitCount = 10) {
  try {
    const achievementsQuery = query(
      collection(db, "achievements"),
      where("userId", "==", userId),
      orderBy("earnedAt", "desc"),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(achievementsQuery);
    
    const achievements = [];
    querySnapshot.forEach((doc) => {
      achievements.push({ id: doc.id, ...doc.data() });
    });
    
    return achievements;
  } catch (error) {
    console.error("Error getting badges:", error);
    return [];
  }
}

// Get your tasks
export async function fetchPatientTasks(patientId) {
  try {
    const tasksQuery = query(
      collection(db, "tasks"),
      where("patientId", "==", patientId),
      orderBy("dueDate", "asc")
    );
    
    const querySnapshot = await getDocs(tasksQuery);
    
    const tasks = [];
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Got ${tasks.length} tasks for patient ${patientId}`);
    return tasks;
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
}

// Get tasks made by a therapist
export async function fetchTherapistTasks(therapistId) {
  try {
    const tasksQuery = query(
      collection(db, "tasks"),
      where("therapistId", "==", therapistId),
      orderBy("dueDate", "asc")
    );
    
    const querySnapshot = await getDocs(tasksQuery);
    
    const tasks = [];
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Got ${tasks.length} tasks from therapist ${therapistId}`);
    return tasks;
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
}

// Mark a task as done
export async function completeTask(taskId, completionData = {}) {
  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      completed: true,
      completedAt: serverTimestamp(),
      completionNotes: completionData.notes || '',
      ...completionData
    });
    
    return true;
  } catch (error) {
    console.error("Error marking task done:", error);
    throw error;
  }
}

// Update your progress points
export async function updateUserProgress(userId, points) {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.error("User not found");
      return false;
    }
    
    const userData = userSnap.data();
    const currentProgress = userData.progressPoints || 0;
    const newProgress = currentProgress + points;
    
    await updateDoc(userRef, {
      progressPoints: newProgress,
      lastProgressUpdate: serverTimestamp()
    });
    
    // Create a progress history entry
    await addDoc(collection(db, "progressHistory"), {
      userId,
      points,
      reason: "Task Completion",
      timestamp: serverTimestamp(),
      previousTotal: currentProgress,
      newTotal: newProgress
    });
    
    return true;
  } catch (error) {
    console.error("Error updating user progress:", error);
    return false;
  }
}