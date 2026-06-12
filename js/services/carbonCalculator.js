import { ASSESSMENT_QUESTIONS, PERSONAS } from '../utils/constants.js';

// Mapping categories to user-friendly titles
export const CATEGORY_LABELS = {
  transport: 'Transport',
  diet: 'Diet',
  energy: 'Energy Usage',
  shopping: 'Shopping & Waste',
  travel: 'Flights & Travel'
};

// Maximum points per category in the assessment
export const MAX_CATEGORY_POINTS = {
  transport: 30, // 3 questions * 10
  diet: 30,      // 3 questions * 10
  energy: 30,    // 3 questions * 10
  shopping: 20,  // 2 questions * 10
  travel: 20     // 2 questions * 10
};

/**
 * Calculates Planet Health Score, category carbon breakdown, and why-my-score deductions.
 * @param {Object} answers - Map of questionId -> selectedOptionIndex
 */
export const calculateCarbonFootprint = (answers) => {
  let totalPointsEarned = 0;
  const maxTotalPoints = 130;
  
  const categoryPointsEarned = {
    transport: 0,
    diet: 0,
    energy: 0,
    shopping: 0,
    travel: 0
  };

  const carbonBreakdown = {
    transport: 0,
    diet: 0,
    energy: 0,
    shopping: 0,
    travel: 0
  };

  // Process each question
  ASSESSMENT_QUESTIONS.forEach(question => {
    const selectedIdx = answers[question.id];
    
    // Default to the highest footprint option if no answer provided
    let points = 0;
    let co2 = 0;
    
    if (selectedIdx !== undefined && selectedIdx !== null) {
      const option = question.options[selectedIdx];
      if (option) {
        points = option.points;
        co2 = option.co2;
      }
    } else {
      // Fallback: pick the last option (highest footprint)
      const lastOption = question.options[question.options.length - 1];
      points = lastOption.points;
      co2 = lastOption.co2;
    }

    categoryPointsEarned[question.category] += points;
    totalPointsEarned += points;
    carbonBreakdown[question.category] += co2;
  });

  // Calculate composite Planet Health Score (0-100)
  const planetHealthScore = Math.max(0, Math.min(100, Math.round((totalPointsEarned / maxTotalPoints) * 100)));

  // Calculate "Why My Score" point deductions
  const scoreBreakdown = {};
  const categoryPercentages = {};

  Object.keys(MAX_CATEGORY_POINTS).forEach(cat => {
    const maxVal = MAX_CATEGORY_POINTS[cat];
    const earnedVal = categoryPointsEarned[cat];
    const deduction = earnedVal - maxVal; // negative or 0
    scoreBreakdown[cat] = deduction;
    
    categoryPercentages[cat] = earnedVal / maxVal;
  });

  // Determine strongest and weakest areas based on percentages
  let strongestArea = 'energy';
  let weakestArea = 'transport';
  let maxPct = -1;
  let minPct = 2;

  Object.keys(categoryPercentages).forEach(cat => {
    const pct = categoryPercentages[cat];
    if (pct > maxPct) {
      maxPct = pct;
      strongestArea = cat;
    }
    if (pct < minPct) {
      minPct = pct;
      weakestArea = cat;
    }
  });

  // Assign Persona based on Planet Health Score
  let assignedPersonaKey = 'CARBON_HEAVYWEIGHT';
  if (planetHealthScore >= PERSONAS.ECO_EXPLORER.range[0]) {
    assignedPersonaKey = 'ECO_EXPLORER';
  } else if (planetHealthScore >= PERSONAS.CONSCIOUS_COMMUTER.range[0]) {
    assignedPersonaKey = 'CONSCIOUS_COMMUTER';
  } else if (planetHealthScore >= PERSONAS.ENERGY_DRIFTER.range[0]) {
    assignedPersonaKey = 'ENERGY_DRIFTER';
  }

  const persona = PERSONAS[assignedPersonaKey];

  return {
    planetHealthScore,
    carbonBreakdown,    // CO2 footprint values (sums)
    scoreBreakdown,     // points deductions (e.g. -12 points)
    strongestArea: CATEGORY_LABELS[strongestArea],
    weakestArea: CATEGORY_LABELS[weakestArea],
    persona
  };
};
