import { getBadges, earnBadge } from '../firebase/firestore.js';
import { BADGE_DEFS } from '../utils/constants.js';
import { showToast } from '../utils/helpers.js';

/**
 * Checks and awards badges based on user state changes.
 * Returns an array of newly unlocked badges.
 * @param {string} uid - User ID
 * @param {string} triggerType - 'assessment' | 'challenge_complete' | 'simulator_commit' | 'streak_update'
 * @param {Object} contextData - Context-specific metadata (e.g. score, completedChallengeCount, streakCount)
 */
export const checkAndUnlockBadges = async (uid, triggerType, contextData = {}) => {
  try {
    const earnedBadges = await getBadges(uid);
    const earnedBadgeIds = new Set(earnedBadges.map(b => b.badgeId));
    const newUnlocks = [];

    const triggerUnlock = async (badgeKey) => {
      const badgeDef = BADGE_DEFS[badgeKey];
      if (badgeDef && !earnedBadgeIds.has(badgeDef.id)) {
        const badgeData = {
          badgeId: badgeDef.id,
          name: badgeDef.name,
          description: badgeDef.description,
          icon: badgeDef.icon
        };
        await earnBadge(uid, badgeData);
        newUnlocks.push(badgeData);
        
        // Show celebratory toast
        showToast(`Unlocked Achievement: ${badgeDef.icon} ${badgeDef.name}!`, 'success');
      }
    };

    if (triggerType === 'assessment') {
      // 1. Assessment completion badge
      await triggerUnlock('FIRST_STEPS');
      
      // 2. High score / Eco Explorer badge
      if (contextData.score >= 80) {
        await triggerUnlock('ECO_EXPLORER_BADGE');
      }
    }

    if (triggerType === 'challenge_complete') {
      // 3. Completed first challenge
      await triggerUnlock('FIRST_CHALLENGE');
    }

    if (triggerType === 'streak_update') {
      // 4. Streak 3 badge
      if (contextData.streakCount >= 3) {
        await triggerUnlock('STREAK_3');
      }
    }

    if (triggerType === 'simulator_commit') {
      // 5. Simulator commitment badge
      await triggerUnlock('CARBON_SHREDDER');
    }

    return newUnlocks;
  } catch (error) {
    console.error("BadgeService: Error during badge evaluation:", error);
    return [];
  }
};
