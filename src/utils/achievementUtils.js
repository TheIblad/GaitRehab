import { addAchievement, hasAchievement, fetchUserActivities } from './firestoreQueries';

// Badges you can earn
export const ACHIEVEMENTS = {
  FIRST_ACTIVITY: {
    badgeName: "First Activity",
    badgeIcon: "🎯",
    description: "Complete your first activity"
  },
  SEVEN_DAY_STREAK: {
    badgeName: "7 Day Streak",
    badgeIcon: "🔥",
    description: "Complete activities for 7 consecutive days"
  },
  STEP_MASTER: {
    badgeName: "Step Master",
    badgeIcon: "👣",
    description: "Reach 10,000 steps in a single day"
  },
  DISTANCE_CHAMPION: {
    badgeName: "Distance Champion",
    badgeIcon: "🏆",
    description: "Walk a total of 10 kilometers"
  },
  SYMMETRY_EXPERT: {
    badgeName: "Symmetry Expert",
    badgeIcon: "⚖️",
    description: "Achieve 90% gait symmetry in a session"
  },
  CONSISTENCY_KING: {
    badgeName: "Consistency King",
    badgeIcon: "👑",
    description: "Complete 30 activities"
  },
  EARLY_BIRD: {
    badgeName: "Early Bird",
    badgeIcon: "🌅",
    description: "Complete an activity before 8 AM"
  },
  NIGHT_OWL: {
    badgeName: "Night Owl",
    badgeIcon: "🦉",
    description: "Complete an activity after 8 PM"
  }
};

// See if you earned any badges after doing an activity
export async function checkActivityAchievements(userId, activityData) {
  try {
    // Get all your activities to check for badges
    const activities = await fetchUserActivities(userId);
    
    const newAchievements = [];
    
    // First activity badge
    if (activities.length === 1) {
      const alreadyHas = await hasAchievement(userId, ACHIEVEMENTS.FIRST_ACTIVITY.badgeName);
      if (!alreadyHas) {
        const achievement = await addAchievement(userId, ACHIEVEMENTS.FIRST_ACTIVITY);
        newAchievements.push(achievement);
      }
    }
    
    // Step Master badge
    if (activityData.steps >= 10000) {
      const alreadyHas = await hasAchievement(userId, ACHIEVEMENTS.STEP_MASTER.badgeName);
      if (!alreadyHas) {
        const achievement = await addAchievement(userId, ACHIEVEMENTS.STEP_MASTER);
        newAchievements.push(achievement);
      }
    }
    
    // Symmetry Expert badge
    if (activityData.symmetry >= 90) {
      const alreadyHas = await hasAchievement(userId, ACHIEVEMENTS.SYMMETRY_EXPERT.badgeName);
      if (!alreadyHas) {
        const achievement = await addAchievement(userId, ACHIEVEMENTS.SYMMETRY_EXPERT);
        newAchievements.push(achievement);
      }
    }
    
    // Early Bird badge
    const activityHour = activityData.timestamp?.toDate?.() 
      ? activityData.timestamp.toDate().getHours() 
      : new Date().getHours();
    
    if (activityHour < 8) {
      const alreadyHas = await hasAchievement(userId, ACHIEVEMENTS.EARLY_BIRD.badgeName);
      if (!alreadyHas) {
        const achievement = await addAchievement(userId, ACHIEVEMENTS.EARLY_BIRD);
        newAchievements.push(achievement);
      }
    }
    
    // Night Owl badge
    if (activityHour >= 20) {
      const alreadyHas = await hasAchievement(userId, ACHIEVEMENTS.NIGHT_OWL.badgeName);
      if (!alreadyHas) {
        const achievement = await addAchievement(userId, ACHIEVEMENTS.NIGHT_OWL);
        newAchievements.push(achievement);
      }
    }
    
    // Consistency King badge (30 activities)
    if (activities.length === 30) {
      const alreadyHas = await hasAchievement(userId, ACHIEVEMENTS.CONSISTENCY_KING.badgeName);
      if (!alreadyHas) {
        const achievement = await addAchievement(userId, ACHIEVEMENTS.CONSISTENCY_KING);
        newAchievements.push(achievement);
      }
    }
    
    // Distance Champion badge
    const totalDistance = activities.reduce((sum, activity) => {
      return sum + (parseFloat(activity.distance) || 0);
    }, 0);
    
    if (totalDistance >= 10) {
      const alreadyHas = await hasAchievement(userId, ACHIEVEMENTS.DISTANCE_CHAMPION.badgeName);
      if (!alreadyHas) {
        const achievement = await addAchievement(userId, ACHIEVEMENTS.DISTANCE_CHAMPION);
        newAchievements.push(achievement);
      }
    }
    
    // Check for streak badge
    await checkStreakAchievement(userId, activities);
    
    return newAchievements;
  } catch (error) {
    console.error("Error checking badges:", error);
    return [];
  }
}

// See if you earned the streak badge
async function checkStreakAchievement(userId, activities) {
  try {
    // Already has the badge
    const alreadyHas = await hasAchievement(userId, ACHIEVEMENTS.SEVEN_DAY_STREAK.badgeName);
    if (alreadyHas) return null;
    
    // Need at least 7 activities to have a streak
    if (activities.length < 7) return null;
    
    // Put activities in order by date
    const sortedActivities = [...activities].sort((a, b) => {
      const dateA = a.timestamp?.toDate?.() ? a.timestamp.toDate() : new Date(a.timestamp);
      const dateB = b.timestamp?.toDate?.() ? b.timestamp.toDate() : new Date(b.timestamp);
      return dateB - dateA;
    });
    
    // Put activities in groups by day
    const activityDays = new Set();
    sortedActivities.forEach(activity => {
      const date = activity.timestamp?.toDate?.() 
        ? activity.timestamp.toDate() 
        : new Date(activity.timestamp);
      
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      activityDays.add(dayKey);
    });
    
    // Turn into a list and sort
    const dayArray = Array.from(activityDays).sort().reverse();
    
    // Look for 7 days in a row
    let currentStreak = 1;
    for (let i = 0; i < dayArray.length - 1; i++) {
      const [currentYear, currentMonth, currentDay] = dayArray[i].split('-').map(Number);
      const [nextYear, nextMonth, nextDay] = dayArray[i + 1].split('-').map(Number);
      
      // Make date objects to compare
      const currentDate = new Date(currentYear, currentMonth, currentDay);
      const nextDate = new Date(nextYear, nextMonth, nextDay);
      
      // Work out days between activities
      const diffTime = currentDate.getTime() - nextDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        if (currentStreak >= 7) {
          // Give the badge
          return await addAchievement(userId, ACHIEVEMENTS.SEVEN_DAY_STREAK);
        }
      } else {
        // Streak broken
        currentStreak = 1;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error checking streak badge:", error);
    return null;
  }
} 