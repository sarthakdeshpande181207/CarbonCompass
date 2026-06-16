import { observeAuthState } from '../firebase/auth.js';
import { getAssessment, getChallenges, getBadges, getStreaks, getUserProfile, getLatestSimulation } from '../firebase/firestore.js';
import { initNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { initRouter } from '../utils/router.js';
import { BADGE_DEFS } from '../utils/constants.js';
import { initScrollReveal } from '../utils/helpers.js';

// Rarity ordering for achievement summary
const RARITY_SCORES = {
  Common: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4
};

// Module variables
let currentUser = null;
let particles = [];
let canvasAnimationId = null;

// DOM references
let onboardingPanel = null;
let lockedPreview = null;
let activeLayout = null;

let heroAvatarImg = null;
let heroDisplayName = null;
let heroEmail = null;
let heroSustainabilityRank = null;
let heroGlobalArchetype = null;

let profileProgressCircle = null;
let profileProgressText = null;

let xpCurrentLevel = null;
let xpNumericalReadout = null;
let xpProgressFill = null;

let identityScoreNum = null;
let identityArchetype = null;
let identityStrongest = null;
let identityWeakest = null;

let statCurrentStreak = null;
let statLongestStreak = null;
let statActiveChallenges = null;
let statCompletedChallenges = null;

let goalItemChallenge = null;
let goalChallengeTitle = null;
let goalChallengeText = null;
let goalChallengeFill = null;

let goalXpText = null;
let goalXpFill = null;

let goalBadgeName = null;
let goalBadgeDesc = null;
let goalBadgeFill = null;

let achUnlockedRatio = null;
let achCompletionPct = null;
let achRarestBadge = null;
let badgesGridContainer = null;

let legacyTotalCo2 = null;
let legacyTreesEquiv = null;
let legacyEcoImpact = null;
let legacyCommitments = null;
let legacyActiveDays = null;
let legacyAvgScore = null;
let legacySummaryText = null;

let timelineContainer = null;

let badgeModal = null;
let badgeModalClose = null;
let modalBadgeIcon = null;
let modalBadgeName = null;
let modalBadgeRarity = null;
let modalBadgeDesc = null;
let modalBadgeXpRewardBox = null;
let modalBadgeXpVal = null;
let modalBadgeProgressBox = null;
let modalBadgeProgressText = null;
let modalBadgeProgressFill = null;
let modalBadgeDateBox = null;
let modalBadgeDate = null;

/* --- LEVEL CALCULATOR --- */
// Level 1: 0 - 100 XP
// Level 2: 101 - 300 XP (Requires 200 XP)
// Level 3: 301 - 600 XP (Requires 300 XP)
// Level 4: 601 - 1000 XP (Requires 400 XP)
// Level 5+: 1001+ XP (Requires 500 XP per level)
function calculateLevel(xp) {
  let lvl = 1;
  let remXp = xp;
  let nextLvlXp = 100;

  while (remXp >= nextLvlXp) {
    remXp -= nextLvlXp;
    lvl += 1;
    nextLvlXp += 100;
  }
  return { level: lvl, levelXp: remXp, nextLevelXpNeeded: nextLvlXp };
}

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

    canvasAnimationId = requestAnimationFrame(animate);
  }
  animate();
}

function initMouseReactiveGlow() {
  const cursorGlow = document.getElementById('cursor-glow');
  if (!cursorGlow) return;

  document.addEventListener('mousemove', (e) => {
    cursorGlow.style.setProperty('--mouse-x', `${e.clientX}px`);
    cursorGlow.style.setProperty('--mouse-y', `${e.clientY}px`);
  });
}

/* --- RENDERING CONTROLLERS --- */

// Helper to map archetype to emoji
function getArchetypeEmoji(name) {
  if (!name) return '🧭';
  if (name.includes('Explorer')) return '🌱';
  if (name.includes('Commuter')) return '🌍';
  if (name.includes('Drifter')) return '⚡';
  if (name.includes('Heavyweight')) return '🚗';
  return '🧭';
}

