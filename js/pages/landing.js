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

  // Initialize particle background on landing page hero
  initLandingParticles();
});

/**
 * Optimized floating particle system with visionOS depth, proximity glows,
 * and rare golden sustainability energy sparks around the compass graphic.
 */
function initLandingParticles() {
  const canvas = document.getElementById('hero-particles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const particles = [];

  function resizeCanvas() {
    if (!canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    updateCompassCoords();
  }

  // Compass center tracking
  let compassCenterX = canvas.width * 0.75;
  let compassCenterY = canvas.height / 2;

  function updateCompassCoords() {
    const containerEl = document.querySelector('.globe-container');
    if (containerEl && canvas) {
      const rect = containerEl.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      compassCenterX = rect.left + rect.width / 2 - canvasRect.left;
      compassCenterY = rect.top + rect.height / 2 - canvasRect.top;
    } else {
      compassCenterX = canvas.width * 0.75;
      compassCenterY = canvas.height / 2;
    }
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Recalculate slightly later to handle dynamic image rendering / grid alignments
  setTimeout(updateCompassCoords, 500);
  setTimeout(updateCompassCoords, 2000);

  // Define particle colors matching Carbon Compass palette (RGBA format)
  const colors = [
    '34, 197, 94',   // Emerald (#22C55E)
    '16, 185, 129',  // Bright Green (#10B981)
    '251, 191, 36',  // Golden (#FBBF24)
    '245, 158, 11'   // Soft Amber (#F59E0B)
  ];

  // Seed 40 particles across depth layers (foreground, mid, background)
  const totalParticles = 40;
  for (let i = 0; i < totalParticles; i++) {
    const rand = Math.random();
    let r, vy, baseOpacity, shadowBlur;
    
    if (rand < 0.5) {
      // Background layer: small, numerous, faster upward drift
      r = Math.random() * 1.5 + 1.5; // 1.5 - 3px
      vy = -(Math.random() * 0.3 + 0.3); // -0.3 to -0.6 px/frame
      baseOpacity = Math.random() * 0.12 + 0.08;
      shadowBlur = 0;
    } else if (rand < 0.85) {
      // Mid layer: medium size, medium speed
      r = Math.random() * 2 + 3; // 3 - 5px
      vy = -(Math.random() * 0.2 + 0.15); // -0.15 to -0.35 px/frame
      baseOpacity = Math.random() * 0.18 + 0.12;
      shadowBlur = 4;
    } else {
      // Foreground layer: large, slow
      r = Math.random() * 3 + 5; // 5 - 8px
      vy = -(Math.random() * 0.1 + 0.08); // -0.08 to -0.18 px/frame
      baseOpacity = Math.random() * 0.22 + 0.18;
      shadowBlur = 10;
    }

    const color = colors[Math.floor(Math.random() * colors.length)];

    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: r,
      vx: (Math.random() - 0.5) * 0.15,
      vy: vy,
      baseOpacity: baseOpacity,
      opacity: baseOpacity,
      color: color,
      shadowBlur: shadowBlur,
      swaySpeed: Math.random() * 0.02 + 0.005,
      swayOffset: Math.random() * Math.PI * 2,
      isSpark: false
    });
  }

  let frameCount = 0;

  function animate(timestamp) {
    frameCount++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Periodically update coordinates to handle dynamic shifts
    if (frameCount % 60 === 0) {
      updateCompassCoords();
    }

    // Occasionally spawn rare golden spark around the compass icon (magical energy effect)
    if (Math.random() < 0.018) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 90 + Math.random() * 70;
      const sparkX = compassCenterX + Math.cos(angle) * radius;
      const sparkY = compassCenterY + Math.sin(angle) * radius;
      
      particles.push({
        x: sparkX,
        y: sparkY,
        r: Math.random() * 2 + 1.5,
        vx: (Math.cos(angle) * 0.25) + (Math.random() - 0.5) * 0.15,
        vy: -(Math.random() * 0.4 + 0.4),
        baseOpacity: Math.random() * 0.5 + 0.3,
        opacity: 0,
        color: Math.random() < 0.65 ? '251, 191, 36' : '245, 158, 11',
        shadowBlur: 8,
        swaySpeed: Math.random() * 0.04 + 0.01,
        swayOffset: Math.random() * Math.PI * 2,
        isSpark: true,
        life: 1.0,
        decay: Math.random() * 0.007 + 0.005
      });
    }

    // Draw connection lines between non-spark particles if close (organic network)
    for (let i = 0; i < particles.length; i++) {
      if (particles[i].isSpark) continue;
      for (let j = i + 1; j < particles.length; j++) {
        if (particles[j].isSpark) continue;

        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          const lineAlpha = (1 - dist / 110) * 0.065;
          ctx.strokeStyle = `rgba(16, 185, 129, ${lineAlpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw and animate particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Calculate distance to compass
      const dx = p.x - compassCenterX;
      const dy = p.y - compassCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Interactions: nearby particles get stronger glow and opacity boost
      let currentBlur = p.shadowBlur;
      let opacityFactor = p.baseOpacity;
      
      if (dist < 180) {
        const proximity = 1 - dist / 180; // 0 to 1
        
        currentBlur = p.shadowBlur + proximity * 12;
        
        // Brighten golden/amber particles near the compass
        if (p.color === '251, 191, 36' || p.color === '245, 158, 11') {
          opacityFactor = p.baseOpacity + proximity * 0.55;
        } else {
          opacityFactor = p.baseOpacity + proximity * 0.3;
        }
      }

      // Handle spark life cycle
      if (p.isSpark) {
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        if (p.life > 0.8) {
          opacityFactor = (1 - (p.life - 0.8) / 0.2) * p.baseOpacity;
        } else {
          opacityFactor = (p.life / 0.8) * p.baseOpacity;
        }
      }

      opacityFactor = Math.max(0.01, Math.min(opacityFactor, 0.9));

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

      if (currentBlur > 0) {
        ctx.shadowBlur = currentBlur;
        ctx.shadowColor = `rgba(${p.color}, ${opacityFactor})`;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = `rgba(${p.color}, ${opacityFactor})`;
      ctx.fill();

      ctx.shadowBlur = 0; // reset

      // Update position: drift upward + horizontal sway
      p.y += p.vy;
      p.x += p.vx + Math.sin(timestamp * p.swaySpeed + p.swayOffset) * 0.16;

      // Boundaries wrapping or decay splicing
      if (p.isSpark) {
        if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          particles.splice(i, 1);
        }
      } else {
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
      }
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
