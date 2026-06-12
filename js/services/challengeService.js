import { getChallenges, saveChallenge, getStreaks, updateStreaks, getUserProfile, updateUserProfile } from '../firebase/firestore.js';
import { DEFAULT_CHALLENGES } from '../utils/constants.js';
import { checkAndUnlockBadges } from './badgeService.js';

/**
 * Initializes default weekly challenges for a user if they do not have any.
 */
export const initializeUserChallenges = async (uid) => {
  try {
    const existing = await getChallenges(uid);
    if (existing.length === 0) {
      // Load all default challenges into user's DB as available
      for (const challenge of DEFAULT_CHALLENGES) {
        await saveChallenge(uid, {
          challengeId: challenge.id,
          title: challenge.title,
          description: challenge.description,
          co2Saving: challenge.co2Saving,
          difficulty: challenge.difficulty,
          category: challenge.category,
          status: 'available', // available, active, completed
          startedAt: null,
          completedAt: null,
          durationDays: challenge.durationDays,
          xp: challenge.xp,
          progress: 0
        });
      }
    }
  } catch (error) {
    console.error("ChallengeService: Error initializing challenges:", error);
  }
};

/**
 * Sets a challenge to active status and deactivates any other active challenge.
 */
export const activateChallenge = async (uid, challengeId) => {
  try {
    const list = await getChallenges(uid);
    
    // Deactivate any currently active challenge
    for (const c of list) {
      if (c.status === 'active' && c.id !== challengeId && c.challengeId !== challengeId) {
        await saveChallenge(uid, {
          ...c,
          status: 'available',
          startedAt: null
        });
      }
    }

    const target = list.find(c => c.id === challengeId || c.challengeId === challengeId);
    if (!target) throw new Error('Challenge not found');

    const updated = {
      ...target,
      status: 'active',
      startedAt: new Date().toISOString(),
      progress: target.progress || 0
    };
    await saveChallenge(uid, updated);
    return updated;
  } catch (error) {
    console.error("ChallengeService: Error activating challenge:", error);
    throw error;
  }
};

/**
 * Logs progress for a challenge. Increments progress by 1.
 * If progress reaches durationDays, triggers completion.
 */
export const logChallengeProgress = async (uid, challengeId) => {
  try {
    const list = await getChallenges(uid);
    const target = list.find(c => c.id === challengeId || c.challengeId === challengeId);
    if (!target) throw new Error('Challenge not found');
    if (target.status !== 'active') throw new Error('Challenge is not active');

    const currentProgress = (target.progress || 0) + 1;
    const duration = target.durationDays || 1;

    if (currentProgress >= duration) {
      // Complete the challenge
      return await completeChallenge(uid, challengeId);
    } else {
      // Save incremented progress
      const updated = {
        ...target,
        progress: currentProgress
      };
      await saveChallenge(uid, updated);
      return { challenge: updated, completed: false };
    }
  } catch (error) {
    console.error("ChallengeService: Error logging challenge progress:", error);
    throw error;
  }
};

/**
 * Completes an active challenge, updates user streak metrics, and awards XP / statistics.
 */
export const completeChallenge = async (uid, challengeId) => {
  try {
    const list = await getChallenges(uid);
    const target = list.find(c => c.id === challengeId || c.challengeId === challengeId);
    if (!target) throw new Error('Challenge not found');

    const duration = target.durationDays || 1;
    const updated = {
      ...target,
      status: 'completed',
      progress: duration,
      completedAt: new Date().toISOString()
    };
    await saveChallenge(uid, updated);

    // 1. Update user profile statistics (XP, completed count, CO2 savings)
    let totalXpEarned = target.xp || 50;
    let totalCo2SavedVal = target.co2Saving || 0;
    try {
      const profile = await getUserProfile(uid) || {};
      const currentXp = profile.xp || 0;
      const currentTotalXp = profile.totalXpEarned || currentXp;
      const currentTotalCo2 = profile.totalCo2Saved || 0;
      const currentCompletedCount = profile.totalChallengesCompleted || 0;

      await updateUserProfile(uid, {
        xp: currentXp + totalXpEarned,
        totalXpEarned: currentTotalXp + totalXpEarned,
        totalCo2Saved: currentTotalCo2 + totalCo2SavedVal,
        totalChallengesCompleted: currentCompletedCount + 1
      });
    } catch (profileError) {
      console.error("ChallengeService: Error updating user profile metrics:", profileError);
    }

    // 2. Update login / activity streaks
    const streaks = await getStreaks(uid);
    const today = new Date().toDateString();
    
    let currentStreak = streaks.current;
    let longestStreak = streaks.longest;
    const lastActivityDate = streaks.lastActivityDate;

    if (!lastActivityDate) {
      currentStreak = 1;
    } else {
      const last = new Date(lastActivityDate);
      const diffTime = Math.abs(new Date(today) - new Date(last.toDateString()));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak += 1;
      } else if (diffDays > 1) {
        currentStreak = 1; // broken streak
      }
      // if diffDays === 0, streak remains same (already completed something today)
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    const updatedStreaks = {
      current: currentStreak,
      longest: longestStreak,
      lastActivityDate: new Date().toISOString()
    };
    await updateStreaks(uid, updatedStreaks);

    // 3. Check badges
    const newUnlocks = [];
    const chalBadges = await checkAndUnlockBadges(uid, 'challenge_complete');
    if (chalBadges) newUnlocks.push(...chalBadges);
    
    const streakBadges = await checkAndUnlockBadges(uid, 'streak_update', { streakCount: currentStreak });
    if (streakBadges) newUnlocks.push(...streakBadges);

    return { 
      challenge: updated, 
      completed: true, 
      streaks: updatedStreaks,
      xpEarned: totalXpEarned,
      newUnlocks
    };
  } catch (error) {
    console.error("ChallengeService: Error completing challenge:", error);
    throw error;
  }
};