// Render Profile Hero & XP Details
function renderHeroProgress(profile, assessment) {
  const displayName = profile.displayName || 'Eco Pioneer';
  const email = profile.email || 'No email registered';
  const avatarUrl = profile.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
  
  if (heroAvatarImg) heroAvatarImg.src = avatarUrl;
  if (heroDisplayName) heroDisplayName.textContent = displayName;
  if (heroEmail) heroEmail.textContent = email;

  // XP calculations
  const totalXp = profile.xp || 0;
  const { level, levelXp, nextLevelXpNeeded } = calculateLevel(totalXp);

  if (xpCurrentLevel) xpCurrentLevel.textContent = `Level ${level}`;
  if (xpNumericalReadout) xpNumericalReadout.textContent = `${levelXp} / ${nextLevelXpNeeded} XP`;

  // XP Progress Bar width sweep
  const xpPct = (levelXp / nextLevelXpNeeded) * 100;
  setTimeout(() => {
    if (xpProgressFill) xpProgressFill.style.width = `${xpPct}%`;
  }, 100);

  // Set Rank Badge and Animated Glow
  let rankText = '🌱 Eco Explorer';
  let rankClass = 'rank-explorer';

  if (level >= 4) {
    rankText = '♻️ Carbon Master';
    rankClass = 'rank-master';
  } else if (level === 3) {
    rankText = '🌳 Climate Guardian';
    rankClass = 'rank-guardian';
  } else if (level === 2) {
    rankText = '🌍 Conscious Commuter';
    rankClass = 'rank-commuter';
  }

  if (heroSustainabilityRank) {
    heroSustainabilityRank.textContent = rankText;
    heroSustainabilityRank.className = `rank-badge ${rankClass}`;
  }

  if (heroGlobalArchetype) {
    const archName = (assessment && assessment.persona && assessment.persona.name) || 'Eco Explorer';
    const emoji = getArchetypeEmoji(archName);
    heroGlobalArchetype.textContent = `${emoji} ${archName}`;
  }

  return { level, levelXp, nextLevelXpNeeded };
}

// Render Profile Completion Circle Gauge & Checklist
function renderProfileCompletion(assessment, challenges, badges, level, streaks) {
  const conds = {
    assess: !!(assessment && assessment.planetHealthScore !== undefined),
    challenge: Array.isArray(challenges) && challenges.some(c => c.status === 'completed'),
    badge: Array.isArray(badges) && badges.length > 0,
    level: level >= 2,
    streak: !!(streaks && streaks.current > 0)
  };

  let completedCount = 0;
  
  const toggleTick = (id, active) => {
    const el = document.getElementById(id);
    if (el) {
      if (active) el.classList.add('active');
      else el.classList.remove('active');
    }
  };

  if (conds.assess) { completedCount++; document.getElementById('chk-assess').className = 'done'; document.querySelector('#chk-assess .chk-icon').textContent = '✔'; toggleTick('tick-assess', true); }
  else { toggleTick('tick-assess', false); }

  if (conds.challenge) { completedCount++; document.getElementById('chk-challenge').className = 'done'; document.querySelector('#chk-challenge .chk-icon').textContent = '✔'; toggleTick('tick-challenge', true); }
  else { toggleTick('tick-challenge', false); }

  if (conds.badge) { completedCount++; document.getElementById('chk-badge').className = 'done'; document.querySelector('#chk-badge .chk-icon').textContent = '✔'; toggleTick('tick-badge', true); }
  else { toggleTick('tick-badge', false); }

  if (conds.level) { completedCount++; document.getElementById('chk-level').className = 'done'; document.querySelector('#chk-level .chk-icon').textContent = '✔'; toggleTick('tick-level', true); }
  else { toggleTick('tick-level', false); }

  if (conds.streak) { completedCount++; document.getElementById('chk-streak').className = 'done'; document.querySelector('#chk-streak .chk-icon').textContent = '✔'; toggleTick('tick-streak', true); }
  else { toggleTick('tick-streak', false); }

  const completionPct = Math.round((completedCount / 5) * 100);

  // Animate Gauge path
  setTimeout(() => {
    if (profileProgressCircle) {
      profileProgressCircle.setAttribute('stroke-dasharray', `${completionPct}, 100`);
    }
  }, 200);

  // Animate Gauge text
  animateValue(profileProgressText, 0, completionPct, 1000, 0, '%');
}

// Render Sustainability Identity Card
function renderIdentity(assessment) {
  const score = assessment.planetHealthScore || 0;
  const persona = assessment.persona || { name: 'Eco Explorer' };
  const strongest = assessment.strongestArea || 'Diet';
  const weakest = assessment.weakestArea || 'Transport';

  animateValue(identityScoreNum, 0, score, 1000);
  if (identityArchetype) identityArchetype.textContent = persona.name;
  if (identityStrongest) identityStrongest.textContent = strongest;
  if (identityWeakest) identityWeakest.textContent = weakest;
}

