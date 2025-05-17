export const mockPatients = [
  {
    id: 'pat001',
    displayName: 'John Smith',
    email: 'john.smith@example.com',
    condition: 'Post-stroke rehabilitation',
    progress: '75% complete',
    progressPercent: 75,
    lastActive: '2 hours ago',
    phone: '555-123-4567',
    notes: 'Making consistent progress. Focus on right-side mobility.',
    stats: {
      symmetry: 78,
      averageSteps: 6240,
      weeklyProgress: 12,
      complianceRate: 85
    },
    activities: [
      {
        id: 'act001',
        type: 'Walking',
        date: 'Today, 9:30 AM',
        duration: 30,
        steps: 3500,
        symmetry: 78,
        notes: 'Felt stronger than yesterday'
      },
      {
        id: 'act002',
        type: 'Physical Therapy',
        date: 'Yesterday, 2:00 PM',
        duration: 45,
        symmetry: 72,
        notes: 'Worked on stair climbing'
      }
    ]
  },
  {
    id: 'pat002',
    displayName: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    condition: 'Hip replacement',
    progress: '40% complete',
    progressPercent: 40,
    lastActive: 'Yesterday',
    phone: '555-987-6543',
    notes: 'Some pain during lateral movements. Needs encouragement with exercises.',
    stats: {
      symmetry: 65,
      averageSteps: 3100,
      weeklyProgress: 5,
      complianceRate: 70
    },
    activities: [
      {
        id: 'act003',
        type: 'Walking',
        date: 'Yesterday, 10:15 AM',
        duration: 15,
        steps: 1200,
        symmetry: 64,
        notes: 'Still experiencing discomfort'
      }
    ]
  },
  {
    id: 'pat003',
    displayName: 'Michael Brown',
    email: 'michael.b@example.com',
    condition: 'ACL reconstruction',
    progress: '85% complete',
    progressPercent: 85,
    lastActive: '3 days ago',
    phone: '555-345-6789',
    notes: 'Ready to begin sport-specific exercises. Very motivated.',
    stats: {
      symmetry: 88,
      averageSteps: 8500,
      weeklyProgress: 15,
      complianceRate: 95
    },
    activities: [
      {
        id: 'act004',
        type: 'Exercise Routine',
        date: '3 days ago, 4:30 PM',
        duration: 60,
        steps: 6000,
        symmetry: 88,
        notes: 'Completed full routine without pain'
      }
    ]
  },
  {
    id: 'pat004',
    displayName: 'Emma Wilson',
    email: 'emma.w@example.com',
    condition: 'Parkinson\'s',
    progress: '30% complete',
    progressPercent: 30,
    lastActive: 'Today',
    phone: '555-234-5678',
    notes: 'Freezing episodes decreased. Working on balance and coordination.',
    stats: {
      symmetry: 60,
      averageSteps: 2800,
      weeklyProgress: 3,
      complianceRate: 80
    },
    activities: [
      {
        id: 'act005',
        type: 'Balance Exercise',
        date: 'Today, 11:00 AM',
        duration: 25,
        symmetry: 62,
        notes: 'Better stability today'
      }
    ]
  },
  {
    id: 'pat005',
    displayName: 'Robert Davis',
    email: 'robert.d@example.com',
    condition: 'Multiple sclerosis',
    progress: '55% complete',
    progressPercent: 55,
    lastActive: '1 week ago',
    phone: '555-876-5432',
    notes: 'Needs additional motivation. Complains of fatigue.',
    stats: {
      symmetry: 71,
      averageSteps: 4200,
      weeklyProgress: -2,
      complianceRate: 60
    },
    activities: []
  }
];

export const mockAchievements = [
  {
    id: 'ach001',
    patientName: 'John Smith',
    patientId: 'pat001',
    badgeName: 'Consistency Champion',
    badgeIcon: '🏆',
    earnedAt: new Date(new Date().setDate(new Date().getDate() - 2)),
    description: 'Completed exercises 7 days in a row'
  },
  {
    id: 'ach002',
    patientName: 'Emma Wilson',
    patientId: 'pat004',
    badgeName: 'Symmetry Improver',
    badgeIcon: '⚖️',
    earnedAt: new Date(new Date().setDate(new Date().getDate() - 3)),
    description: 'Improved gait symmetry by 10% in one week'
  },
  {
    id: 'ach003',
    patientName: 'Michael Brown',
    patientId: 'pat003',
    badgeName: 'Distance Master',
    badgeIcon: '🏃',
    earnedAt: new Date(new Date().setDate(new Date().getDate() - 5)),
    description: 'Walked 10,000 steps in a single day'
  },
  {
    id: 'ach004',
    patientName: 'John Smith',
    patientId: 'pat001',
    badgeName: 'Exercise Expert',
    badgeIcon: '💪',
    earnedAt: new Date(new Date().setDate(new Date().getDate() - 7)),
    description: 'Completed all prescribed exercises for 2 weeks'
  }
];

export const mockTodos = [
  {
    id: 'todo001',
    description: 'Review John Smith\'s progress report',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 1)),
    completed: false,
    patientId: 'pat001'
  },
  {
    id: 'todo002',
    description: 'Adjust Sarah Johnson\'s exercise plan',
    dueDate: new Date(new Date().setDate(new Date().getDate())),
    completed: false,
    patientId: 'pat002'
  },
  {
    id: 'todo003',
    description: 'Call Robert Davis to check in',
    dueDate: new Date(new Date().setDate(new Date().getDate() - 1)),
    completed: false,
    patientId: 'pat005'
  },
  {
    id: 'todo004',
    description: 'Prepare new balance exercises for Emma',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 2)),
    completed: false,
    patientId: 'pat004'
  },
  {
    id: 'todo005',
    description: 'Update Michael\'s treatment plan',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 3)),
    completed: false,
    patientId: 'pat003'
  }
];