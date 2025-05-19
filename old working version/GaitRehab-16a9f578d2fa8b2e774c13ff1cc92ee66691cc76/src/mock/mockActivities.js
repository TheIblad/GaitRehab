function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const activityTypes = [
  'Walking',
  'Exercise Routine',
  'Physiotherapy Session',
  'Gait Training',
  'Balance Exercise'
];

const locations = [
  'Local Park',
  'Gym',
  'Clinic',
  'Home',
  'Rehab Center'
];

const notesArr = [
  'Felt good',
  'Challenging session',
  'Improved balance',
  'Focus on ankle mobility',
  'Worked on endurance',
  'Practiced new exercises',
  ''
];

export const mockActivities = [];

for (let i = 0; i < 30; i++) {
  const date = new Date();
  date.setDate(date.getDate() - i);

  // 1-2 activities per day
  const activitiesToday = randomBetween(1, 2);

  for (let j = 0; j < activitiesToday; j++) {
    const type = activityTypes[randomBetween(0, activityTypes.length - 1)];
    const steps = type === 'Walking' || type === 'Gait Training'
      ? randomBetween(2000, 12000)
      : type === 'Exercise Routine'
        ? randomBetween(1000, 4000)
        : 0;
    const symmetry = randomBetween(75, 95);
    const distance = steps > 0 ? (steps / 1400).toFixed(1) : '0';
    const duration = randomBetween(20, 60);
    const location = locations[randomBetween(0, locations.length - 1)];
    const notes = notesArr[randomBetween(0, notesArr.length - 1)];

    mockActivities.push({
      id: `${i}-${j}`,
      type,
      steps,
      symmetry,
      distance,
      duration,
      location,
      notes,
      timestamp: { toDate: () => new Date(date) }
    });
  }
}

// Sort by date ascending
mockActivities.sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());