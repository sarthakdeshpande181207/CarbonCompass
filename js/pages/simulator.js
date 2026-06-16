import { observeAuthState } from '../firebase/auth.js';
import { getAssessment, saveLatestSimulation, getLatestSimulation, getChallenges } from '../firebase/firestore.js';
import { activateChallenge } from '../services/challengeService.js';
import { checkAndUnlockBadges } from '../services/badgeService.js';
import { calculateCarbonFootprint } from '../services/carbonCalculator.js';
import { initNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { initRouter } from '../utils/router.js';
import { DEFAULT_CHALLENGES } from '../utils/constants.js';
import { initScrollReveal } from '../utils/helpers.js';

// Category mapping helper
const CATEGORY_MAP = {
  transport: { id: 't1', sliderId: 'slider-transport', readoutId: 'readout-transport', baselineId: 'baseline-transport', savingsId: 'savings-transport', maxCo2: 10.0 },
  diet: { id: 'd1', sliderId: 'slider-diet', readoutId: 'readout-diet', baselineId: 'baseline-diet', savingsId: 'savings-diet', maxCo2: 9.0 },
  energy: { id: 'e2', sliderId: 'slider-energy', readoutId: 'readout-energy', baselineId: 'baseline-energy', savingsId: 'savings-energy', maxCo2: 9.5 },
  shopping: { id: 's1', sliderId: 'slider-shopping', readoutId: 'readout-shopping', baselineId: 'baseline-shopping', savingsId: 'savings-shopping', maxCo2: 8.0 },
  travel: { id: 'v2', sliderId: 'slider-travel', readoutId: 'readout-travel', baselineId: 'baseline-travel', savingsId: 'savings-travel', maxCo2: 12.0 }
};

// Text option labels to display on sliders
const SLIDER_TEXTS = {
  transport: [
    'Walking, Cycling, or Micro-mobility',
    'Public Transit (Bus/Train)',
    'Electric Vehicle (EV)',
    'Hybrid Vehicle',
    'Gasoline/Diesel Car (Alone)'
  ],
  diet: [
    'Fully Vegan',
    'Vegetarian or Pescatarian',
    'Low-meat / Flexitarian',
    'Average Meat Consumer',
    'Heavy Meat Consumer'
  ],
  energy: [
    '100% Renewable Plan or Solar',
    'Partial Renewal (50%)',
    'Standard Utility Grid Mix',
    'Unsure / Standard Mix'
  ],
  shopping: [
    'Rarely Buy New (Second-hand)',
    'Occasionally Buy New',
    'Monthly Updates',
    'Weekly online shopping'
  ],
  travel: [
    '0 Flights',
    '1 flight',
    '2 - 3 flights',
    '4 or more flights'
  ]
};

// Preset Scenario values
const PRESETS = {
  starter: { transport: 3, diet: 2, energy: 1, shopping: 1, travel: 2 }, // hybrid, flexi, 50% renewable, monthly, 2-3 flights
  commuter: { transport: 4, travel: 3 }, // walking/cycling, 0 flights (diet/energy/shopping remain baseline)
  diet: { diet: 4, shopping: 2 }, // vegan, occasionally buy new
  netzero: { transport: 4, diet: 4, energy: 2, shopping: 3, travel: 3 } // walking, vegan, 100% renewable, rarely, 0 flights
};

// Module variables
let currentUser = null;
let baselineAssessment = null;
let currentAnswers = {};
let simulatedAnswers = {};

let particles = [];
let burstParticles = [];
let canvasAnimationId = null;

// DOM references
let onboardingPanel = null;
let activeLayout = null;
let currentScoreNum = null;
let projectedScoreNum = null;
let simulatedScoreVal = null;
let simulatedScoreFill = null;
let simulatedPersonaEmoji = null;
let simulatedPersonaName = null;
let commitPledgeBtn = null;
let commitTotalSavings = null;
let badgeAlertBox = null;
let historyBox = null;
let historySavedCo2 = null;
let historySavedTrees = null;
let recChallengeContainer = null;

// Sliders and readouts cache
const sliders = {};
const readouts = {};
const baselines = {};
const savingsIndicators = {};

/* --- ANIMATION HELPERS --- */

function animateValue(element, start, end, duration, decimals = 0, suffix = '') {
  if (!element) return;
  let startTimestamp = null;
  const startNum = parseFloat(start) || 0;
  const endNum = parseFloat(end) || 0;

  function step(timestamp) {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const ease = progress * (2 - progress); // outQuad
    const currentVal = ease * (endNum - startNum) + startNum;
    element.textContent = currentVal.toFixed(decimals) + suffix;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = endNum.toFixed(decimals) + suffix;
    }
  }
  window.requestAnimationFrame(step);
}

