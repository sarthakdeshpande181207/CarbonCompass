import { signInWithGoogle, observeAuthState } from '../firebase/auth.js';
import { getAssessment, createUserProfile } from '../firebase/firestore.js';
import { initNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { PATH_ASSESSMENT, PATH_DASHBOARD } from '../utils/router.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize navigation
  initNavbar('landing');

  const googleBtn = document.getElementById('google-signin-btn');
  const loaderEl = document.getElementById('login-loader');

  // Set up click action for Sign-In CTA
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      // Show loader, disable button
      googleBtn.disabled = true;
      if (loaderEl) loaderEl.style.display = 'inline-block';

      try {
        const user = await signInWithGoogle();
        
        // Save user profile info to Firestore
        await createUserProfile(user.uid, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        });

        showToast(`Welcome, ${user.displayName || 'Eco Pioneer'}!`, 'success');

        // Check if user has already done assessment to decide redirection
        const assessment = await getAssessment(user.uid);
        const hasCompletedAssessment = !!(assessment && assessment.planetHealthScore !== undefined);

        setTimeout(() => {
          if (hasCompletedAssessment) {
            window.location.href = PATH_DASHBOARD;
          } else {
            window.location.href = PATH_ASSESSMENT;
          }
        }, 800);

      } catch (error) {
        console.error("Sign-In Flow Error:", error);
        showToast("Sign-In failed. Please try again.", "error");
        
        // Re-enable button
        googleBtn.disabled = false;
        if (loaderEl) loaderEl.style.display = 'none';
      }
    });
  }

  // Observe auth state to handle direct redirects (e.g. if already logged in)
  observeAuthState(async (user) => {
    if (user) {
      try {
        const assessment = await getAssessment(user.uid);
        const hasCompletedAssessment = !!(assessment && assessment.planetHealthScore !== undefined);
        
        // Hide loader in case they were stuck
        if (loaderEl) loaderEl.style.display = 'none';

        // Redirect immediately if already logged in and checked
        if (hasCompletedAssessment) {
          window.location.href = PATH_DASHBOARD;
        } else {
          window.location.href = PATH_ASSESSMENT;
        }
      } catch (err) {
        console.error("Auth observer redirect check failed:", err);
      }
    }
  });
});
