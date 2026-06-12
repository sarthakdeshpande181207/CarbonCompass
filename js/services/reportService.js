import { calculateCarbonFootprint } from './carbonCalculator.js';
import { saveAssessment } from '../firebase/firestore.js';
import { checkAndUnlockBadges } from './badgeService.js';
import { initializeUserChallenges } from './challengeService.js';

/**
 * Computes, saves, and initializes onboarding achievements for a user's completed carbon assessment.
 * @param {string} uid - User ID
 * @param {Object} answers - Map of questionId -> selectedOptionIndex
 */
export const submitAssessmentResults = async (uid, answers) => {
  try {
    // 1. Calculate score & breakdown
    const report = calculateCarbonFootprint(answers);

    const assessmentDoc = {
      answers,
      planetHealthScore: report.planetHealthScore,
      carbonBreakdown: report.carbonBreakdown,
      scoreBreakdown: report.scoreBreakdown,
      strongestArea: report.strongestArea,
      weakestArea: report.weakestArea,
      persona: {
        id: report.persona.id,
        name: report.persona.name,
        emoji: report.persona.emoji,
        description: report.persona.description,
        recommendations: report.persona.recommendations
      }
    };

    // 2. Save result to Firestore
    await saveAssessment(uid, assessmentDoc);

    // 3. Initialize weekly eco challenges
    await initializeUserChallenges(uid);

    // 4. Evaluate and unlock badges (onboarding assessment badges)
    await checkAndUnlockBadges(uid, 'assessment', { score: report.planetHealthScore });

    return assessmentDoc;
  } catch (error) {
    console.error("ReportService: Error submitting assessment results:", error);
    throw error;
  }
};