/* --- CANVAS CELEBRATION EFFECTS --- */

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

  // Background floating nodes (80% emerald, 20% gold)
  const maxBgParticles = Math.min(30, Math.floor(window.innerWidth / 40));
  for (let i = 0; i < maxBgParticles; i++) {
    const isGold = Math.random() < 0.2;
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      speedY: -(Math.random() * 0.3 + 0.1),
      opacity: (Math.random() * 0.10 + 0.02) * 0.8,
      isGlass: false,
      color: isGold ? '251, 191, 36' : '74, 222, 128'
    });
  }

  // Bokeh lights
  const glassParticleCount = 8;
  for (let i = 0; i < glassParticleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 20 + 12,
      speedY: -(Math.random() * 0.08 + 0.03),
      opacity: (Math.random() * 0.02 + 0.01) * 0.8,
      isGlass: true,
      driftX: Math.sin(Math.random() * Math.PI) * 0.1
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connection lines (reduced intensity by 20%)
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        if (p1.isGlass || p2.isGlass) continue;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          const lineAlpha = (1 - dist / 100) * 0.096;
          ctx.strokeStyle = `rgba(16, 185, 129, ${lineAlpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // 1. Draw floating nodes
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      
      if (p.isGlass) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.05)';
        ctx.shadowBlur = 10;
        p.x += p.driftX;
      } else {
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
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

    // 2. Draw burst celebration particles
    for (let i = burstParticles.length - 1; i >= 0; i--) {
      const bp = burstParticles[i];
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${bp.color}, ${bp.opacity})`;
      ctx.fill();

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

function triggerCommitCelebration() {
  const count = 75;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 7 + 2.5;
    const isGold = Math.random() < 0.2;
    
    burstParticles.push({
      x: centerX + window.scrollX,
      y: centerY + window.scrollY,
      r: Math.random() * 5.0 + 2.0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: isGold ? '251, 191, 36' : '74, 222, 128',
      opacity: Math.random() * 0.7 + 0.3
    });
  }
}

function initMouseReactiveGlow() {
  const cursorGlow = document.getElementById('cursor-glow');
  if (!cursorGlow) return;

  document.addEventListener('mousemove', (e) => {
    cursorGlow.style.setProperty('--mouse-x', `${e.clientX}px`);
    cursorGlow.style.setProperty('--mouse-y', `${e.clientY}px`);
  });
}

/* --- MATH & SIMULATION ENGINE --- */

// Slider positions translate to Assessment Question Indexes
function translateSliderToOptionIndex(category, value) {
  const parsed = parseInt(value, 10);
  switch (category) {
    case 'transport':
      // 0: Gasoline (4), 1: Hybrid (3), 2: EV (2), 3: Public Transit (1), 4: Walking/Cycling (0)
      return 4 - parsed;
    case 'diet':
      // 0: Heavy meat (4), 1: Average meat (3), 2: Flexitarian (2), 3: Vegetarian (1), 4: Fully Vegan (0)
      return 4 - parsed;
    case 'energy':
      // 0: Standard Mix (2), 1: Partial 50% (1), 2: 100% Renewable (0)
      if (parsed === 0) return 2; // maps to standard mix
      if (parsed === 1) return 1; // maps to partial 50%
      if (parsed === 2) return 0; // maps to 100% renewable
      return 2;
    case 'shopping':
      // 0: Weekly (3), 1: Monthly (2), 2: Occasionally (1), 3: Rarely (0)
      return 3 - parsed;
    case 'travel':
      // 0: 4+ flights (3), 1: 2-3 flights (2), 2: 1 flight (1), 3: 0 flights (0)
      return 3 - parsed;
    default:
      return 0;
  }
}

// Option Indexes translate back to Slider Values
function translateOptionIndexToSlider(category, index) {
  const idx = parseInt(index, 10);
  switch (category) {
    case 'transport':
      return 4 - idx;
    case 'diet':
      return 4 - idx;
    case 'energy':
      if (idx === 0) return 2; // 100% renewable
      if (idx === 1) return 1; // partial 50%
      return 0; // standard grid / unsure
    case 'shopping':
      return 3 - idx;
    case 'travel':
      return 3 - idx;
    default:
      return 0;
  }
}

