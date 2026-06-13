import { observeAuthState } from '../firebase/auth.js';
import { getAssessment, getChallenges, getBadges, getStreaks, getUserProfile } from '../firebase/firestore.js';
import { completeChallenge } from '../services/challengeService.js';
import { initNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { initRouter } from '../utils/router.js';
import { BADGE_DEFS } from '../utils/constants.js';

// Curated Climate-Tech & Sustainability Quotes
const SUSTAINABILITY_QUOTES = [
  { text: "We do not inherit the Earth from our ancestors, we borrow it from our children.", author: "Native American Proverb" },
  { text: "The greatest threat to our planet is the belief that someone else will save it.", author: "Robert Swan" },
  { text: "Plans to protect air and water, wilderness and wildlife are in fact plans to protect man.", author: "Albert Stewart" },
  { text: "One of the first conditions of happiness is that the link between man and nature shall not be broken.", author: "Leo Tolstoy" },
  { text: "There is no such thing as 'away'. When we throw anything away, it must go somewhere.", author: "Annie Leonard" },
  { text: "The environment is where we all meet; where all have a mutual interest; it is the one thing all of us share.", author: "Lady Bird Johnson" },
  { text: "What we are doing to the forests of the world is but a mirror reflection of what we are doing to ourselves.", author: "Chris Maser" },
  { text: "Small acts, when multiplied by millions of people, can transform the world.", author: "Howard Zinn" }
];

// Module-level state variables
let currentUser = null;
let activeChallenge = null;
let canvasAnimationId = null;
let currentLoadedUid = null;
const particles = [];
const burstParticles = [];

// Module-level DOM references
let welcomeTitle = null;
let welcomeAvatarImg = null;
let quoteText = null;
let quoteAuthor = null;
let heroScoreVal = null;
let heroScoreFill = null;
let heroBadgeEmoji = null;
let heroBadgeName = null;
let heroSummaryText = null;
let streakCountVal = null;
let streakMilestonesText = null;
let weeklyBubblesRow = null;
let challengeContainer = null;
let badgeGrid = null;
let trendBadgeVal = null;
let statChallengesCompleted = null;
let statCo2Saved = null;
let statBadgesEarned = null;

/* --- COMPONENT & HELPER FUNCTIONS --- */

// Helper to animate numbers smoothly
function animateValue(element, start, end, duration, decimals = 0, suffix = '') {
  if (!element) return;
  let startTimestamp = null;

  function step(timestamp) {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const ease = progress * (2 - progress); // outQuad easing
    const currentVal = ease * (end - start) + start;
    element.textContent = currentVal.toFixed(decimals) + suffix;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = end.toFixed(decimals) + suffix;
    }
  }

  window.requestAnimationFrame(step);
}

// Helper to trigger a particle burst at the score ring coordinates
function triggerBurstAtScoreRing() {
  const scoreRing = document.querySelector('.hero-score-ring');
  if (!scoreRing) return;

  const rect = scoreRing.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const count = 35;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1.5;
    const isCyan = Math.random() > 0.5;

    burstParticles.push({
      x: centerX + window.scrollX,
      y: centerY + window.scrollY,
      r: Math.random() * 3.5 + 1.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: isCyan ? '56, 189, 248' : '74, 222, 128',
      opacity: Math.random() * 0.6 + 0.4
    });
  }
}

// Render score circular gauge
function renderScore(assessment) {
  const score = assessment.planetHealthScore || 0;
  const persona = assessment.persona || { emoji: '🌱', name: 'Eco Explorer' };

  console.log("Dashboard: score value =", score);
  console.log("Dashboard: archetype value =", persona.name);

  // Animate score counter
  animateValue(heroScoreVal, 0, score, 1200);

  // Animate SVG path sweep
  // Circumference for r=70 is 439.82
  const circumference = 439.82;
  const offset = circumference - (circumference * score) / 100;
  setTimeout(() => {
    if (heroScoreFill) {
      heroScoreFill.style.strokeDashoffset = offset;
    }
  }, 200);

  // Persona Pill
  if (heroBadgeEmoji) heroBadgeEmoji.textContent = persona.emoji;
  if (heroBadgeName) heroBadgeName.textContent = persona.name;

  const heroBadgePill = document.getElementById('hero-badge-pill');
  if (heroBadgePill) heroBadgePill.style.opacity = '1';

  // Set summary text
  if (heroSummaryText) {
    heroSummaryText.textContent = `Outstanding work! Your score indicates excellent climate-consciousness in ${assessment.strongestArea || 'key areas'}. Targeting ${assessment.weakestArea || 'Transport'} will maximize your rating.`;
  }
}

