import { observeAuthState } from '../firebase/auth.js';
import { getChallenges, getUserProfile, getAssessment, getStreaks } from '../firebase/firestore.js';
import { activateChallenge, logChallengeProgress } from '../services/challengeService.js';
import { initNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { initRouter } from '../utils/router.js';
import { calculateLevel, formatDate, initScrollReveal } from '../utils/helpers.js';

// Module-level state variables
let currentUser = null;
let currentLoadedUid = null;
let currentCategory = 'all';
let userAssessment = null;
let recommendedChallengeId = null;
let canvasAnimationId = null;
const particles = [];
const burstParticles = [];

// Module-level DOM references
let activeChallengeHeaderTitle = null;
let activeChallengeHeaderDesc = null;
let activeIdleView = null;
let activeProgressSection = null;
let activeChallengeSaving = null;
let activeChallengeXp = null;
let activeChallengeProgressFill = null;
let activeChallengeProgressLabel = null;
let activeChallengeProgressPct = null;
let activeLogProgressBtn = null;

let userLevelBadge = null;
let levelProgressFill = null;
let levelProgressLabel = null;
let levelNextXpNeeded = null;

let statXpEarned = null;
let statCo2Saved = null;
let statChallengesCompleted = null;
let statActiveDays = null;

let challengesGrid = null;
let completedChallengesTitle = null;
let completedChallengesGrid = null;

/* --- COMPONENT & HELPER FUNCTIONS --- */

// Map user's weakest carbon assessment area to a challenge category key
function mapWeakestAreaToCategory(weakestArea) {
  if (!weakestArea) return 'energy';
  const normalized = weakestArea.toLowerCase();
  if (normalized.includes('transport')) return 'transport';
  if (normalized.includes('diet') || normalized.includes('food')) return 'diet';
  if (normalized.includes('energy') || normalized.includes('power')) return 'energy';
  if (normalized.includes('shopping') || normalized.includes('waste') || normalized.includes('consumption')) return 'shopping';
  return 'energy';
}

// Select recommended challenge from the user's weakest area
function findRecommendedChallenge(challenges, weakestCategory) {
  // Try to find an available challenge in the user's weakest category
  const available = challenges.filter(c => c.status === 'available');
  const matching = available.find(c => c.category === weakestCategory);
  if (matching) return matching.id || matching.challengeId;
  
  // Fallback: pick any available challenge
  if (available.length > 0) return available[0].id || available[0].challengeId;
  
  return null;
}

// Helper to get fallback XP if it is missing
function getChallengeXp(c) {
  if (typeof c.xp === 'number' && !isNaN(c.xp)) return c.xp;
  if (c.difficulty === 'Easy') return 50;
  if (c.difficulty === 'Medium') return 100;
  if (c.difficulty === 'Hard') return 200;
  return 50;
}

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

// Render active showcase panel / Weekly Mission Center
function renderActivePanel(activeChallenge) {
  if (!activeChallenge) {
    if (activeChallengeHeaderTitle) activeChallengeHeaderTitle.textContent = "🌍 Weekly Mission Center";
    if (activeChallengeHeaderDesc) {
      activeChallengeHeaderDesc.textContent = "Start a challenge, earn XP, unlock achievements, and reduce your carbon footprint.";
    }
    if (activeIdleView) activeIdleView.style.display = 'flex';
    if (activeProgressSection) activeProgressSection.style.display = 'none';
    return;
  }

  // Set header details
  if (activeChallengeHeaderTitle) activeChallengeHeaderTitle.textContent = activeChallenge.title;
  if (activeChallengeHeaderDesc) activeChallengeHeaderDesc.textContent = activeChallenge.description;
  if (activeChallengeSaving) activeChallengeSaving.textContent = `-${activeChallenge.co2Saving} kg`;
  if (activeChallengeXp) activeChallengeXp.textContent = `+${getChallengeXp(activeChallenge)} XP`;
  
  // Progress ratios
  const progress = activeChallenge.progress || 0;
  const duration = activeChallenge.durationDays || 1;
  const pct = Math.round((progress / duration) * 100);

  if (activeIdleView) activeIdleView.style.display = 'none';
  if (activeProgressSection) activeProgressSection.style.display = 'block';
  
  if (activeChallengeProgressFill) {
    activeChallengeProgressFill.style.width = '0%';
    setTimeout(() => {
      activeChallengeProgressFill.style.width = `${pct}%`;
    }, 200);
  }

  if (activeChallengeProgressLabel) {
    activeChallengeProgressLabel.textContent = `Progress: ${progress} / ${duration} ${duration === 1 ? 'Day' : 'Days'}`;
  }

  if (activeChallengeProgressPct) {
    animateValue(activeChallengeProgressPct, 0, pct, 800, 0, '%');
  }

  // Hook button progress logging
  if (activeLogProgressBtn) {
    activeLogProgressBtn.disabled = false;
    activeLogProgressBtn.onclick = async () => {
      activeLogProgressBtn.disabled = true;
      activeLogProgressBtn.textContent = "Logging...";
      try {
        const res = await logChallengeProgress(currentUser.uid, activeChallenge.id || activeChallenge.challengeId);
        
        if (res.completed) {
          // Play completion celebration
          triggerCompletionBurst();
          createFloatingXpPopup(`+${res.xpEarned} XP`, '38, 189, 248', 42); // cyan
          setTimeout(() => {
            createFloatingXpPopup(`+${res.challenge.co2Saving} kg CO₂`, '74, 222, 128', 58); // green
          }, 300);

          showToast(`🎉 Challenge Complete! +${res.xpEarned} XP, +${res.challenge.co2Saving}kg CO₂ Saved`, 'success');
          
          // Show toasts for unlocked badges
          if (res.newUnlocks && res.newUnlocks.length > 0) {
            res.newUnlocks.forEach(badge => {
              setTimeout(() => {
                showToast(`New Achievement Unlocked: ${badge.icon} ${badge.name}!`, 'success');
              }, 1200);
            });
          }

          // Reload data after delay
          setTimeout(async () => {
            await loadChallengesData(currentUser.uid);
          }, 2000);
        } else {
          showToast("Progress logged successfully! Keep it up!", "success");
          await loadChallengesData(currentUser.uid);
        }
      } catch (err) {
        console.error("Challenges: Error logging progress:", err);
        showToast("Failed to record progress.", "error");
        activeLogProgressBtn.disabled = false;
        activeLogProgressBtn.textContent = "Log Day's Progress";
      }
    };
  }
}

// Render challenges available and completed grids
function renderGrids(challenges) {
  if (!challengesGrid) return;
  challengesGrid.innerHTML = '';

  // Filter based on active tab category
  const filtered = challenges.filter(c => {
    if (currentCategory === 'all') return true;
    return c.category === currentCategory;
  });

  const available = filtered.filter(c => c.status === 'available' || c.status === 'active');
  const completed = filtered.filter(c => c.status === 'completed');

  // 1. Render Available
  if (available.length === 0) {
    challengesGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 32px 0;">
        <p class="text-muted" style="font-size: 0.95rem;">
          No available challenges in this category.
        </p>
      </div>
    `;
  } else {
    available.forEach(c => {
      const card = document.createElement('article');
      const isRecommended = (c.id || c.challengeId) === recommendedChallengeId;
      const difficultyClass = `diff-${c.difficulty.toLowerCase()}`;
      const statusClass = `status-${c.status}`;
      
      card.className = `challenge-card ${difficultyClass} ${statusClass} ${isRecommended ? 'recommended-card' : ''}`;
      
      let categoryLabel = c.category;
      if (c.category === 'transport') categoryLabel = '🚗 Transport';
      else if (c.category === 'diet') categoryLabel = '🍽️ Diet';
      else if (c.category === 'energy') categoryLabel = '⚡ Energy';
      else if (c.category === 'shopping') categoryLabel = '🛍️ Shopping & Waste';
      else if (c.category === 'community') categoryLabel = '👥 Community';

      const difficultyBadge = `<span class="difficulty-badge ${c.difficulty.toLowerCase()}">${c.difficulty}</span>`;
      const challengeXp = getChallengeXp(c);

      let actionMarkup = '';
      if (c.status === 'active') {
        actionMarkup = `
          <div class="card-action">
            <button class="btn btn-outline btn-card" id="card-log-btn-${c.id || c.challengeId}">Log Progress</button>
          </div>
        `;
      } else {
        actionMarkup = `
          <div class="card-action">
            <button class="btn btn-primary btn-card" id="card-activate-btn-${c.id || c.challengeId}">Start Challenge</button>
          </div>
        `;
      }

      const progress = c.progress || 0;
      const duration = c.durationDays || 1;
      const pct = Math.round((progress / duration) * 100);

      const recMessage = isRecommended 
        ? `<span class="recommendation-reason">Recommended based on your assessment results.</span>`
        : '';

      card.innerHTML = `
        <div class="card-meta">
          <span class="card-category">${categoryLabel}</span>
          ${difficultyBadge}
        </div>
        <h3 class="challenge-title">${c.title}</h3>
        ${recMessage}
        <p class="challenge-desc">${c.description}</p>
        
        <div class="challenge-stats">
          <div class="stat-box">
            <span class="stat-label">Estimated Impact</span>
            <span class="stat-value saving" style="${isRecommended ? 'font-size: 1.15rem; font-weight:800;' : ''}">-${c.co2Saving} kg CO₂</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Reward</span>
            <span class="stat-value xp">+${challengeXp} XP</span>
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-track" aria-hidden="true">
            <div class="progress-fill" style="width: ${pct}%"></div>
          </div>
          <div class="progress-labels">
            <span>Progress: ${progress}/${duration} Days</span>
            <span>${pct}%</span>
          </div>
        </div>

        ${actionMarkup}
      `;

      challengesGrid.appendChild(card);

      // Hooks
      if (c.status === 'available') {
        const actBtn = document.getElementById(`card-activate-btn-${c.id || c.challengeId}`);
        if (actBtn) {
          actBtn.addEventListener('click', async () => {
            actBtn.disabled = true;
            actBtn.textContent = 'Starting...';
            try {
              await activateChallenge(currentUser.uid, c.id || c.challengeId);
              showToast(`Challenge "${c.title}" is now active!`, 'success');
              await loadChallengesData(currentUser.uid);
            } catch (err) {
              console.error("Challenges: Error activating:", err);
              showToast("Failed to start challenge.", "error");
              actBtn.disabled = false;
              actBtn.textContent = 'Start Challenge';
            }
          });
        }
      } else if (c.status === 'active') {
        const logBtn = document.getElementById(`card-log-btn-${c.id || c.challengeId}`);
        if (logBtn) {
          logBtn.addEventListener('click', async () => {
            logBtn.disabled = true;
            logBtn.textContent = 'Logging...';
            try {
              const res = await logChallengeProgress(currentUser.uid, c.id || c.challengeId);
              if (res.completed) {
                triggerCompletionBurst();
                createFloatingXpPopup(`+${res.xpEarned} XP`, '38, 189, 248', 42); // cyan
                setTimeout(() => {
                  createFloatingXpPopup(`+${res.challenge.co2Saving} kg CO₂`, '74, 222, 128', 58); // green
                }, 300);

                showToast(`🎉 Challenge Complete! +${res.xpEarned} XP, +${res.challenge.co2Saving}kg CO₂ Saved`, 'success');
                
                if (res.newUnlocks && res.newUnlocks.length > 0) {
                  res.newUnlocks.forEach(badge => {
                    setTimeout(() => {
                      showToast(`New Achievement Unlocked: ${badge.icon} ${badge.name}!`, 'success');
                    }, 1200);
                  });
                }

                setTimeout(async () => {
                  await loadChallengesData(currentUser.uid);
                }, 2000);
              } else {
                showToast("Progress logged successfully!", "success");
                await loadChallengesData(currentUser.uid);
              }
            } catch (err) {
              console.error("Challenges: Error logging progress:", err);
              showToast("Failed to log progress.", "error");
              logBtn.disabled = false;
              logBtn.textContent = 'Log Progress';
            }
          });
        }
      }
    });
  }

  // 2. Render Completed
  if (completedChallengesTitle && completedChallengesGrid) {
    if (completed.length === 0) {
      completedChallengesTitle.style.display = 'none';
      completedChallengesGrid.style.display = 'none';
    } else {
      completedChallengesTitle.style.display = 'block';
      completedChallengesGrid.style.display = 'grid';
      completedChallengesGrid.innerHTML = '';

      completed.forEach(c => {
        const card = document.createElement('article');
        const difficultyClass = `diff-${c.difficulty.toLowerCase()}`;
        
        card.className = `challenge-card ${difficultyClass} status-completed`;
        
        let categoryLabel = c.category;
        if (c.category === 'transport') categoryLabel = '🚗 Transport';
        else if (c.category === 'diet') categoryLabel = '🍽️ Diet';
        else if (c.category === 'energy') categoryLabel = '⚡ Energy';
        else if (c.category === 'shopping') categoryLabel = '🛍️ Shopping & Waste';
        else if (c.category === 'community') categoryLabel = '👥 Community';

        const compDate = formatDate(c.completedAt) || 'Completed';
        const challengeXp = getChallengeXp(c);

        card.innerHTML = `
          <div class="card-meta">
            <span class="card-category">${categoryLabel}</span>
            <span class="completed-badge">✓ Completed</span>
          </div>
          <h3 class="challenge-title">${c.title}</h3>
          <span class="text-dim" style="font-size: 0.8rem; font-weight: 500;">Completed on ${compDate}</span>
          <p class="challenge-desc">${c.description}</p>
          
          <div class="challenge-stats">
            <div class="stat-box">
              <span class="stat-label">Total CO₂ Saved</span>
              <span class="stat-value saving">-${c.co2Saving} kg</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Reward Earned</span>
              <span class="stat-value xp">+${challengeXp} XP</span>
            </div>
          </div>
        `;

        completedChallengesGrid.appendChild(card);
      });
    }
  }
}

// Load challenges page statistics and render all segments
async function loadChallengesData(uid) {
  const [profile, assessment, challenges, streaks] = await Promise.all([
    getUserProfile(uid),
    getAssessment(uid),
    getChallenges(uid),
    getStreaks(uid)
  ]);

  if (uid !== currentLoadedUid) {
    console.warn("Challenges: Stale data load discarded.");
    return;
  }

  // 1. Render Level System Card & Statistics Summary
  if (profile) {
    const xp = profile.totalXpEarned || profile.xp || 0;
    const co2 = profile.totalCo2Saved || 0;
    const count = profile.totalChallengesCompleted || 0;
    const activeDays = streaks.current || 0;

    // Calculate level details
    const lvlData = calculateLevel(xp);
    if (userLevelBadge) userLevelBadge.textContent = `Lvl ${lvlData.level} - ${lvlData.name}`;
    
    if (levelProgressFill) {
      levelProgressFill.style.width = '0%';
      setTimeout(() => {
        levelProgressFill.style.width = `${lvlData.progress}%`;
      }, 200);
    }

    if (levelProgressLabel) {
      levelProgressLabel.textContent = `${xp} / ${lvlData.maxXp === Infinity ? 'Max' : lvlData.maxXp} XP`;
    }

    if (levelNextXpNeeded) {
      levelNextXpNeeded.textContent = lvlData.nextText;
    }

    animateValue(statXpEarned, 0, xp, 1000, 0, ' XP');
    animateValue(statCo2Saved, 0, co2, 1000, 1, ' kg');
    animateValue(statChallengesCompleted, 0, count, 1000);
    animateValue(statActiveDays, 0, activeDays, 1000, 0, activeDays !== 1 ? ' Days' : ' Day');
  }

  // 2. Identify Recommended Challenge
  if (assessment) {
    userAssessment = assessment;
    const weakestCat = mapWeakestAreaToCategory(assessment.weakestArea);
    recommendedChallengeId = findRecommendedChallenge(challenges, weakestCat);
  } else {
    recommendedChallengeId = findRecommendedChallenge(challenges, 'energy');
  }

  // 3. Render Active Challenge Showcase Panel
  const activeChallenge = challenges.find(c => c.status === 'active');
  renderActivePanel(activeChallenge);

  // 4. Render Available and Completed Grid lists
  renderGrids(challenges);

  // Trigger scroll reveal
  initScrollReveal();
}

// Create floating popup text popup celebration
function createFloatingXpPopup(text, rgbColor, leftPct) {
  const popup = document.createElement('div');
  popup.className = 'floating-xp-popup';
  popup.textContent = text;
  
  if (rgbColor) {
    popup.style.color = `rgb(${rgbColor})`;
    popup.style.textShadow = `0 0 10px rgba(${rgbColor}, 0.6), 0 0 25px rgba(${rgbColor}, 0.3)`;
  }
  
  popup.style.left = `${leftPct}%`;
  popup.style.top = `${window.innerHeight / 2 - 20}px`;
  
  document.body.appendChild(popup);
  
  setTimeout(() => {
    popup.remove();
  }, 1800);
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

  // Create background floating nodes
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

  // Add bokeh lights
  const glassParticleCount = 8;
  for (let i = 0; i < glassParticleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 20 + 12,
      speedY: -(Math.random() * 0.08 + 0.03),
      opacity: Math.random() * 0.02 + 0.01,
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
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.05)';
        ctx.shadowBlur = 10;
        p.x += p.driftX;
      } else {
        ctx.fillStyle = `rgba(74, 222, 128, ${p.opacity})`;
        ctx.shadowBlur = 0;
      }
      ctx.fill();

      p.y += p.speedY;

      if (p.y < -30) {
        p.y = canvas.height + 30;
        p.x = Math.random() * canvas.width;
      }
      if (p.x < -30) p.x = canvas.width + 30;
      if (p.x > canvas.width + 30) p.x = -30;
    });

    ctx.shadowBlur = 0;

    // 2. Draw active completion burst particles
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
      
      if (bp.opacity <= 0) {
        burstParticles.splice(i, 1);
      }
    }

    canvasAnimationId = requestAnimationFrame(animate);
  }
  
  animate();
}

// Particle explosion centered on the screen upon completing a challenge
function triggerCompletionBurst() {
  const count = 60;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    const isCyan = Math.random() > 0.5;
    
    burstParticles.push({
      x: centerX + window.scrollX,
      y: centerY + window.scrollY,
      r: Math.random() * 4.5 + 2.0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: isCyan ? '56, 189, 248' : '74, 222, 128',
      opacity: Math.random() * 0.6 + 0.4
    });
  }
}

/* --- BOOTSTRAP EVENT LISTENERS --- */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize router guards & navbar
  initRouter();
  initNavbar('challenges');

  // DOM references
  activeChallengeHeaderTitle = document.getElementById('active-challenge-header-title');
  activeChallengeHeaderDesc = document.getElementById('active-challenge-header-desc');
  activeIdleView = document.getElementById('active-idle-view');
  activeProgressSection = document.getElementById('active-progress-section');
  activeChallengeSaving = document.getElementById('active-challenge-saving');
  activeChallengeXp = document.getElementById('active-challenge-xp');
  activeChallengeProgressFill = document.getElementById('active-challenge-progress-fill');
  activeChallengeProgressLabel = document.getElementById('active-challenge-progress-label');
  activeChallengeProgressPct = document.getElementById('active-challenge-progress-pct');
  activeLogProgressBtn = document.getElementById('active-log-progress-btn');

  userLevelBadge = document.getElementById('user-level-badge');
  levelProgressFill = document.getElementById('level-progress-fill');
  levelProgressLabel = document.getElementById('level-progress-label');
  levelNextXpNeeded = document.getElementById('level-next-xp-needed');

  statXpEarned = document.getElementById('stat-xp-earned');
  statCo2Saved = document.getElementById('stat-co2-saved');
  statChallengesCompleted = document.getElementById('stat-challenges-completed');
  statActiveDays = document.getElementById('stat-active-days');
  
  challengesGrid = document.getElementById('challenges-core');
  completedChallengesTitle = document.getElementById('completed-challenges-title');
  completedChallengesGrid = document.getElementById('challenges-completed-core');

  // Init reactive mouse glow & particles background
  initMouseReactiveGlow();
  initParticlesBackground();

  // Category tab filters click listeners
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.category;
      
      // Load current challenges list
      observeAuthState(async (user) => {
        if (user) {
          const list = await getChallenges(user.uid);
          renderGrids(list);
        }
      });
    });
  });

  // Auth observer
  observeAuthState(async (user) => {
    if (!user) return;
    currentUser = user;
    currentLoadedUid = user.uid;

    try {
      await loadChallengesData(user.uid);
    } catch (e) {
      console.error("Challenges: Error loading parameters:", e);
      showToast("Error updating challenges list.", "error");

      const showcase = document.querySelector('.active-showcase-panel');
      const tabs = document.querySelector('.filter-tabs');
      const availTitle = document.getElementById('available-challenges-title');
      const core = document.getElementById('challenges-core');
      const compTitle = document.getElementById('completed-challenges-title');
      const compCore = document.getElementById('challenges-completed-core');

      if (showcase) showcase.style.display = 'none';
      if (tabs) tabs.style.display = 'none';
      if (availTitle) availTitle.style.display = 'none';
      if (core) core.style.display = 'none';
      if (compTitle) compTitle.style.display = 'none';
      if (compCore) compCore.style.display = 'none';

      const container = document.querySelector('.challenges-container');
      if (container) {
        const oldAlert = container.querySelector('.alert-card');
        if (oldAlert) oldAlert.remove();

        const alertCard = document.createElement('div');
        alertCard.className = 'alert-card animate-slide-up';
        alertCard.innerHTML = `
          <div class="alert-icon" aria-hidden="true">⚠️</div>
          <h2 class="alert-title">Failed to load Challenges</h2>
          <p class="alert-desc">We couldn't retrieve your challenge options from the database. Please check your network connection and try again.</p>
          <button class="btn btn-secondary retry-btn">Retry</button>
        `;
        alertCard.querySelector('.retry-btn').addEventListener('click', () => window.location.reload());
        container.appendChild(alertCard);
      }

      document.body.style.visibility = 'visible';
    }
  });
});
