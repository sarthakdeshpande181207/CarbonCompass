// Carbon Compass App-Wide Constants

export const ASSESSMENT_QUESTIONS = [
  // --- TRANSPORTATION (3 Questions) ---
  {
    id: 't1',
    category: 'transport',
    text: 'What is your primary mode of daily transportation?',
    options: [
      { text: 'Walking, cycling, or micro-mobility', co2: 0, points: 10 },
      { text: 'Public transit (bus, train, subway)', co2: 0.5, points: 8 },
      { text: 'Electric vehicle (EV)', co2: 0.8, points: 7 },
      { text: 'Hybrid vehicle', co2: 1.5, points: 5 },
      { text: 'Gasoline/diesel car (alone)', co2: 3.2, points: 1 }
    ]
  },
  {
    id: 't2',
    category: 'transport',
    text: 'How many miles do you drive or travel in a personal vehicle per week?',
    options: [
      { text: '0 miles (I do not drive/ride in cars)', co2: 0, points: 10 },
      { text: 'Under 50 miles', co2: 0.3, points: 8 },
      { text: '50 - 150 miles', co2: 1.2, points: 6 },
      { text: '150 - 300 miles', co2: 2.5, points: 3 },
      { text: 'Over 300 miles', co2: 4.8, points: 0 }
    ]
  },
  {
    id: 't3',
    category: 'transport',
    text: 'How often do you carpool or share rides when traveling by car?',
    options: [
      { text: 'Always or almost always', co2: 0.2, points: 10 },
      { text: 'Frequently', co2: 0.6, points: 8 },
      { text: 'Sometimes', co2: 1.2, points: 5 },
      { text: 'Rarely or Never', co2: 2.0, points: 1 }
    ]
  },

  // --- DIET & FOOD (3 Questions) ---
  {
    id: 'd1',
    category: 'diet',
    text: 'Which best describes your typical daily diet?',
    options: [
      { text: 'Fully Vegan', co2: 0.9, points: 10 },
      { text: 'Vegetarian or Pescatarian', co2: 1.4, points: 8 },
      { text: 'Low-meat / Flexitarian (Meat a few times a week)', co2: 2.1, points: 6 },
      { text: 'Average meat consumer (Red meat occasionally)', co2: 3.3, points: 3 },
      { text: 'Heavy meat consumer (Red meat almost daily)', co2: 5.0, points: 0 }
    ]
  },
  {
    id: 'd2',
    category: 'diet',
    text: 'How often does your household throw away spoiled or uneaten food?',
    options: [
      { text: 'Never / Zero waste (compost everything)', co2: 0.1, points: 10 },
      { text: 'Rarely (less than once a week)', co2: 0.4, points: 8 },
      { text: 'Occasionally (1-2 times a week)', co2: 1.0, points: 5 },
      { text: 'Frequently (regular food waste)', co2: 2.2, points: 1 }
    ]
  },
  {
    id: 'd3',
    category: 'diet',
    text: 'How often do you prioritize locally grown, organic, or seasonal food items?',
    options: [
      { text: 'Always / Grow my own', co2: 0.2, points: 10 },
      { text: 'Mostly', co2: 0.6, points: 8 },
      { text: 'Sometimes', co2: 1.2, points: 5 },
      { text: 'Rarely / Never check sourcing', co2: 1.8, points: 2 }
    ]
  },

  // --- HOME ENERGY (3 Questions) ---
  {
    id: 'e1',
    category: 'energy',
    text: 'What is the primary heating and cooling source in your home?',
    options: [
      { text: 'Geothermal or High-Efficiency Heat Pump', co2: 0.5, points: 10 },
      { text: 'Electric baseboard/heaters', co2: 1.8, points: 6 },
      { text: 'Natural Gas furnace', co2: 2.2, points: 5 },
      { text: 'Heating Oil or Propane', co2: 3.8, points: 2 },
      { text: 'Wood / Coal / Biomass', co2: 4.5, points: 1 }
    ]
  },
  {
    id: 'e2',
    category: 'energy',
    text: 'Does your household use renewable energy sources (solar panels, green energy plan)?',
    options: [
      { text: 'Yes, 100% renewable plan or rooftop solar', co2: 0, points: 10 },
      { text: 'Partial renewal coverage (approx. 50%)', co2: 1.0, points: 7 },
      { text: 'No, standard utility grid mix', co2: 2.5, points: 3 },
      { text: 'Unsure, standard utility grid', co2: 2.5, points: 3 }
    ]
  },
  {
    id: 'e3',
    category: 'energy',
    text: 'How mindful are you of energy efficiency habits (LED bulbs, unplugging idle devices, smart thermostats)?',
    options: [
      { text: 'Extremely active (smart home settings, zero idle energy)', co2: 0.2, points: 10 },
      { text: 'Moderately active (LEDs, turn off lights)', co2: 0.8, points: 7 },
      { text: 'Average (only turn off when leaving for days)', co2: 1.5, points: 4 },
      { text: 'Not mindful at all', co2: 2.5, points: 1 }
    ]
  },

  // --- SHOPPING & CONSUMPTION (2 Questions) ---
  {
    id: 's1',
    category: 'shopping',
    text: 'How frequently do you buy brand-new clothing, electronics, or home goods?',
    options: [
      { text: 'Rarely (I buy second-hand or only when absolute necessity)', co2: 0.4, points: 10 },
      { text: 'Occasionally (a few times a year)', co2: 1.2, points: 8 },
      { text: 'Monthly (regular updates, high quality)', co2: 2.5, points: 5 },
      { text: 'Weekly (frequent online shopping, fast fashion)', co2: 5.2, points: 1 }
    ]
  },
  {
    id: 's2',
    category: 'shopping',
    text: 'Which best describes your recycling and composting habits?',
    options: [
      { text: 'Complete waste diversion (recycle, compost, minimize single-use)', co2: 0.1, points: 10 },
      { text: 'Standard recycling (recycle plastic/paper, no composting)', co2: 0.8, points: 7 },
      { text: 'Inconsistent recycling', co2: 1.6, points: 4 },
      { text: 'Send everything to landfill', co2: 2.8, points: 0 }
    ]
  },

  // --- TRAVEL & FLIGHTS (2 Questions) ---
  {
    id: 'v1',
    category: 'travel',
    text: 'How many round-trip flights (short-haul under 3 hours) do you take per year?',
    options: [
      { text: '0 flights', co2: 0, points: 10 },
      { text: '1 - 2 flights', co2: 0.6, points: 8 },
      { text: '3 - 5 flights', co2: 1.8, points: 5 },
      { text: '6 or more flights', co2: 3.5, points: 1 }
    ]
  },
  {
    id: 'v2',
    category: 'travel',
    text: 'How many long-haul round-trip flights (over 3 hours) do you take per year?',
    options: [
      { text: '0 flights', co2: 0, points: 10 },
      { text: '1 flight', co2: 1.5, points: 7 },
      { text: '2 - 3 flights', co2: 4.2, points: 3 },
      { text: '4 or more flights', co2: 8.5, points: 0 }
    ]
  }
];