// Render streak stats and check weekly activity bubbles
function renderStreaksAndWeekly(streaks, challenges) {
  const safeStreaks = streaks || { current: 0 };
  const safeChallenges = Array.isArray(challenges) ? challenges : [];
  const currentStreak = safeStreaks.current || 0;

  // Animate streak number counter
  animateValue(streakCountVal, 0, currentStreak, 1000, 0, currentStreak !== 1 ? ' Days' : ' Day');

  // Set streak milestone target
  if (streakMilestonesText) {
    if (currentStreak < 3) {
      streakMilestonesText.textContent = "3 Days Streak Badge";
    } else if (currentStreak < 7) {
      streakMilestonesText.textContent = "7 Days Streak Badge";
    } else {
      streakMilestonesText.textContent = "Elite Climate Master status reached! 🔥";
    }
  }

  // Weekly calendar tracker
  const today = new Date();
  const currentDay = today.getDay();
  const distanceToMon = currentDay === 0 ? 6 : currentDay - 1;
  const mondayDate = new Date(today);
  mondayDate.setDate(today.getDate() - distanceToMon);
  mondayDate.setHours(0, 0, 0, 0);

  const completedDays = new Array(7).fill(false);

  safeChallenges.forEach(c => {
    if (c.status === 'completed' && c.completedAt) {
      const compDate = new Date(c.completedAt);
      if (compDate >= mondayDate) {
        const dayIdx = compDate.getDay();
        const mappedIdx = dayIdx === 0 ? 6 : dayIdx - 1;
        if (mappedIdx >= 0 && mappedIdx < 7) {
          completedDays[mappedIdx] = true;
        }
      }
    }
  });

  for (let i = 0; i < 7; i++) {
    const bubble = document.getElementById(`day-${i}`);
    if (bubble) {
      bubble.className = 'day-status';
      bubble.innerHTML = '';
      if (completedDays[i]) {
        bubble.classList.add('completed');
        bubble.innerHTML = '✓';
      }
    }
  }
}

// Render Achievements grid
function renderBadges(earnedBadges, assessment, challenges, streaks) {
  if (!badgeGrid) return;
  badgeGrid.innerHTML = '';

  const safeEarnedBadges = Array.isArray(earnedBadges) ? earnedBadges : [];
  const safeChallenges = Array.isArray(challenges) ? challenges : [];
  const safeStreaks = streaks || { current: 0 };
  const safeAssessment = assessment || null;

  const earnedIds = new Set(safeEarnedBadges.map(b => b.badgeId));

  // Extract variables for progress calculation
  const scoreVal = safeAssessment ? safeAssessment.planetHealthScore || 0 : 0;
  const completedCount = safeChallenges.filter(c => c.status === 'completed').length;
  const streakCount = safeStreaks.current || 0;

  Object.entries(BADGE_DEFS).forEach(([, def]) => {
    const isEarned = earnedIds.has(def.id);

    // Calculate progress
    let currentProgress = 0;
    let targetProgress = 1;
    let progressText = '0/1';

    if (def.id === 'FIRST_STEPS') {
      currentProgress = safeAssessment ? 1 : 0;
      targetProgress = 1;
      progressText = isEarned ? 'Unlocked' : '0/1';
    } else if (def.id === 'ECO_EXPLORER_BADGE') {
      currentProgress = scoreVal;
      targetProgress = 80;
      progressText = isEarned ? 'Unlocked' : `${scoreVal}/80`;
    } else if (def.id === 'FIRST_CHALLENGE') {
      currentProgress = completedCount >= 1 ? 1 : 0;
      targetProgress = 1;
      progressText = isEarned ? 'Unlocked' : '0/1';
    } else if (def.id === 'STREAK_3') {
      currentProgress = Math.min(streakCount, 3);
      targetProgress = 3;
      progressText = isEarned ? 'Unlocked' : `${streakCount}/3`;
    } else if (def.id === 'CARBON_SHREDDER') {
      currentProgress = isEarned ? 1 : 0;
      targetProgress = 1;
      progressText = isEarned ? 'Unlocked' : '0/1';
    }

    // Set rarity border and glow colors
    let rarityColor = 'rgba(255, 255, 255, 0.08)'; // Common
    let glowShadow = 'none';
    let iconBg = 'rgba(255, 255, 255, 0.03)';

    if (def.rarity === 'Rare') {
      rarityColor = 'rgba(56, 189, 248, 0.3)';
      if (isEarned) {
        glowShadow = '0 0 15px rgba(56, 189, 248, 0.25)';
        iconBg = 'rgba(56, 189, 248, 0.1)';
      }
    } else if (def.rarity === 'Epic') {
      rarityColor = 'rgba(168, 85, 247, 0.3)';
      if (isEarned) {
        glowShadow = '0 0 15px rgba(168, 85, 247, 0.25)';
        iconBg = 'rgba(168, 85, 247, 0.1)';
      }
    } else if (def.rarity === 'Legendary') {
      rarityColor = 'rgba(249, 115, 22, 0.3)';
      if (isEarned) {
        glowShadow = '0 0 15px rgba(249, 115, 22, 0.3)';
        iconBg = 'rgba(249, 115, 22, 0.1)';
      }
    } else {
      // Common
      if (isEarned) {
        glowShadow = '0 0 10px rgba(74, 222, 128, 0.2)';
        iconBg = 'rgba(74, 222, 128, 0.05)';
      }
    }

    const badgeItem = document.createElement('div');
    badgeItem.className = `badge-item ${isEarned ? 'earned' : 'locked'}`;

    // Add custom inline styling for rarities
    badgeItem.style.border = `1px solid ${rarityColor}`;
    if (isEarned) {
      badgeItem.style.boxShadow = glowShadow;
    }

    // Set rich description tooltip
    const tooltipText = `${def.name} (${def.rarity} Achievement)\n\nRequirement: ${def.requirementText}\nStatus: ${isEarned ? 'Unlocked' : 'Locked (' + progressText + ')'}`;
    badgeItem.setAttribute('title', tooltipText);

    badgeItem.innerHTML = `
      <div class="badge-glass-circle" style="background: ${iconBg}; border-color: ${isEarned ? 'var(--primary)' : 'rgba(255,255,255,0.06)'};" aria-hidden="true">${def.icon}</div>
      <span class="badge-item-name" style="margin-bottom: 2px;">${def.name}</span>
      <span style="font-size: 0.65rem; color: var(--text-dim); font-weight: 500;">${progressText}</span>
    `;

    badgeGrid.appendChild(badgeItem);
  });
}