// Render Streak and Challenges Statistics counters
function renderStatsCounters(streaks, challenges) {
  const currentStreak = streaks.current || 0;
  const longestStreak = streaks.longest || 0;
  
  const activeCount = challenges.filter(c => c.status === 'active').length;
  const completedCount = challenges.filter(c => c.status === 'completed').length;

  animateValue(statCurrentStreak, 0, currentStreak, 800, 0, currentStreak === 1 ? ' Day' : ' Days');
  animateValue(statLongestStreak, 0, longestStreak, 800, 0, longestStreak === 1 ? ' Day' : ' Days');
  animateValue(statActiveChallenges, 0, activeCount, 800);
  animateValue(statCompletedChallenges, 0, completedCount, 800);
}

// Render Current Goals Card (Missions, Level ups, Badge goals)
function renderGoals(challenges, earnedBadges, levelXp, nextLevelXpNeeded) {
  // Goal 1: Active challenge progress
  const active = challenges.find(c => c.status === 'active');
  if (active) {
    const progress = active.progress || 0;
    const duration = active.durationDays || 1;
    const pct = (progress / duration) * 100;
    
    if (goalChallengeTitle) goalChallengeTitle.textContent = active.title;
    if (goalChallengeText) goalChallengeText.textContent = `${progress} / ${duration} Days`;
    if (goalChallengeFill) goalChallengeFill.style.width = `${pct}%`;
    if (goalItemChallenge) goalItemChallenge.style.display = 'flex';
  } else {
    if (goalItemChallenge) goalItemChallenge.style.display = 'none';
  }

  // Goal 2: XP to Next Level progress
  const xpLeft = nextLevelXpNeeded - levelXp;
  const xpPct = (levelXp / nextLevelXpNeeded) * 100;
  if (goalXpText) goalXpText.textContent = `${xpLeft} XP Left`;
  if (goalXpFill) goalXpFill.style.width = `${xpPct}%`;

  // Goal 3: Next Badge Progress
  const earnedIds = new Set(earnedBadges.map(b => b.badgeId));
  
  // Find first unearned badge in chronological order
  const chronologicalBadgeKeys = ['FIRST_STEPS', 'FIRST_CHALLENGE', 'STREAK_3', 'ECO_EXPLORER_BADGE', 'CARBON_SHREDDER'];
  let nextBadgeKey = 'CARBON_SHREDDER'; // fallback
  for (const key of chronologicalBadgeKeys) {
    const badgeDef = BADGE_DEFS[key];
    if (badgeDef && !earnedIds.has(badgeDef.id)) {
      nextBadgeKey = key;
      break;
    }
  }

  const nextDef = BADGE_DEFS[nextBadgeKey];
  if (nextDef) {
    if (goalBadgeName) goalBadgeName.textContent = nextDef.name;
    if (goalBadgeDesc) goalBadgeDesc.textContent = nextDef.requirementText;
    
    // Estimate badge progress width
    let badgePct = 0;
    if (nextBadgeKey === 'FIRST_STEPS') {
      badgePct = 0; // unassessed won't see this anyway
    } else if (nextBadgeKey === 'FIRST_CHALLENGE') {
      const completedCount = challenges.filter(c => c.status === 'completed').length;
      badgePct = completedCount > 0 ? 100 : 0;
    } else if (nextBadgeKey === 'STREAK_3') {
      const streaks = challenges.streaks || { current: 0 };
      badgePct = Math.min(100, ((streaks.current || 0) / 3) * 100);
    } else {
      badgePct = 0;
    }

    if (goalBadgeFill) goalBadgeFill.style.width = `${badgePct}%`;
  }
}

// XP reward values for standard badges
const BADGE_XP_REWARDS = {
  FIRST_STEPS: 100,
  FIRST_CHALLENGE: 100,
  STREAK_3: 150,
  ECO_EXPLORER_BADGE: 250,
  CARBON_SHREDDER: 200
};

