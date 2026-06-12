import { db } from './config.js';
import { isFirebaseConfigured } from './auth.js';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Sandbox mock database keys
const SB_DB_PROFILE = 'carbon_compass_sb_profile_';
const SB_DB_ASSESSMENT = 'carbon_compass_sb_assessment_';
const SB_DB_CHALLENGES = 'carbon_compass_sb_challenges_';
const SB_DB_BADGES = 'carbon_compass_sb_badges_';
const SB_DB_STREAKS = 'carbon_compass_sb_streaks_';
const SB_DB_COACH = 'carbon_compass_sb_coach_';

/* --- User Profile Management --- */

export const getUserProfile = async (uid) => {
  if (!isFirebaseConfigured()) {
    const raw = localStorage.getItem(`${SB_DB_PROFILE}${uid}`);
    return raw ? JSON.parse(raw) : null;
  }
  
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("Firestore: Error getting user profile", error);
    throw error;
  }
};

export const createUserProfile = async (uid, profileData) => {
  const data = {
    ...profileData,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  if (!isFirebaseConfigured()) {
    localStorage.setItem(`${SB_DB_PROFILE}${uid}`, JSON.stringify(data));
    return;
  }

  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error("Firestore: Error creating user profile", error);
    throw error;
  }
};

export const updateUserProfile = async (uid, updates) => {
  if (!isFirebaseConfigured()) {
    const current = await getUserProfile(uid) || {};
    const updated = { ...current, ...updates };
    localStorage.setItem(`${SB_DB_PROFILE}${uid}`, JSON.stringify(updated));
    return;
  }

  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Firestore: Error updating user profile", error);
    throw error;
  }
};

/* --- Assessment Results --- */

export const getAssessment = async (uid) => {
  const isFbConf = isFirebaseConfigured();
  console.log(`Firestore: getAssessment called for uid = ${uid}, isFirebaseConfigured = ${isFbConf}`);
  if (!isFbConf) {
    const raw = localStorage.getItem(`${SB_DB_ASSESSMENT}${uid}`);
    const parsed = raw ? JSON.parse(raw) : null;
    console.log(`Firestore: getAssessment (localStorage) returned:`, parsed);
    return parsed;
  }

  try {
    const docRef = doc(db, 'users', uid, 'assessment', 'results');
    const snap = await getDoc(docRef);
    const data = snap.exists() ? snap.data() : null;
    console.log(`Firestore: getAssessment (Firestore) returned exists = ${snap.exists()}, data:`, data);
    return data;
  } catch (error) {
    console.error("Firestore: Error getting assessment results", error);
    throw error;
  }
};

export const saveAssessment = async (uid, assessmentData) => {
  const data = {
    ...assessmentData,
    completedAt: new Date().toISOString()
  };

  if (!isFirebaseConfigured()) {
    localStorage.setItem(`${SB_DB_ASSESSMENT}${uid}`, JSON.stringify(data));
    return;
  }

  try {
    const docRef = doc(db, 'users', uid, 'assessment', 'results');
    await setDoc(docRef, data);
  } catch (error) {
    console.error("Firestore: Error saving assessment results", error);
    throw error;
  }
};

/* --- Challenges --- */

export const getChallenges = async (uid) => {
  if (!isFirebaseConfigured()) {
    const raw = localStorage.getItem(`${SB_DB_CHALLENGES}${uid}`);
    return raw ? JSON.parse(raw) : [];
  }

  try {
    const colRef = collection(db, 'users', uid, 'challenges');
    const snap = await getDocs(colRef);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Firestore: Error getting challenges", error);
    throw error;
  }
};