// Render Analytics details and Footer stats bar
function renderAnalyticsAndStats(challenges, badges, assessment, profile) {
  const safeChallenges = Array.isArray(challenges) ? challenges : [];
  const safeBadges = Array.isArray(badges) ? badges : [];
  const safeAssessment = assessment || null;
  const safeProfile = profile || null;

  // 1. Footer Stats
  const completedChallengesList = safeChallenges.filter(c => c.status === 'completed');

  // Use profile statistics if available, fallback to dynamic count
  const completedCount = safeProfile && typeof safeProfile.totalChallengesCompleted === 'number'
    ? safeProfile.totalChallengesCompleted
    : completedChallengesList.length;

  const totalCo2Saved = safeProfile && typeof safeProfile.totalCo2Saved === 'number'
    ? safeProfile.totalCo2Saved
    : completedChallengesList.reduce((acc, c) => acc + (c.co2Saving || 0), 0);

  const badgesEarnedCount = safeBadges.length;

  // Animate stats values on load
  animateValue(statChallengesCompleted, 0, completedCount, 1200);
  animateValue(statCo2Saved, 0, totalCo2Saved, 1200, 1, ' kg');
  animateValue(statBadgesEarned, 0, badgesEarnedCount, 1200);

  // 2. Trend badge calculation
  // Calculate a mock percentage change: higher score = larger reduction trend
  const scoreVal = safeAssessment ? safeAssessment.planetHealthScore || 0 : 0;
  const trendPercentage = scoreVal * 0.18 + 2.5; // E.g. 80 score -> -16.9%

  if (trendBadgeVal) {
    trendBadgeVal.textContent = `-${trendPercentage.toFixed(1)}%`;
  }
}