// Perform real-time simulation updates
function calculateSimulation() {
  // 1. Gather all slider values and construct simulated answers
  Object.keys(CATEGORY_MAP).forEach(cat => {
    const config = CATEGORY_MAP[cat];
    const sliderVal = sliders[cat].value;
    const optionIdx = translateSliderToOptionIndex(cat, sliderVal);
    simulatedAnswers[config.id] = optionIdx;
    
    // Update Slider text readout labels
    readouts[cat].textContent = SLIDER_TEXTS[cat][sliderVal];
  });

  // 2. Compute simulated metrics
  const simReport = calculateCarbonFootprint(simulatedAnswers);
  const baseReport = calculateCarbonFootprint(currentAnswers);

  // 3. Render Projected Score
  const projectedScore = simReport.planetHealthScore;
  const currentScore = baseReport.planetHealthScore;

  // Animate hero score boxes
  animateValue(projectedScoreNum, projectedScoreNum.textContent, projectedScore, 400);

  // Update circular projection gauge
  if (simulatedScoreVal) {
    animateValue(simulatedScoreVal, simulatedScoreVal.textContent, projectedScore, 400);
  }
  
  const circumference = 439.82;
  const offset = circumference - (circumference * projectedScore) / 100;
  if (simulatedScoreFill) {
    simulatedScoreFill.style.strokeDashoffset = offset;
  }

  // Update simulated Persona pill
  if (simulatedPersonaEmoji) simulatedPersonaEmoji.textContent = simReport.persona.emoji;
  if (simulatedPersonaName) simulatedPersonaName.textContent = simReport.persona.name;

  // 4. Compute emission savings & category chart updates
  let totalCurrentCo2 = 0;
  let totalSimulatedCo2 = 0;
  let maxSavingsCategory = '';
  let maxCategorySavingsTons = 0;

  Object.keys(CATEGORY_MAP).forEach(cat => {
    const config = CATEGORY_MAP[cat];
    const currCo2 = baseReport.carbonBreakdown[cat] || 0;
    const simCo2 = simReport.carbonBreakdown[cat] || 0;
    
    totalCurrentCo2 += currCo2;
    totalSimulatedCo2 += simCo2;

    const delta = currCo2 - simCo2;
    
    // Track category with largest simulated improvement
    if (delta > maxCategorySavingsTons) {
      maxCategorySavingsTons = delta;
      maxSavingsCategory = cat;
    }

    // Update Slider savings indicator footers
    if (delta > 0.05) {
      savingsIndicators[cat].textContent = `Saves: ${(delta * 1000).toFixed(0)} kg CO₂/yr`;
      savingsIndicators[cat].classList.add('active');
    } else {
      savingsIndicators[cat].classList.remove('active');
    }

    // Update category comparison charts values
    const currChartVal = document.getElementById(`chart-curr-${cat}`);
    const simChartVal = document.getElementById(`chart-sim-${cat}`);
    if (currChartVal) currChartVal.textContent = currCo2.toFixed(1);
    if (simChartVal) simChartVal.textContent = simCo2.toFixed(1);

    // Update bar widths
    const currBar = document.getElementById(`bar-curr-${cat}`);
    const simBar = document.getElementById(`bar-sim-${cat}`);
    const maxVal = config.maxCo2;

    if (currBar) currBar.style.width = `${Math.min(100, (currCo2 / maxVal) * 100)}%`;
    if (simBar) simBar.style.width = `${Math.min(100, (simCo2 / maxVal) * 100)}%`;
  });

  // Calculate Net savings
  const savingsTons = Math.max(0, totalCurrentCo2 - totalSimulatedCo2);
  const savingsKg = savingsTons * 1000;

  // Animate commit details savings indicator
  animateValue(commitTotalSavings, parseFloat(commitTotalSavings.textContent) || 0, savingsTons, 400, 1, ' tons');

  // 5. Update Equivalency widgets
  const treesSaved = Math.round(savingsKg / 22);
  const carsRemoved = savingsKg / 4600;
  
  // Estimate energy saved based on home energy category CO2 savings
  const energySavingsKg = Math.max(0, (baseReport.carbonBreakdown.energy || 0) - (simReport.carbonBreakdown.energy || 0)) * 1000;
  const energyKwhSaved = Math.round(energySavingsKg / 0.38);

  const treesWidget = document.getElementById('equiv-trees');
  const carsWidget = document.getElementById('equiv-cars');
  const energyWidget = document.getElementById('equiv-energy');

  animateValue(treesWidget, parseFloat(treesWidget.textContent) || 0, treesSaved, 400);
  animateValue(carsWidget, parseFloat(carsWidget.textContent) || 0, carsRemoved, 400, 1);
  animateValue(energyWidget, parseFloat(energyWidget.textContent) || 0, energyKwhSaved, 400, 0, ' kWh');

  // 6. Recommended Next Mission suggestion
  renderRecommendedChallenge(maxSavingsCategory);

  // 7. Badge unlock threshold indicator (projected score improves by >=15 OR annual reduction >1000kg)
  const scoreImprovement = projectedScore - currentScore;
  const eligibleForBadge = scoreImprovement >= 15 || savingsKg > 1000;

  if (eligibleForBadge && savingsKg > 1) {
    badgeAlertBox.style.display = 'flex';
  } else {
    badgeAlertBox.style.display = 'none';
  }

  // 8. Commit button status
  if (savingsKg > 5) {
    commitPledgeBtn.disabled = false;
  } else {
    commitPledgeBtn.disabled = true;
  }
}

