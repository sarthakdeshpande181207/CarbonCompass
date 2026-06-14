import { observeAuthState } from '../firebase/auth.js';
import { getAssessment } from '../firebase/firestore.js';

// Paths
const PATH_LANDING = '/';
const PATH_ASSESSMENT = '/assessment';
const PATH_REPORT = '/report';
const PATH_DASHBOARD = '/dashboard';

/**
 * Normalizes pathname to standard route
 */
const getNormalizedPath = () => {
  let path = window.location.pathname;
  if (path.endsWith('.html')) {
    path = path.slice(0, -5);
  }
  if (path === '/index' || path === '/index.html') {
    return '/';
  }
  return path || '/';
};

/**
 * Set up page guards based on Authentication & Assessment completion status
 */
export const initRouter = () => {
  const currentPath = getNormalizedPath();
  const searchParams = new URLSearchParams(window.location.search);
  const isRetake = searchParams.get('retake') === 'true';

  // Observe Auth changes
  observeAuthState(async (user) => {
    const isAuthPage = currentPath !== PATH_LANDING;

    if (!user) {
      // Unauthenticated users can only view Landing page
      if (isAuthPage) {
        console.log("Unauthenticated: Redirecting to Landing Page");
        window.location.href = PATH_LANDING;
      }
    } else {
      // Authenticated users
      try {
        const assessment = await getAssessment(user.uid);
        const hasCompletedAssessment = !!(assessment && assessment.planetHealthScore !== undefined);

        if (!hasCompletedAssessment) {
          // Authenticated but no assessment -> must take assessment, except on Coach, Simulator, and Profile pages
          if (currentPath !== PATH_ASSESSMENT && currentPath !== PATH_LANDING && currentPath !== '/coach' && currentPath !== '/simulator' && currentPath !== '/profile') {
            console.log("Assessment pending: Redirecting to Assessment Page");
            window.location.href = PATH_ASSESSMENT;
          }
        } else {
          // Authenticated and has completed assessment
          if (currentPath === PATH_LANDING) {
            // Already logged in and completed -> go directly to Dashboard
            console.log("Authenticated and assessed: Redirecting to Dashboard");
            window.location.href = PATH_DASHBOARD;
          } else if (currentPath === PATH_ASSESSMENT && !isRetake) {
            // Trying to access assessment without retake flag -> redirect to Dashboard
            console.log("Assessment already completed: Redirecting to Dashboard");
            window.location.href = PATH_DASHBOARD;
          }
        }
      } catch (error) {
        console.error("Router guard check failed:", error);
      }
    }

    // Unhide page body once routing check is complete
    document.body.style.visibility = 'visible';
  });
};

export { PATH_LANDING, PATH_ASSESSMENT, PATH_REPORT, PATH_DASHBOARD };