// Render Active Challenge
function renderActiveChallenge(challenges) {
  const safeChallenges = Array.isArray(challenges) ? challenges : [];
  activeChallenge = safeChallenges.find(c => c.status === 'active');

  if (!activeChallenge) {
    if (challengeContainer) {
      challengeContainer.innerHTML = `
        <div style="text-align: center; padding: 24px 0;">
          <p class="text-muted" style="font-size: 0.95rem; margin-bottom: 20px;">
            No active eco-challenge is selected for this week.
          </p>
          <a href="/challenges" class="btn btn-primary btn-sm" style="min-height: 40px; display: inline-flex;">
            Browse Challenge Hub
          </a>
        </div>
      `;
    }
    return;
  }

  const progress = activeChallenge.progress || 0;
  const duration = activeChallenge.durationDays || 1;
  const pct = Math.round((progress / duration) * 100);

  if (challengeContainer) {
    challengeContainer.innerHTML = `
      <div class="active-challenge-card animate-slide-up">
        <div class="challenge-card-header">
          <h3 class="challenge-card-title">${activeChallenge.title}</h3>
          <span class="challenge-card-saving">-${activeChallenge.co2Saving} kg CO₂</span>
        </div>
        <p class="challenge-card-desc">
          ${activeChallenge.description}
        </p>
        <div class="challenge-progress-bar-track" aria-hidden="true">
          <div class="challenge-progress-bar-fill" id="challenge-progress-fill" style="width: 0%;"></div>
        </div>
        <div class="challenge-progress-text">
          <span>Progress: ${progress} / ${duration} ${duration === 1 ? 'Day' : 'Days'}</span>
          <span id="challenge-progress-percentage">0%</span>
        </div>
      </div>
      <button id="complete-challenge-btn" class="btn btn-primary challenge-btn">
        Complete Challenge
      </button>
    `;
  }

  // Slide progress bar and animate number progress
  setTimeout(() => {
    const fill = document.getElementById('challenge-progress-fill');
    const text = document.getElementById('challenge-progress-percentage');
    if (fill) fill.style.width = `${pct}%`;
    if (text) animateValue(text, 0, pct, 1000, 0, '%');
  }, 300);

  // Complete active challenge click hook
  const completeBtn = document.getElementById('complete-challenge-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', async () => {
      completeBtn.disabled = true;
      completeBtn.textContent = 'Processing...';

      try {
        await completeChallenge(currentUser.uid, activeChallenge.id || activeChallenge.challengeId);
        showToast(`Outstanding! You completed the challenge: ${activeChallenge.title}!`, 'success');

        // Trigger a score particle burst around the ring
        triggerBurstAtScoreRing();

        await loadDashboardData(currentUser.uid);
      } catch (e) {
        console.error("Dashboard: Challenge completion error:", e);
        showToast("Failed to record challenge completion.", "error");
        completeBtn.disabled = false;
        completeBtn.textContent = 'Complete Challenge';
      }
    });
  }
}

// Load dashboard data from Firestore / Local Fallback
async function loadDashboardData(uid) {
  console.log("Dashboard: loadDashboardData called for uid =", uid);
  const [assessment, challenges, badges, streaks, profile] = await Promise.all([
    getAssessment(uid).catch(e => { console.error("Error loading assessment:", e); return null; }),
    getChallenges(uid).catch(e => { console.error("Error loading challenges:", e); return []; }),
    getBadges(uid).catch(e => { console.error("Error loading badges:", e); return []; }),
    getStreaks(uid).catch(e => { console.error("Error loading streaks:", e); return { current: 0, longest: 0, lastActivityDate: null }; }),
    getUserProfile(uid).catch(e => { console.error("Error loading user profile:", e); return null; })
  ]);

  if (uid !== currentLoadedUid) {
    console.warn("Dashboard: Stale data load discarded for uid =", uid);
    return;
  }

  console.log("Dashboard: assessment data received:", assessment);
  console.log("Dashboard: dashboard render started");

  // 1. Render Score Ring
  if (assessment) {
    renderScore(assessment);
    // Trigger a particle burst around the ring
    triggerBurstAtScoreRing();
  } else {
    console.warn("Dashboard: No assessment data found!");
  }

  // 2. Render Streak Statistics & Milestone details
  renderStreaksAndWeekly(streaks, challenges);

  // 3. Render Active Challenge
  renderActiveChallenge(challenges);

  // 4. Render Achievements Collection
  try {
    renderBadges(badges, assessment, challenges, streaks);
  } catch (error) {
    console.error("Dashboard: Error rendering badges:", error);
  }

  // 5. Render Footer Statistics & Trend Badges
  renderAnalyticsAndStats(challenges, badges, assessment, profile);

  console.log("Dashboard: dashboard render completed");
}

// Select Quote of the Day based on day of year
function loadDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const quoteIndex = dayOfYear % SUSTAINABILITY_QUOTES.length;
  const dailyQuote = SUSTAINABILITY_QUOTES[quoteIndex];

  if (quoteText && quoteAuthor) {
    quoteText.textContent = `"${dailyQuote.text}"`;
    quoteAuthor.textContent = dailyQuote.author;
  }
}

/* --- MOUSE REACTIVE GLOW EFFECT --- */
function initMouseReactiveGlow() {
  document.addEventListener('mousemove', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    document.documentElement.style.setProperty('--mouse-x', `${x}px`);
    document.documentElement.style.setProperty('--mouse-y', `${y}px`);
  });
}

