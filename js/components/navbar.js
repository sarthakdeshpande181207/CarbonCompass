import { observeAuthState, signOut } from '../firebase/auth.js';

/**
 * Initializes and renders the shared header navigation bar.
 * @param {string} activePage - The ID of the currently active page (e.g. 'dashboard', 'coach')
 */
export const initNavbar = (activePage = '') => {
  const container = document.getElementById('navbar-placeholder');
  if (!container) return;

  // Render shell
  container.innerHTML = `
    <nav class="navbar">
      <div class="container navbar-container">
        <a href="/" class="brand">
          <img src="/assets/logo.png" alt="Carbon Compass Logo" style="height: 32px; width: auto; object-fit: contain; display: block;">
          <span>Carbon Compass</span>
        </a>
        <button class="nav-toggle" id="nav-toggle-btn" aria-expanded="false" aria-label="Toggle navigation menu">
          <span class="hamburger-bar"></span>
          <span class="hamburger-bar"></span>
          <span class="hamburger-bar"></span>
        </button>
        <ul class="nav-links" id="nav-links-list">
          <!-- Dynamically populated -->
        </ul>
      </div>
    </nav>
  `;

  const navLinksList = document.getElementById('nav-links-list');
  const toggleBtn = document.getElementById('nav-toggle-btn');

  // Toggle mobile drawer
  if (toggleBtn && navLinksList) {
    toggleBtn.addEventListener('click', () => {
      const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', !expanded);
      toggleBtn.classList.toggle('open');
      navLinksList.classList.toggle('open');
    });
  }

  // Monitor auth state to dynamically show links and profile info
  observeAuthState((user) => {
    if (!navLinksList) return;

    // Close mobile menu on auth changes or navigation
    if (toggleBtn && navLinksList.classList.contains('open')) {
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.classList.remove('open');
      navLinksList.classList.remove('open');
    }

    if (!user) {
      // Unauthenticated
      navLinksList.innerHTML = `
        <li><a href="/" class="nav-link ${activePage === 'landing' ? 'active' : ''}">Home</a></li>
        <li><button class="btn btn-primary btn-sm" id="nav-login-btn" style="padding: 8px 16px; min-height: 36px;">Sign In</button></li>
      `;
      
      const loginBtn = document.getElementById('nav-login-btn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          // If on landing, scroll to CTA or trigger Google Sign-In directly
          const authCta = document.getElementById('google-signin-btn');
          if (authCta) {
            authCta.scrollIntoView({ behavior: 'smooth' });
          } else {
            // Trigger import and call
            import('../firebase/auth.js').then(authMod => authMod.signInWithGoogle());
          }
        });
      }
    } else {
      // Authenticated
      navLinksList.innerHTML = `
        <li><a href="/dashboard" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a></li>
        <li><a href="/coach" class="nav-link ${activePage === 'coach' ? 'active' : ''}">AI Coach</a></li>
        <li><a href="/simulator" class="nav-link ${activePage === 'simulator' ? 'active' : ''}">Simulator</a></li>
        <li><a href="/challenges" class="nav-link ${activePage === 'challenges' ? 'active' : ''}">Challenges</a></li>
        <li>
          <a href="/profile" class="avatar-ring ${activePage === 'profile' ? 'active' : ''}" title="Profile" id="nav-avatar-link">
            <img src="${user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}" alt="${user.displayName || 'User'}">
          </a>
        </li>
        <li><button class="btn btn-secondary btn-sm" id="nav-logout-btn" style="padding: 8px 16px; min-height: 36px; font-size: 0.85rem;">Sign Out</button></li>
      `;

      const logoutBtn = document.getElementById('nav-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try {
            await signOut();
            window.location.href = '/';
          } catch (e) {
            console.error("Logout failed:", e);
          }
        });
      }
    }
  });
};
export default initNavbar;