// Carbon Mirror Persona Archetypes
export const PERSONAS = {
  ECO_EXPLORER: {
    id: 'ECO_EXPLORER',
    name: 'Eco Explorer',
    emoji: '🌱',
    range: [80, 100],
    description: 'You tread lightly on the Earth! Your carbon footprint is remarkably low. You make conscious, sustainable choices across transportation, diet, and daily consumption.',
    recommendations: [
      'Share your lifestyle habits with your local community to inspire collective action.',
      'Explore investing in ethical green funds and community solar projects.',
      'Support carbon removal initiatives and advocate for local structural changes.'
    ]
  },
  CONSCIOUS_COMMUTER: {
    id: 'CONSCIOUS_COMMUTER',
    name: 'Conscious Commuter',
    emoji: '🌍',
    range: [60, 79],
    description: 'You are doing great! You take active, mindful steps to reduce your environmental impact. There are still a few moderate optimization spots to lower your score further.',
    recommendations: [
      'Audit your home for phantom power load (idle electronics) or add smart power strips.',
      'Implement meat-free days (like Meatless Mondays) to lower food-related emissions.',
      'Opt for walking, biking, or public transit for short trips instead of driving.'
    ]
  },
  ENERGY_DRIFTER: {
    id: 'ENERGY_DRIFTER',
    name: 'Energy Drifter',
    emoji: '⚡',
    range: [40, 59],
    description: 'Your carbon footprint is above average. Modern conveniences and routines may be driving up your personal vehicle usage, meat consumption, or home energy waste.',
    recommendations: [
      'Switch your home energy to a 100% renewable plan or look into community solar.',
      'Reduce single-use plastic purchases and research clothing rental/thrift options.',
      'Wash your laundry in cold water and air-dry items when possible.'
    ]
  },
  CARBON_HEAVYWEIGHT: {
    id: 'CARBON_HEAVYWEIGHT',
    name: 'Carbon Heavyweight',
    emoji: '🚗',
    range: [0, 39],
    description: 'You have a substantial environmental footprint. High flight volume, frequent solo driving, and intensive energy consumption contribute to a high score deficit.',
    recommendations: [
      'Transition away from solo driving by carpooling, using transit, or walking once a week.',
      'Begin swapping one red-meat meal a day for a plant-based alternative.',
      'Install a smart programmable thermostat to manage home heating and cooling efficiently.'
    ]
  }
};