export const saveChallenge = async (uid, challengeData) => {
  if (!isFirebaseConfigured()) {
    const list = await getChallenges(uid);
    const id = challengeData.id || 'chal_' + Math.random().toString(36).substr(2, 9);
    const newChallenge = { ...challengeData, id };
    
    // Check if challenge exists to update, else append
    const idx = list.findIndex(c => c.id === id);
    if (idx >= 0) {
      list[idx] = newChallenge;
    } else {
      list.push(newChallenge);
    }
    localStorage.setItem(`${SB_DB_CHALLENGES}${uid}`, JSON.stringify(list));
    return id;
  }

  try {
    const colRef = collection(db, 'users', uid, 'challenges');
    if (challengeData.id) {
      const docRef = doc(db, 'users', uid, 'challenges', challengeData.id);
      await setDoc(docRef, challengeData, { merge: true });
      return challengeData.id;
    } else {
      const docRef = await addDoc(colRef, challengeData);
      return docRef.id;
    }
  } catch (error) {
    console.error("Firestore: Error saving challenge", error);
    throw error;
  }
};

/* --- Badges --- */

export const getBadges = async (uid) => {
  if (!isFirebaseConfigured()) {
    const raw = localStorage.getItem(`${SB_DB_BADGES}${uid}`);
    return raw ? JSON.parse(raw) : [];
  }

  try {
    const colRef = collection(db, 'users', uid, 'badges');
    const snap = await getDocs(colRef);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Firestore: Error getting badges", error);
    throw error;
  }
};

export const earnBadge = async (uid, badgeData) => {
  const data = {
    ...badgeData,
    earnedAt: new Date().toISOString()
  };

  if (!isFirebaseConfigured()) {
    const list = await getBadges(uid);
    if (!list.some(b => b.badgeId === badgeData.badgeId)) {
      list.push(data);
      localStorage.setItem(`${SB_DB_BADGES}${uid}`, JSON.stringify(list));
    }
    return;
  }

  try {
    const docRef = doc(db, 'users', uid, 'badges', badgeData.badgeId);
    await setDoc(docRef, data);
  } catch (error) {
    console.error("Firestore: Error earning badge", error);
    throw error;
  }
};

/* --- Streaks --- */

export const getStreaks = async (uid) => {
  const defaultStreak = { current: 0, longest: 0, lastActivityDate: null };
  if (!isFirebaseConfigured()) {
    const raw = localStorage.getItem(`${SB_DB_STREAKS}${uid}`);
    return raw ? JSON.parse(raw) : defaultStreak;
  }

  try {
    const docRef = doc(db, 'users', uid, 'streaks', 'stats');
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : defaultStreak;
  } catch (error) {
    console.error("Firestore: Error getting streaks", error);
    throw error;
  }
};

export const updateStreaks = async (uid, streakData) => {
  if (!isFirebaseConfigured()) {
    localStorage.setItem(`${SB_DB_STREAKS}${uid}`, JSON.stringify(streakData));
    return;
  }

  try {
    const docRef = doc(db, 'users', uid, 'streaks', 'stats');
    await setDoc(docRef, streakData);
  } catch (error) {
    console.error("Firestore: Error updating streaks", error);
    throw error;
  }
};

/* --- Coach Session History --- */

export const saveCoachMessage = async (uid, sessionId, messages) => {
  const data = {
    messages,
    updatedAt: new Date().toISOString()
  };

  if (!isFirebaseConfigured()) {
    const raw = localStorage.getItem(`${SB_DB_COACH}${uid}`);
    const sessions = raw ? JSON.parse(raw) : {};
    if (!sessions[sessionId]) {
      sessions[sessionId] = { createdAt: new Date().toISOString() };
    }
    sessions[sessionId] = { ...sessions[sessionId], ...data };
    localStorage.setItem(`${SB_DB_COACH}${uid}`, JSON.stringify(sessions));
    return;
  }

  try {
    const docRef = doc(db, 'users', uid, 'coachHistory', sessionId);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    console.error("Firestore: Error saving coach message", error);
    throw error;
  }
};

export const getCoachSessions = async (uid) => {
  if (!isFirebaseConfigured()) {
    const raw = localStorage.getItem(`${SB_DB_COACH}${uid}`);
    const sessions = raw ? JSON.parse(raw) : {};
    return Object.entries(sessions).map(([id, data]) => ({ id, ...data }));
  }

  try {
    const colRef = collection(db, 'users', uid, 'coachHistory');
    const q = query(colRef, orderBy('updatedAt', 'desc'), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Firestore: Error getting coach history", error);
    throw error;
  }
};