/* --- CANVAS PARTICLES SYSTEM --- */
function initParticlesBackground() {
  const canvas = document.getElementById('bg-particles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Create background floating nodes (standard particles)
  const maxBgParticles = Math.min(30, Math.floor(window.innerWidth / 40));
  for (let i = 0; i < maxBgParticles; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      speedY: -(Math.random() * 0.3 + 0.1),
      opacity: Math.random() * 0.10 + 0.02,
      isGlass: false
    });
  }

  // Add 8 large slow-moving "glass particles" / blurred bokeh lights
  const glassParticleCount = 8;
  for (let i = 0; i < glassParticleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 20 + 12, // larger size
      speedY: -(Math.random() * 0.08 + 0.03), // extremely slow
      opacity: Math.random() * 0.02 + 0.01, // barely visible
      isGlass: true,
      driftX: Math.sin(Math.random() * Math.PI) * 0.1
    });
  }

  // Particle loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);

      if (p.isGlass) {
        // Large blurred glass motes
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.05)';
        ctx.shadowBlur = 10;
        p.x += p.driftX;
      } else {
        // Small neon green nodes
        ctx.fillStyle = `rgba(74, 222, 128, ${p.opacity})`;
        ctx.shadowBlur = 0;
      }
      ctx.fill();

      // Move
      p.y += p.speedY;

      // Reset if offscreen
      if (p.y < -30) {
        p.y = canvas.height + 30;
        p.x = Math.random() * canvas.width;
      }
      if (p.x < -30) p.x = canvas.width + 30;
      if (p.x > canvas.width + 30) p.x = -30;
    });

    // Reset shadowBlur for other draw calls
    ctx.shadowBlur = 0;

    // 2. Draw active burst particles
    for (let i = burstParticles.length - 1; i >= 0; i--) {
      const bp = burstParticles[i];
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${bp.color}, ${bp.opacity})`;
      ctx.fill();

      // Physics
      bp.x += bp.vx;
      bp.y += bp.vy;
      bp.opacity -= 0.015;

      // Remove dead particles
      if (bp.opacity <= 0) {
        burstParticles.splice(i, 1);
      }
    }

    canvasAnimationId = requestAnimationFrame(animate);
  }

  animate();
}

/* --- BOOTSTRAP EVENT LISTENERS --- */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize route guards & navbar
  initRouter();
  initNavbar('dashboard');

  // Initialize DOM References
  welcomeTitle = document.getElementById('welcome-title');
  welcomeAvatarImg = document.getElementById('welcome-avatar-img');
  quoteText = document.getElementById('quote-text');
  quoteAuthor = document.getElementById('quote-author');

  heroScoreVal = document.getElementById('hero-score-val');
  heroScoreFill = document.getElementById('hero-score-fill-el');
  heroBadgeEmoji = document.getElementById('hero-badge-emoji');
  heroBadgeName = document.getElementById('hero-badge-name');
  heroSummaryText = document.getElementById('hero-summary-text');

  streakCountVal = document.getElementById('streak-count-val');
  streakMilestonesText = document.querySelector('#streak-milestones span:last-child');
  weeklyBubblesRow = document.getElementById('weekly-bubbles-row');
  challengeContainer = document.getElementById('active-challenge-container');
  badgeGrid = document.getElementById('badge-collection-grid');

  trendBadgeVal = document.getElementById('trend-badge-val');

  statChallengesCompleted = document.getElementById('stat-challenges-completed');
  statCo2Saved = document.getElementById('stat-co2-saved');
  statBadgesEarned = document.getElementById('stat-badges-earned');

  // Initialize Mouse Reactive Cursor Glow
  initMouseReactiveGlow();

  // Initialize Canvas Particles Background
  initParticlesBackground();

  // Load Daily Quote
  loadDailyQuote();

  // Monitor auth state and load data
  observeAuthState(async (user) => {
    if (!user) return;

    currentUser = user;
    currentLoadedUid = user.uid;

    if (welcomeTitle) {
      welcomeTitle.textContent = `Welcome, ${user.displayName || 'Eco Pioneer'}!`;
    }
    if (user.photoURL && welcomeAvatarImg) {
      welcomeAvatarImg.src = user.photoURL;
    }

    try {
      await loadDashboardData(user.uid);
    } catch (e) {
      console.error("Dashboard: Error loading metrics:", e);
      showToast("Error updating dashboard parameters.", "error");
    }
  });
});