// Render Achievements Showcase grid and details modals
function renderAchievements(earnedBadges, challenges, streaks, assessment, simulationLog) {
  if (!badgesGridContainer) return;
  badgesGridContainer.innerHTML = '';

  const earnedMap = new Map(earnedBadges.map(b => [b.badgeId, b]));

  // Standard badge definitions
  const badgeKeys = ['FIRST_STEPS', 'FIRST_CHALLENGE', 'STREAK_3', 'ECO_EXPLORER_BADGE', 'CARBON_SHREDDER'];
  const unlockedCount = earnedBadges.length;
  const totalCount = badgeKeys.length;
  const completionPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Unlocked summary ratios
  if (achUnlockedRatio) achUnlockedRatio.textContent = `${unlockedCount} / ${totalCount}`;
  if (achCompletionPct) achCompletionPct.textContent = `${completionPct}%`;

  // Find rarest badge earned
  let rarestBadge = 'None';
  let highestRarityScore = 0;

  // Render badges grid
  badgeKeys.forEach(key => {
    const def = BADGE_DEFS[key];
    if (!def) return;

    const earned = earnedMap.get(def.id);
    const isUnlocked = !!earned;
    const rarity = def.rarity || 'Common';
    
    // Check rarity score if earned
    if (isUnlocked) {
      const score = RARITY_SCORES[rarity] || 1;
      if (score > highestRarityScore) {
        highestRarityScore = score;
        rarestBadge = def.name;
      }
    }

    const badgeEl = document.createElement('div');
    // Set classes for unlocking state and rarity
    badgeEl.className = `badge-item ${isUnlocked ? 'unlocked' : 'locked'} rarity-${rarity.toLowerCase()}`;
    badgeEl.setAttribute('aria-label', `Badge: ${def.name}, Status: ${isUnlocked ? 'Unlocked' : 'Locked'}`);
    
    badgeEl.innerHTML = `
      <div class="badge-icon">${def.icon}</div>
      <span class="badge-name">${def.name}</span>
    `;

    // Click triggers modal popup details
    badgeEl.addEventListener('click', () => {
      // Set name, desc, icon, rarity
      if (modalBadgeIcon) modalBadgeIcon.textContent = def.icon;
      if (modalBadgeName) modalBadgeName.textContent = def.name;
      if (modalBadgeRarity) modalBadgeRarity.textContent = rarity;
      
      // XP Reward
      const xpVal = BADGE_XP_REWARDS[key] || 100;
      if (modalBadgeXpVal) modalBadgeXpVal.textContent = `+${xpVal} XP`;
      
      if (!isUnlocked) {
        // Locked display
        if (modalBadgeDesc) modalBadgeDesc.textContent = `Locked Achievement. Unlock criteria: ${def.requirementText}`;
        if (modalBadgeDateBox) modalBadgeDateBox.style.display = 'none';
        
        // Progress toward unlock calculation
        if (modalBadgeProgressBox) {
          modalBadgeProgressBox.style.display = 'flex';
          let current = 0;
          let target = 1;
          let unit = '';
          
          if (key === 'FIRST_STEPS') {
            current = 1;
            target = 1;
            unit = ' Completed';
          } else if (key === 'FIRST_CHALLENGE') {
            const completedCount = challenges ? challenges.filter(c => c.status === 'completed').length : 0;
            current = completedCount;
            target = 1;
            unit = ' Completed';
          } else if (key === 'STREAK_3') {
            current = (streaks && streaks.current) || 0;
            target = 3;
            unit = ' Days';
          } else if (key === 'ECO_EXPLORER_BADGE') {
            current = (assessment && assessment.planetHealthScore) || 0;
            target = 80;
            unit = ' Score';
          } else if (key === 'CARBON_SHREDDER') {
            current = simulationLog ? 1 : 0;
            target = 1;
            unit = ' Pledged';
          }
          
          if (modalBadgeProgressText) {
            modalBadgeProgressText.textContent = `${current} / ${target}${unit}`;
          }
          if (modalBadgeProgressFill) {
            const pct = Math.min(100, (current / target) * 100);
            modalBadgeProgressFill.style.width = `${pct}%`;
          }
        }
      } else {
        // Unlocked display
        if (modalBadgeDesc) modalBadgeDesc.textContent = def.description;
        if (modalBadgeProgressBox) modalBadgeProgressBox.style.display = 'none';
        
        // Show earned timestamp date formatted nicely
        if (modalBadgeDate) {
          const dateStr = earned.earnedAt ? new Date(earned.earnedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown';
          modalBadgeDate.textContent = dateStr;
        }
        if (modalBadgeDateBox) modalBadgeDateBox.style.display = 'flex';
      }
      
      // Open modal
      if (badgeModal) badgeModal.showModal();
    });

    badgesGridContainer.appendChild(badgeEl);
  });

  if (achRarestBadge) achRarestBadge.textContent = rarestBadge;
}

// Render Sustainability Legacy Card
function renderLegacy(profile, assessment, streaks, simulationLog) {
  const co2Saved = profile.totalCo2Saved || 0;
  const treesEquiv = Math.round(co2Saved / 22);
  const activeDays = (streaks && streaks.longest) || 0;
  const avgScore = (assessment && assessment.planetHealthScore) || 0;
  const commitmentsVal = profile.simulatorCommitments || (simulationLog ? 1 : 0);

  // Compute Eco Impact Rating
  let impactRating = 'Starting 🧭';
  if (co2Saved >= 500) impactRating = 'Elite 🌟';
  else if (co2Saved >= 200) impactRating = 'High 🌳';
  else if (co2Saved >= 50) impactRating = 'Moderate 🌱';

  // Animate stats values
  animateValue(document.getElementById('legacy-total-co2'), 0, co2Saved, 1000, 1, ' kg');
  animateValue(document.getElementById('legacy-trees-equiv'), 0, treesEquiv, 1000);
  animateValue(document.getElementById('legacy-active-days'), 0, activeDays, 1000);
  animateValue(document.getElementById('legacy-avg-score'), 0, avgScore, 1000);
  animateValue(document.getElementById('legacy-commitments'), 0, commitmentsVal, 1000);

  if (legacyEcoImpact) {
    legacyEcoImpact.textContent = impactRating;
  }

  // Summary impact text
  if (legacySummaryText) {
    legacySummaryText.innerHTML = `Your actions have already prevented approximately <strong>${co2Saved.toFixed(0)} kg</strong> of CO₂ emissions. Swapping solitary driving for transit, eating organic seasonal foods, and committing to simulator pledges are building a solid environmental legacy!`;
  }
}

// Render Journey timeline milestones
function renderJourneyTimeline(assessment, challenges, earnedBadges, simulationLog) {
  if (!timelineContainer) return;
  timelineContainer.innerHTML = '';

  const milestones = [];

  // 1. Assessment Milestone
  if (assessment && assessment.completedAt) {
    milestones.push({
      date: new Date(assessment.completedAt),
      icon: '📋',
      title: 'Carbon Footprint Assessed',
      desc: `Started Carbon Compass journey with a Planet Health Score of ${assessment.planetHealthScore}.`,
      accentClass: 'accent-assess'
    });
  }

  // 2. Challenge Completed Milestones
  const completedMissions = challenges.filter(c => c.status === 'completed');
  completedMissions.forEach((c, idx) => {
    if (c.completedAt) {
      milestones.push({
        date: new Date(c.completedAt),
        icon: '🎯',
        title: idx === 0 ? 'First Challenge Completed' : `Mission Completed: ${c.title}`,
        desc: `Completed challenge successfully, saving ${c.co2Saving} kg of CO₂ emissions.`,
        accentClass: 'accent-challenge'
      });
    }
  });

  // 3. Badges Milestones
  earnedBadges.forEach((b, idx) => {
    if (b.earnedAt) {
      milestones.push({
        date: new Date(b.earnedAt),
        icon: '🏆',
        title: idx === 0 ? 'First Badge Earned' : `Achievement: ${b.name}`,
        desc: `Unlocked badge: ${b.description}`,
        accentClass: 'accent-badge'
      });
    }
  });

  // 4. Level Milestone
  // If user completed a challenge or has XP, we can check level up milestones
  const xp = assessment.xp || 0;
  if (xp >= 100 && completedMissions.length > 0) {
    // Reached level 2 milestone
    const levelUpDate = completedMissions[0].completedAt ? new Date(completedMissions[0].completedAt) : new Date();
    milestones.push({
      date: levelUpDate,
      icon: '🌍',
      title: 'Level Up',
      desc: 'Achieved Level 2 rank progression, unlocking Conscious Commuter status.',
      accentClass: 'accent-level'
    });
  }

  // 5. Simulator Pledge Milestone
  if (simulationLog && simulationLog.committedAt) {
    milestones.push({
      date: new Date(simulationLog.committedAt),
      icon: '⚡',
      title: 'Carbon Saver Unlocked',
      desc: `Committed to a simulator plan, saving ${simulationLog.savedTons.toFixed(1)} tons of CO₂ annually.`,
      accentClass: 'accent-saver'
    });
  }

  // Sort milestones newest first
  milestones.sort((a, b) => b.date - a.date);

  if (milestones.length === 0) {
    timelineContainer.innerHTML = `<p class="text-muted" style="text-align: center; padding: 24px 0;">No milestones logged in your journey yet.</p>`;
    return;
  }

  milestones.forEach(m => {
    const itemEl = document.createElement('div');
    itemEl.className = `timeline-item ${m.accentClass || ''}`;
    
    const formattedDate = m.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    
    itemEl.innerHTML = `
      <div class="timeline-icon-node" aria-hidden="true">${m.icon}</div>
      <div class="timeline-content-bubble">
        <span class="timeline-date">${formattedDate}</span>
        <h3 class="timeline-title">${m.title}</h3>
        <p class="timeline-desc">${m.desc}</p>
      </div>
    `;

    timelineContainer.appendChild(itemEl);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize routes & navbar
  initRouter();
  initNavbar('profile');

  // DOM bindings
  onboardingPanel = document.getElementById('onboarding-panel');
  lockedPreview = document.getElementById('locked-profile-preview');
  activeLayout = document.getElementById('active-profile-layout');

  heroAvatarImg = document.getElementById('hero-avatar-img');
  heroDisplayName = document.getElementById('hero-display-name');
  heroEmail = document.getElementById('hero-email');
  heroSustainabilityRank = document.getElementById('hero-sustainability-rank');
  heroGlobalArchetype = document.getElementById('hero-global-archetype');

  profileProgressCircle = document.getElementById('profile-progress-circle');
  profileProgressText = document.getElementById('profile-progress-text');

  xpCurrentLevel = document.getElementById('xp-current-level');
  xpNumericalReadout = document.getElementById('xp-numerical-readout');
  xpProgressFill = document.getElementById('xp-progress-fill');

  identityScoreNum = document.getElementById('identity-score-num');
  identityArchetype = document.getElementById('identity-archetype-name');
  identityStrongest = document.getElementById('identity-strongest-category');
  identityWeakest = document.getElementById('identity-weakest-category');

  statCurrentStreak = document.getElementById('stat-current-streak');
  statLongestStreak = document.getElementById('stat-longest-streak');
  statActiveChallenges = document.getElementById('stat-active-challenges');
  statCompletedChallenges = document.getElementById('stat-completed-challenges');

  goalItemChallenge = document.getElementById('goal-item-challenge');
  goalChallengeTitle = document.getElementById('goal-challenge-title');
  goalChallengeText = document.getElementById('goal-challenge-text');
  goalChallengeFill = document.getElementById('goal-challenge-fill');

  goalXpText = document.getElementById('goal-xp-text');
  goalXpFill = document.getElementById('goal-xp-fill');

  goalBadgeName = document.getElementById('goal-badge-name');
  goalBadgeDesc = document.getElementById('goal-badge-desc');
  goalBadgeFill = document.getElementById('goal-badge-fill');

  achUnlockedRatio = document.getElementById('ach-unlocked-ratio');
  achCompletionPct = document.getElementById('ach-completion-pct');
  achRarestBadge = document.getElementById('ach-rarest-badge');
  badgesGridContainer = document.getElementById('badges-grid-container');

  legacyTotalCo2 = document.getElementById('legacy-total-co2');
  legacyTreesEquiv = document.getElementById('legacy-trees-equiv');
  legacyEcoImpact = document.getElementById('legacy-eco-impact');
  legacyCommitments = document.getElementById('legacy-commitments');
  legacyActiveDays = document.getElementById('legacy-active-days');
  legacyAvgScore = document.getElementById('legacy-avg-score');
  legacySummaryText = document.getElementById('legacy-summary-text');

  timelineContainer = document.getElementById('journey-timeline-container');

  badgeModal = document.getElementById('badge-modal');
  badgeModalClose = document.getElementById('badge-modal-close');
  modalBadgeIcon = document.getElementById('modal-badge-icon');
  modalBadgeName = document.getElementById('modal-badge-name');
  modalBadgeRarity = document.getElementById('modal-badge-rarity');
  modalBadgeDesc = document.getElementById('modal-badge-desc');
  modalBadgeXpRewardBox = document.getElementById('modal-badge-xp-reward-box');
  modalBadgeXpVal = document.getElementById('modal-badge-xp-val');
  modalBadgeProgressBox = document.getElementById('modal-badge-progress-box');
  modalBadgeProgressText = document.getElementById('modal-badge-progress-text');
  modalBadgeProgressFill = document.getElementById('modal-badge-progress-fill');
  modalBadgeDateBox = document.getElementById('modal-badge-date-box');
  modalBadgeDate = document.getElementById('modal-badge-date');

  // Close achievements dialog modal
  if (badgeModalClose && badgeModal) {
    badgeModalClose.addEventListener('click', () => {
      badgeModal.close();
    });

    // Close when clicking overlay backdrop
    badgeModal.addEventListener('click', (e) => {
      const rect = badgeModal.getBoundingClientRect();
      const isInModal = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!isInModal) {
        badgeModal.close();
      }
    });
  }

  // Init canvas particle background and cursor tracker
  initParticlesBackground();
  initMouseReactiveGlow();

  // Auth observer
  observeAuthState(async (user) => {
    if (!user) return;
    currentUser = user;

    try {
      // 1. Fetch user records
      const assessment = await getAssessment(user.uid);
      
      if (!assessment || assessment.planetHealthScore === undefined) {
        // No assessment completed -> show locked preview backdrop & onboarding panel
        const pageLoader = document.getElementById('profile-page-loader');
        if (pageLoader) pageLoader.style.display = 'none';
        onboardingPanel.style.display = 'flex';
        lockedPreview.style.display = 'block';
        activeLayout.style.display = 'none';
        document.body.style.visibility = 'visible';
        return;
      }

      // Hide onboarding card overlay, show active layout
      const pageLoader = document.getElementById('profile-page-loader');
      if (pageLoader) pageLoader.style.display = 'none';
      onboardingPanel.style.display = 'none';
      lockedPreview.style.display = 'none';
      activeLayout.style.display = 'block';

      // 2. Fetch remaining collections
      const challenges = await getChallenges(user.uid);
      const earnedBadges = await getBadges(user.uid);
      const streaks = await getStreaks(user.uid);
      const profile = await getUserProfile(user.uid) || {};
      const simulationLog = await getLatestSimulation(user.uid);

      // 3. Render Hero and level progress
      const { level, levelXp, nextLevelXpNeeded } = renderHeroProgress(profile, assessment);

      // 4. Render Profile Completion Checklist
      renderProfileCompletion(assessment, challenges, earnedBadges, level, streaks);

      // 5. Render Identity Details
      renderIdentity(assessment);

      // 6. Render Streak Statistics
      renderStatsCounters(streaks, challenges);

      // 7. Render Current Goals progress tracks
      renderGoals(challenges, earnedBadges, levelXp, nextLevelXpNeeded);

      // 8. Render Achievement badges grids
      renderAchievements(earnedBadges, challenges, streaks, assessment, simulationLog);

      // 9. Render Legacy summaries
      renderLegacy(profile, assessment, streaks, simulationLog);

      // 10. Render Journey timeline milestones feed
      renderJourneyTimeline(assessment, challenges, earnedBadges, simulationLog);

      // Show page body
      initScrollReveal();
      document.body.style.visibility = 'visible';

    } catch (err) {
      console.error("Profile: Error initializing page parameters:", err);
      showToast("Error loading profile details.", "error");

      const pageLoader = document.getElementById('profile-page-loader');
      if (pageLoader) pageLoader.style.display = 'none';
      if (onboardingPanel) onboardingPanel.style.display = 'none';
      if (lockedPreview) lockedPreview.style.display = 'none';
      if (activeLayout) activeLayout.style.display = 'none';

      const container = document.querySelector('.profile-container');
      if (container) {
        const oldAlert = container.querySelector('.alert-card');
        if (oldAlert) oldAlert.remove();

        const alertCard = document.createElement('div');
        alertCard.className = 'alert-card animate-slide-up';
        alertCard.innerHTML = `
          <div class="alert-icon" aria-hidden="true">⚠️</div>
          <h2 class="alert-title">Failed to load Profile</h2>
          <p class="alert-desc">We couldn't retrieve your profile data. Please check your network connection and try again.</p>
          <button class="btn btn-secondary retry-btn">Retry</button>
        `;
        alertCard.querySelector('.retry-btn').addEventListener('click', () => window.location.reload());
        container.appendChild(alertCard);
      }

      document.body.style.visibility = 'visible';
    }
  });
});