// Select recommended challenge matching the category with the biggest simulated improvement
function renderRecommendedChallenge(category) {
  if (!recChallengeContainer) return;

  if (!category) {
    recChallengeContainer.innerHTML = `
      <div class="recommended-card-inner">
        <div class="rec-icon">🧭</div>
        <div class="rec-details">
          <h3 class="rec-title">No optimization selected</h3>
          <p class="rec-desc">Drag sliders to reduce your simulated carbon emissions and discover challenge recommendations.</p>
        </div>
      </div>
    `;
    return;
  }

  // Map category to standard weekly challenge
  let challengeId = 'challenge_carpool'; // default
  if (category === 'diet') challengeId = 'challenge_veggie';
  else if (category === 'energy') challengeId = 'challenge_unplug';
  else if (category === 'shopping') challengeId = 'challenge_thrift';
  else if (category === 'travel') challengeId = 'challenge_carpool'; // transport fallback

  const challenge = DEFAULT_CHALLENGES.find(c => c.id === challengeId);
  if (!challenge) return;

  recChallengeContainer.innerHTML = `
    <div class="recommended-card-inner" id="rec-challenge-inner-card" data-challenge-id="${challenge.id}">
      <div class="rec-icon">${category === 'diet' ? '🍽️' : category === 'energy' ? '⚡' : category === 'shopping' ? '🛍️' : '🚗'}</div>
      <div class="rec-details">
        <h3 class="rec-title">${challenge.title}</h3>
        <p class="rec-desc">${challenge.description}</p>
        <div class="rec-action-row">
          <span class="rec-xp">+${challenge.xp} XP</span>
          <button class="rec-btn" id="rec-activate-challenge-btn">
            Accept Mission <span>&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach button click
  const acceptBtn = document.getElementById('rec-activate-challenge-btn');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', async () => {
      acceptBtn.disabled = true;
      acceptBtn.textContent = 'Activating...';
      try {
        await activateChallenge(currentUser.uid, challenge.id);
        showToast(`🎯 Weekly Mission Active: ${challenge.title}!`, 'success');
        setTimeout(() => {
          window.location.href = '/challenges';
        }, 1200);
      } catch (err) {
        console.error("Simulator: Error activating recommended challenge:", err);
        showToast("Failed to activate challenge.", "error");
        acceptBtn.disabled = false;
        acceptBtn.textContent = 'Accept Mission';
      }
    });
  }
}

// Load dynamic simulation history
async function loadSimulationHistory(uid) {
  try {
    const history = await getLatestSimulation(uid);
    if (history) {
      if (historySavedCo2) historySavedCo2.textContent = parseFloat(history.savedTons).toFixed(1);
      if (historySavedTrees) historySavedTrees.textContent = history.equivTrees;
      historyBox.style.display = 'flex';
    } else {
      historyBox.style.display = 'none';
    }
  } catch (err) {
    console.error("Simulator: Error fetching simulation history:", err);
  }
}

/* --- BOOTSTRAP SYSTEM --- */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Routing Guards and Navbar
  initRouter();
  initNavbar('simulator');

  // DOM Elements
  onboardingPanel = document.getElementById('onboarding-panel');
  activeLayout = document.getElementById('active-simulator-layout');
  currentScoreNum = document.getElementById('current-score-num');
  projectedScoreNum = document.getElementById('projected-score-num');
  simulatedScoreVal = document.getElementById('simulated-score-val');
  simulatedScoreFill = document.getElementById('simulated-score-fill');
  simulatedPersonaEmoji = document.getElementById('simulated-persona-emoji');
  simulatedPersonaName = document.getElementById('simulated-persona-name');
  commitPledgeBtn = document.getElementById('commit-pledge-btn');
  commitTotalSavings = document.getElementById('commit-total-savings');
  badgeAlertBox = document.getElementById('badge-lock-status-alert');
  historyBox = document.getElementById('simulated-history-box');
  historySavedCo2 = document.getElementById('history-saved-co2');
  historySavedTrees = document.getElementById('history-saved-trees');
  recChallengeContainer = document.getElementById('recommended-challenge-container');

  // Cache slider references
  Object.keys(CATEGORY_MAP).forEach(cat => {
    const config = CATEGORY_MAP[cat];
    sliders[cat] = document.getElementById(config.sliderId);
    readouts[cat] = document.getElementById(config.readoutId);
    baselines[cat] = document.getElementById(config.baselineId);
    savingsIndicators[cat] = document.getElementById(config.savingsId);

    // Slider inputs dragging updates
    if (sliders[cat]) {
      sliders[cat].addEventListener('input', () => {
        // Clear scenario button active classes since user made custom changes
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('active'));
        calculateSimulation();
      });
    }
  });

  // Recommended preset triggers
  const presets = document.querySelectorAll('.preset-btn');
  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      presets.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');

      const presetKey = btn.dataset.preset;
      const values = PRESETS[presetKey];

      Object.keys(values).forEach(cat => {
        if (sliders[cat]) {
          sliders[cat].value = values[cat];
        }
      });
      calculateSimulation();
    });
  });

  // Commit to Habit Action
  if (commitPledgeBtn) {
    commitPledgeBtn.addEventListener('click', async () => {
      commitPledgeBtn.disabled = true;
      commitPledgeBtn.textContent = 'Saving commitment...';

      try {
        const baseReport = calculateCarbonFootprint(currentAnswers);
        const simReport = calculateCarbonFootprint(simulatedAnswers);
        const currentScore = baseReport.planetHealthScore;
        const projectedScore = simReport.planetHealthScore;

        let totalCurrentCo2 = 0;
        let totalSimulatedCo2 = 0;
        let biggestImprovementCategory = '';
        let maxDeltaSavings = 0;

        Object.keys(CATEGORY_MAP).forEach(cat => {
          const curr = baseReport.carbonBreakdown[cat] || 0;
          const sim = simReport.carbonBreakdown[cat] || 0;
          totalCurrentCo2 += curr;
          totalSimulatedCo2 += sim;

          const delta = curr - sim;
          if (delta > maxDeltaSavings) {
            maxDeltaSavings = delta;
            biggestImprovementCategory = cat;
          }
        });

        const savingsTons = Math.max(0, totalCurrentCo2 - totalSimulatedCo2);
        const savingsKg = savingsTons * 1000;
        const equivTrees = Math.round(savingsKg / 22);

        // 1. Save committed simulation parameters
        const simulationData = {
          savedTons: savingsTons,
          equivTrees: equivTrees,
          scoreImprovement: projectedScore - currentScore,
          projectedScore: projectedScore
        };
        await saveLatestSimulation(currentUser.uid, simulationData);

        // 2. Automatically unlock the Carbon Shredder (Carbon Saver) badge on threshold criteria
        const scoreImprovement = projectedScore - currentScore;
        const qualifiesForBadge = scoreImprovement >= 15 || savingsKg > 1000;
        let unlockedBadge = false;

        if (qualifiesForBadge) {
          const unlocks = await checkAndUnlockBadges(currentUser.uid, 'simulator_commit');
          if (unlocks && unlocks.length > 0) {
            unlockedBadge = true;
          }
        }

        // 3. Play visual celebration full-screen particle burst
        triggerCommitCelebration();

        // 4. Activate corresponding weekly challenge for the biggest improvement category
        let challengeId = 'challenge_carpool';
        if (biggestImprovementCategory === 'diet') challengeId = 'challenge_veggie';
        else if (biggestImprovementCategory === 'energy') challengeId = 'challenge_unplug';
        else if (biggestImprovementCategory === 'shopping') challengeId = 'challenge_thrift';

        await activateChallenge(currentUser.uid, challengeId);

        // 5. Success feedback
        showToast("🎉 Sim commitment saved! Challenge activated.", "success");
        if (unlockedBadge) {
          setTimeout(() => {
            showToast("New Achievement Unlocked: ⚡ Carbon Saver!", "success");
          }, 1000);
        }

        // Refresh history Box layout
        await loadSimulationHistory(currentUser.uid);

        // Restore button state
        commitPledgeBtn.textContent = 'Commit to this Lifestyle Change';
        commitPledgeBtn.disabled = false;

        // Redirect user to challenges after a short delay
        setTimeout(() => {
          window.location.href = '/challenges';
        }, 2200);

      } catch (err) {
        console.error("Simulator: Error committing simulation:", err);
        showToast("Failed to save simulation.", "error");
        commitPledgeBtn.textContent = 'Commit to this Lifestyle Change';
        commitPledgeBtn.disabled = false;
      }
    });
  }

  // Init particles canvas and cursor tracking
  initParticlesBackground();
  initMouseReactiveGlow();

  // Load Auth observer
  observeAuthState(async (user) => {
    if (!user) return;
    currentUser = user;

    try {
      // 1. Fetch user's assessment
      const assessment = await getAssessment(user.uid);
      
      const pageLoader = document.getElementById('simulator-page-loader');
      if (pageLoader) pageLoader.style.display = 'none';

      if (!assessment || assessment.planetHealthScore === undefined) {
        // No assessment completed -> show onboarding empty state
        onboardingPanel.style.display = 'flex';
        activeLayout.style.display = 'none';
        document.body.style.visibility = 'visible';
        return;
      }

      // Hide onboarding card, show simulator layouts
      onboardingPanel.style.display = 'none';
      activeLayout.style.display = 'block';

      baselineAssessment = assessment;
      currentAnswers = assessment.answers || {};
      simulatedAnswers = { ...currentAnswers };

      // Initialize Current Score metrics
      const baseScore = assessment.planetHealthScore || 0;
      currentScoreNum.textContent = baseScore;
      projectedScoreNum.textContent = baseScore;

      // 2. Set default baseline answers as slider positions
      Object.keys(CATEGORY_MAP).forEach(cat => {
        const config = CATEGORY_MAP[cat];
        const baseOptionIdx = currentAnswers[config.id] !== undefined ? currentAnswers[config.id] : 0;
        
        // Translate Option index to slider value
        const initialSliderVal = translateOptionIndexToSlider(cat, baseOptionIdx);
        sliders[cat].value = initialSliderVal;

        // Render baseline values in footers
        baselines[cat].textContent = `Baseline: ${SLIDER_TEXTS[cat][initialSliderVal]}`;
      });

      // 3. Load latest simulation history
      await loadSimulationHistory(user.uid);

      // 4. Initial calculations sweep
      calculateSimulation();

      // Make page body visible
      initScrollReveal();
      document.body.style.visibility = 'visible';

    } catch (e) {
      console.error("Simulator: Error initializing page parameters:", e);
      showToast("Error loading page details.", "error");

      const pageLoader = document.getElementById('simulator-page-loader');
      if (pageLoader) pageLoader.style.display = 'none';
      if (onboardingPanel) onboardingPanel.style.display = 'none';
      if (activeLayout) activeLayout.style.display = 'none';

      const container = document.querySelector('.simulator-container');
      if (container) {
        const oldAlert = container.querySelector('.alert-card');
        if (oldAlert) oldAlert.remove();

        const alertCard = document.createElement('div');
        alertCard.className = 'alert-card animate-slide-up';
        alertCard.innerHTML = `
          <div class="alert-icon" aria-hidden="true">⚠️</div>
          <h2 class="alert-title">Failed to load Simulator</h2>
          <p class="alert-desc">We couldn't retrieve the simulator parameters. Please check your network connection and try again.</p>
          <button class="btn btn-secondary retry-btn">Retry</button>
        `;
        alertCard.querySelector('.retry-btn').addEventListener('click', () => window.location.reload());
        container.appendChild(alertCard);
      }

      document.body.style.visibility = 'visible';
    }
  });
});
