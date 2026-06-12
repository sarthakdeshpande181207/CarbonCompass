import { auth, googleProvider, setPersistence, browserLocalPersistence } from './config.js';
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Check if Firebase is fully configured
export const isFirebaseConfigured = () => {
  return auth && auth.app && auth.app.options && auth.app.options.apiKey;
};

// Local storage key for sandbox mode
const SANDBOX_USER_KEY = 'carbon_compass_sandbox_user';

// Setup Mock User for Sandbox mode
const createSandboxUser = () => ({
  uid: 'sandbox_user_id',
  displayName: 'Eco Pioneer',
  email: 'pioneer@carboncompass.org',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  isSandbox: true
});

/**
 * Trigger Google Sign-In
 */
export const signInWithGoogle = async () => {
  if (!isFirebaseConfigured()) {
    console.warn("Firebase is not configured. Falling back to Sandbox Mock Auth.");
    const mockUser = createSandboxUser();
    localStorage.setItem(SANDBOX_USER_KEY, JSON.stringify(mockUser));
    // Simulate a brief delay for realistic feel
    await new Promise(resolve => setTimeout(resolve, 800));
    return mockUser;
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Firebase Sign-In Error:", error);
    throw error;
  }
};

/**
 * Handle Sign Out
 */
export const signOut = async () => {
  if (!isFirebaseConfigured()) {
    localStorage.removeItem(SANDBOX_USER_KEY);
    return;
  }

  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error("Firebase Sign-Out Error:", error);
    throw error;
  }
};

/**
 * Observe auth state changes. Supports both Firebase Auth and Sandbox mode fallback.
 */
export const observeAuthState = (callback) => {
  // Check Sandbox Mode first
  const checkSandboxUser = () => {
    const sandboxUserRaw = localStorage.getItem(SANDBOX_USER_KEY);
    if (sandboxUserRaw) {
      try {
        return JSON.parse(sandboxUserRaw);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  if (!isFirebaseConfigured()) {
    // If not configured, check if we have a sandbox user and callback
    const user = checkSandboxUser();
    callback(user);
    // Listen for storage events in case they change in another tab
    window.addEventListener('storage', (e) => {
      if (e.key === SANDBOX_USER_KEY) {
        callback(checkSandboxUser());
      }
    });
    return () => {}; // No-op cleanup
  }

  // Monitor Firebase auth state
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(user);
    } else {
      callback(null);
    }
  });
};