// Default Curated Weekly Challenges
export const DEFAULT_CHALLENGES = [
  {
    id: 'challenge_carpool',
    category: 'transport',
    title: 'Transit Day',
    description: 'Swap your personal car commute for walking, cycling, or public transit for at least one full day.',
    co2Saving: 8.5, // estimated kg CO2 saved
    difficulty: 'Medium',
    durationDays: 1,
    xp: 100,
    progress: 0
  },
  {
    id: 'challenge_veggie',
    category: 'diet',
    title: 'Plant-Powered Weekend',
    description: 'Eat 100% plant-based (vegan) meals for an entire Saturday and Sunday.',
    co2Saving: 7.2,
    difficulty: 'Medium',
    durationDays: 2,
    xp: 100,
    progress: 0
  },
  {
    id: 'challenge_unplug',
    category: 'energy',
    title: 'Phantom Power Sweep',
    description: 'Identify and unplug 5 idle electronics (chargers, appliances) when not in active use.',
    co2Saving: 2.1,
    difficulty: 'Easy',
    durationDays: 1,
    xp: 50,
    progress: 0
  },
  {
    id: 'challenge_thrift',
    category: 'shopping',
    title: 'Second-Hand First',
    description: 'Buy absolutely nothing new this week (except food/medicine). Rent, swap, or buy thrift if needed.',
    co2Saving: 12.0,
    difficulty: 'Hard',
    durationDays: 7,
    xp: 200,
    progress: 0
  },
  {
    id: 'challenge_thermostat',
    category: 'energy',
    title: 'Thermostat Adjustment',
    description: 'Set your thermostat 2°C (3.6°F) cooler in winter or warmer in summer for 5 consecutive days.',
    co2Saving: 5.5,
    difficulty: 'Easy',
    durationDays: 5,
    xp: 50,
    progress: 0
  },
  {
    id: 'challenge_compost',
    category: 'shopping',
    title: 'Compost Advocate',
    description: 'Divert 100% of your organic waste to composting for 7 consecutive days.',
    co2Saving: 4.5,
    difficulty: 'Medium',
    durationDays: 7,
    xp: 100,
    progress: 0
  },
  {
    id: 'challenge_local_shop',
    category: 'community',
    title: 'Local Sourcing',
    description: 'Buy all groceries from local farmers markets or zero-waste stores this week.',
    co2Saving: 6.0,
    difficulty: 'Medium',
    durationDays: 7,
    xp: 100,
    progress: 0
  },
  {
    id: 'challenge_community_cleanup',
    category: 'community',
    title: 'Green Neighborhood',
    description: 'Spend 2 hours participating in or organizing a local trash cleanup or park maintenance.',
    co2Saving: 5.0,
    difficulty: 'Hard',
    durationDays: 1,
    xp: 200,
    progress: 0
  }
];

// Badge Metadata
export const BADGE_DEFS = {
  FIRST_STEPS: {
    id: 'FIRST_STEPS',
    name: 'First Steps',
    description: 'Completed your first carbon assessment',
    icon: '🧭',
    rarity: 'Common',
    requirementText: 'Complete your onboarding carbon footprint assessment'
  },
  ECO_EXPLORER_BADGE: {
    id: 'ECO_EXPLORER_BADGE',
    name: 'Eco Explorer',
    description: 'Assigned the Eco Explorer persona (Score >= 80)',
    icon: '🌱',
    rarity: 'Epic',
    requirementText: 'Achieve a Planet Health Score of 80 or above'
  },
  FIRST_CHALLENGE: {
    id: 'FIRST_CHALLENGE',
    name: 'Challenger',
    description: 'Completed your first weekly eco challenge',
    icon: '🏆',
    rarity: 'Common',
    requirementText: 'Log and complete 1 weekly eco-challenge'
  },
  STREAK_3: {
    id: 'STREAK_3',
    name: 'Habit Builder',
    description: 'Maintained a 3-day active habit streak',
    icon: '🔥',
    rarity: 'Rare',
    requirementText: 'Log eco-habits for 3 consecutive days'
  },
  CARBON_SHREDDER: {
    id: 'CARBON_SHREDDER',
    name: 'Carbon Saver',
    description: 'Committed to a reduction change in the Impact Simulator',
    icon: '⚡',
    rarity: 'Legendary',
    requirementText: 'Commit to a carbon reduction pledge in the Impact Simulator'
  }
};
