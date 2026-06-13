import { observeAuthState } from '../firebase/auth.js';
import { getAssessment, getChallenges, getBadges, getStreaks, getUserProfile, getCoachSessions, saveCoachMessage } from '../firebase/firestore.js';
import { initNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { initRouter } from '../utils/router.js';
import { CoachService } from '../services/coachService.js';

// Bootstrapped state objects
let currentUser = null;
let currentLoadedUid = null;
const coachService = new CoachService();
let userContext = null;

// DOM References
let onboardingPanel = null;
let activeCoachLayout = null;

let snapScore = null;
let snapLevel = null;
let snapStreak = null;
let snapChallenge = null;
let snapBadges = null;

let memArchetype = null;
let memStrongest = null;
let memWeakest = null;
let memXp = null;

let insightOpportunity = null;
let insightBestHabit = null;
let insightRecommendedChallenge = null;

let chatLogBox = null;
let chatLoadingSkeleton = null;
let chatTypingIndicator = null;
let suggestedPromptsContainer = null;
let chatUserInput = null;
let chatSendBtn = null;

// Canvas Background state
const particles = [];
const burstParticles = [];
let canvasAnimationId = null;

/* --- COMPONENT HELPERS & ANIMATIONS --- */

// Helper to animate metric numbers
function animateValue(element, start, end, duration, suffix = '') {
  if (!element) return;
  let startTimestamp = null;
  
  function step(timestamp) {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const ease = progress * (2 - progress); // outQuad easing
    const currentVal = ease * (end - start) + start;
    element.textContent = Math.round(currentVal) + suffix;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      element.textContent = end + suffix;
    }
  }
  
  window.requestAnimationFrame(step);
}

// Triggers cursor reactive spotlight glow coords
function initMouseReactiveGlow() {
  const glow = document.getElementById('cursor-glow');
  if (!glow) return;
  
  window.addEventListener('mousemove', (e) => {
    glow.style.setProperty('--mouse-x', `${e.clientX}px`);
    glow.style.setProperty('--mouse-y', `${e.clientY}px`);
  });
}

// Canvas particles loop (identical to dashboard/challenges)
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
  
  // Seed particles
  const particleCount = 20;
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 1,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.4 + 0.1
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background floaters
    ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(74, 222, 128, ${p.opacity})`;
      ctx.fill();
      
      p.x += p.vx;
      p.y += p.vy;
      
      // Boundaries wrap
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    });

    // Draw burst/celebration particles
    for (let i = burstParticles.length - 1; i >= 0; i--) {
      const bp = burstParticles[i];
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${bp.color}, ${bp.opacity})`;
      ctx.fill();
      
      bp.x += bp.vx;
      bp.y += bp.vy;
      bp.opacity -= 0.012; // slow decay
      
      if (bp.opacity <= 0) {
        burstParticles.splice(i, 1);
      }
    }

    canvasAnimationId = requestAnimationFrame(animate);
  }
  
  animate();
}

// Particle explosion burst on achievements / milestone detection
function triggerExplosionAtElement(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const count = 35;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4.5 + 1.5;
    const isCyan = Math.random() > 0.5;
    
    burstParticles.push({
      x: centerX + window.scrollX,
      y: centerY + window.scrollY,
      r: Math.random() * 3.5 + 1.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: isCyan ? '56, 189, 248' : '74, 222, 128',
      opacity: Math.random() * 0.7 + 0.3
    });
  }
}

let buddyIdleInterval = null;

// Emits a tiny sparkle particle around the companion orb
function createSparkle(buddyEl) {
  const sparkle = document.createElement('span');
  sparkle.className = 'buddy-sparkle';
  sparkle.textContent = '✦';
  
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * 15 + 20; 
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  
  sparkle.style.setProperty('--x', `${x}px`);
  sparkle.style.setProperty('--y', `${y}px`);
  
  buddyEl.appendChild(sparkle);
  
  setTimeout(() => {
    sparkle.remove();
  }, 1200);
}

// Starts interval of random idle behaviors on companion
function startBuddyIdleBehaviors() {
  const buddy = document.getElementById('sage-buddy');
  const buddySpeech = document.getElementById('sage-buddy-speech');
  if (!buddy) return;

  if (buddyIdleInterval) clearInterval(buddyIdleInterval);

  buddyIdleInterval = setInterval(() => {
    if (buddy.classList.contains('typing') || buddy.classList.contains('greet')) return;

    const choice = Math.floor(Math.random() * 4);
    buddy.classList.remove('blink', 'tilt-left', 'tilt-right');

    if (choice === 0) {
      buddy.classList.add('blink');
      setTimeout(() => buddy.classList.remove('blink'), 1500);
    } else if (choice === 1) {
      buddy.classList.add('tilt-left');
      setTimeout(() => buddy.classList.remove('tilt-left'), 2000);
    } else if (choice === 2) {
      buddy.classList.add('tilt-right');
      setTimeout(() => buddy.classList.remove('tilt-right'), 2000);
    } else if (choice === 3) {
      createSparkle(buddy);
      const tips = [
        "Need a sustainability tip? 💡",
        "You're doing great! 🌟",
        "Ready for another challenge? 🎯",
        "Let's improve that score. 🌍"
      ];
      const tip = tips[Math.floor(Math.random() * tips.length)];
      if (buddySpeech) {
        buddySpeech.textContent = tip;
        buddySpeech.classList.add('show');
        setTimeout(() => {
          buddySpeech.classList.remove('show');
        }, 3500);
      }
    }
  }, 8000); 
}

// Animates wave/greeting on load
function greetUserWithBuddy() {
  const buddy = document.getElementById('sage-buddy');
  const buddySpeech = document.getElementById('sage-buddy-speech');
  if (buddy && buddySpeech) {
    buddy.classList.add('greet');
    buddySpeech.textContent = 'Hi! 👋';
    buddySpeech.classList.add('show');
    
    setTimeout(() => {
      buddy.classList.remove('greet');
      buddySpeech.classList.remove('show');
      startBuddyIdleBehaviors();
    }, 3500);
  } else {
    startBuddyIdleBehaviors();
  }
}

/* --- CHAT UI LOGIC --- */

// Helper to auto scroll chat box
function scrollToBottom() {
  if (chatLogBox) {
    chatLogBox.scrollTop = chatLogBox.scrollHeight;
  }
}

// Format Date / Timestamp
function getTimestampString() {
  const d = new Date();
  let hrs = d.getHours();
  let mins = d.getMinutes();
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  hrs = hrs % 12;
  hrs = hrs ? hrs : 12; // 12 instead of 0
  mins = mins < 10 ? '0' + mins : mins;
  return `${hrs}:${mins} ${ampm}`;
}

// Inserts a chat bubble (User/Sage)
function appendMessage(sender, text, timestamp = null) {
  if (!chatLogBox) return;

  const row = document.createElement('div');
  row.className = `message-row ${sender === 'user' ? 'user-row' : 'coach-row'}`;
  
  const time = timestamp || getTimestampString();

  row.innerHTML = `
    <div class="message-bubble">
      <p class="message-text">${escapeHtml(text)}</p>
      <span class="message-timestamp">${time}</span>
    </div>
  `;
  
  chatLogBox.appendChild(row);
  scrollToBottom();
}

// Inserts a Sage message styled as a gold border celebration
function appendCelebrationMessage(text) {
  if (!chatLogBox) return;

  const row = document.createElement('div');
  row.className = 'message-row coach-row';
  
  const time = getTimestampString();

  row.innerHTML = `
    <div class="message-bubble celebration-bubble">
      <p class="message-text">${escapeHtml(text)}</p>
      <span class="message-timestamp">${time}</span>
    </div>
  `;
  
  chatLogBox.appendChild(row);
  scrollToBottom();

  // Add message to history
  coachService.addMessage('model', text);

  // Trigger pulse animation on Sage Buddy
  const buddy = document.getElementById('sage-buddy');
  if (buddy) {
    buddy.classList.add('pulse');
    setTimeout(() => buddy.classList.remove('pulse'), 800);
  }
}

// Generates welcome back response based on history topics
function getWelcomeBackMessage(history, context) {
  const lastUserMsg = [...history].reverse().find(msg => msg.role === 'user');
  let topic = "sustainability";
  if (lastUserMsg) {
    const text = lastUserMsg.content.toLowerCase();
    if (text.includes('energy') || text.includes('electricity') || text.includes('power')) topic = "energy-saving habits";
    else if (text.includes('transport') || text.includes('car') || text.includes('drive') || text.includes('transit')) topic = "low-carbon transit";
    else if (text.includes('diet') || text.includes('food') || text.includes('meat') || text.includes('veg')) topic = "eco-friendly eating";
    else if (text.includes('shop') || text.includes('buy') || text.includes('waste') || text.includes('recycle')) topic = "reducing waste";
  }
  return {
    response: `Welcome back, ${context.name}! Last time we discussed ${topic}. Ready to build on that progress today?`,
    insight: null,
    recommendedAction: `Ask Sage another question or pick an active challenge to complete.`,
    challengeSuggestion: null
  };
}

// Inserts a rich message bubble that parses structured JSON answers (with insights/actions)
function appendRichMessage(structuredOutput) {
  if (!chatLogBox) return;

  const { response, insight, recommendedAction, challengeSuggestion } = structuredOutput;

  const row = document.createElement('div');
  row.className = 'message-row coach-row';
  
  const time = getTimestampString();

  let richHtml = '';
  if (insight || recommendedAction || challengeSuggestion) {
    richHtml = `<div class="rich-elements-container">`;
    if (insight) {
      richHtml += `
        <div class="rich-widget">
          <div class="rich-widget-title"><span aria-hidden="true">💡</span> Insight</div>
          <p class="rich-widget-content">${escapeHtml(insight)}</p>
        </div>
      `;
    }
    if (recommendedAction) {
      richHtml += `
        <div class="rich-widget">
          <div class="rich-widget-title"><span aria-hidden="true">🎯</span> Recommendation</div>
          <p class="rich-widget-content">${escapeHtml(recommendedAction)}</p>
        </div>
      `;
    }
    if (challengeSuggestion) {
      richHtml += `
        <div class="rich-widget">
          <div class="rich-widget-title"><span aria-hidden="true">🏆</span> Challenge Focus</div>
          <p class="rich-widget-content">Suggested Pledging Action: <strong>${escapeHtml(challengeSuggestion)}</strong></p>
        </div>
      `;
    }
    richHtml += `</div>`;
  }

  row.innerHTML = `
    <div class="message-bubble">
      <p class="message-text">${escapeHtml(response)}</p>
      ${richHtml}
      <span class="message-timestamp">${time}</span>
    </div>
  `;
  
  chatLogBox.appendChild(row);
  scrollToBottom();
}

// Inserts a custom celebration card (for milestones)
function appendCelebrationCard(title, text) {
  if (!chatLogBox) return;

  const card = document.createElement('div');
  card.className = 'celebration-card';
  card.id = `cel-card-${Date.now()}`;
  
  card.innerHTML = `
    <div class="celebration-emoji" aria-hidden="true">🏆</div>
    <div class="celebration-info">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(text)}</p>
    </div>
  `;

  chatLogBox.appendChild(card);
  scrollToBottom();

  // Trigger burst centered at this card
  setTimeout(() => {
    triggerExplosionAtElement(card.id);
  }, 100);
}

// HTML escape helper
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* --- DYNAMIC PROMPTS & CHIPS --- */

function renderSuggestedPrompts(context) {
  if (!suggestedPromptsContainer) return;
  suggestedPromptsContainer.innerHTML = '';
  
  const prompts = coachService.getSuggestedPrompts(context);
  prompts.forEach(pText => {
    const chip = document.createElement('button');
    chip.className = 'prompt-chip';
    chip.textContent = pText;
    chip.addEventListener('click', () => {
      submitUserMessage(pText);
    });
    suggestedPromptsContainer.appendChild(chip);
  });
}

/* --- STATE RECALCULATIONS & TRANSITIONS --- */

// Render Environmental Snapshot Card
function renderSnapshotCard(context) {
  animateValue(snapScore, 0, context.score, 1200);
  animateValue(snapLevel, 0, context.level, 1200);
  animateValue(snapStreak, 0, context.streakCount, 1200, ' Days');
  animateValue(snapBadges, 0, context.badgesCount, 1200, ' Badges');
  
  if (snapChallenge) {
    snapChallenge.textContent = context.activeChallengeTitle;
    snapChallenge.title = context.activeChallengeTitle;
  }
}

// Render "What Sage Knows About You" Memory Card
function renderMemoryCard(context) {
  if (memArchetype) memArchetype.textContent = context.archetype;
  if (memStrongest) memStrongest.textContent = context.strongestCategory;
  if (memWeakest) memWeakest.textContent = context.weakestCategory;
  if (memXp) memXp.textContent = `${context.xp} XP`;
}

// Render Insight Headers
function renderInsightRow(context) {
  if (insightOpportunity) insightOpportunity.textContent = `Optimize ${context.weakestCategory}`;
  if (insightBestHabit) insightBestHabit.textContent = `${context.strongestCategory} is optimal`;
  if (insightRecommendedChallenge) {
    insightRecommendedChallenge.textContent = context.weakestCategory.toLowerCase().includes('transport') 
      ? 'Try "Transit Day"' 
      : 'Try "Phantom Sweep"';
  }
}

// Checks if milestones are met and posts celebration cards
function detectAndCelebrateMilestones(context) {
  const localFlagsKey = `carbon_compass_coach_milestones_${currentUser.uid}`;
  let flags = {};
  let shouldSaveHistory = false;
  
  try {
    const raw = localStorage.getItem(localFlagsKey);
    if (raw) flags = JSON.parse(raw);
  } catch (e) {
    flags = {};
  }

  // 1. Streak milestones check
  const streak = context.streakCount;
  if (streak >= 3 && !flags[`streak_${streak}`]) {
    flags[`streak_${streak}`] = true;
    appendCelebrationMessage(
      `🔥 Active Streak Milestone! Congratulations, ${context.name}! You have maintained an active eco-habit streak of ${streak} days. Your daily commitment is a powerful force for our planet.`
    );
    shouldSaveHistory = true;
    setTimeout(() => {
      triggerExplosionAtElement('sage-buddy');
    }, 100);
  }

  // 2. Badge unlock check
  const badges = context.badgesCount;
  if (badges > 0 && !flags[`badge_${badges}`]) {
    flags[`badge_${badges}`] = true;
    appendCelebrationMessage(
      `💎 Achievement Badge Unlocked! Outstanding work, ${context.name}! You have unlocked a new environmental achievement badge. Each badge represents a verified step towards a cooler planet.`
    );
    shouldSaveHistory = true;
    setTimeout(() => {
      triggerExplosionAtElement('sage-buddy');
    }, 100);
  }

  // 3. Level reached check
  const level = context.level;
  if (level > 1 && !flags[`level_${level}`]) {
    flags[`level_${level}`] = true;
    appendCelebrationMessage(
      `🏆 Title Level Promoted! Congratulations, ${context.name}! You've reached Level ${level} (${context.levelTitle}) by gaining XP through your sustainability efforts. Keep climbing the green title ranks!`
    );
    shouldSaveHistory = true;
    setTimeout(() => {
      triggerExplosionAtElement('sage-buddy');
    }, 100);
  }

  // 4. Completed challenges check
  const completedCount = context.completedChallengesCount;
  if (flags.completedCount === undefined) {
    flags.completedCount = completedCount;
  } else if (completedCount > flags.completedCount) {
    flags.completedCount = completedCount;
    appendCelebrationMessage(
      `🎉 Weekly Challenge Completed! Excellent job, ${context.name}! You've successfully finished an eco-challenge and logged its carbon reduction. Small habits create big impact!`
    );
    shouldSaveHistory = true;
    setTimeout(() => {
      triggerExplosionAtElement('sage-buddy');
    }, 100);
  }

  localStorage.setItem(localFlagsKey, JSON.stringify(flags));

  // Save updated history after milestones are celebrated
  if (shouldSaveHistory && currentUser) {
    saveCoachMessage(currentUser.uid, 'session_default', coachService.history).catch(() => {});
    localStorage.setItem(`carbon_compass_coach_history_${currentUser.uid}`, JSON.stringify(coachService.history));
  }
}

// Formulates welcome greeting on page load
async function loadWelcomeGreeting(context) {
  if (chatLogBox) {
    // Hide Loading skeleton
    if (chatLoadingSkeleton) chatLoadingSkeleton.style.display = 'none';

    // Clear memory history array
    coachService.clearHistory();

    const welcome = coachService.getWelcomeMessage(context);
    
    // Add welcome response to history
    coachService.addMessage('model', welcome.response);

    // Append to feed
    appendRichMessage(welcome);

    // Detect milestones
    detectAndCelebrateMilestones(context);

    // Save initial welcome greeting to history
    try {
      await saveCoachMessage(currentUser.uid, 'session_default', coachService.history);
      localStorage.setItem(`carbon_compass_coach_history_${currentUser.uid}`, JSON.stringify(coachService.history));
    } catch (e) {}
  }
}

// Submits message to the CoachService reasoning pipeline
async function submitUserMessage(messageText) {
  if (!messageText.trim()) return;

  // Add User bubble
  appendMessage('user', messageText);
  
  // Clear textarea input
  if (chatUserInput) chatUserInput.value = '';

  // Show typing animation
  if (chatTypingIndicator) chatTypingIndicator.style.display = 'inline-flex';
  
  // Update Sage Buddy to typing state
  const buddy = document.getElementById('sage-buddy');
  const buddySpeech = document.getElementById('sage-buddy-speech');
  if (buddy) buddy.classList.add('typing');
  if (buddySpeech) {
    buddySpeech.textContent = 'Sage is typing...';
    buddySpeech.classList.add('show');
  }
  scrollToBottom();

  // Send request
  try {
    const start = Date.now();
    const reply = await coachService.generateResponse(messageText, userContext);
    const duration = Date.now() - start;

    // Wait at least 600ms to make Sage feel alive / human
    const delay = Math.max(100, 700 - duration);
    setTimeout(async () => {
      // Hide typing animation
      if (chatTypingIndicator) chatTypingIndicator.style.display = 'none';
      if (buddy) buddy.classList.remove('typing');
      if (buddySpeech) buddySpeech.classList.remove('show');
      
      // Append Sage bubble
      appendRichMessage(reply);

      // Trigger message arrival pulse animation
      if (buddy) {
        buddy.classList.add('pulse');
        setTimeout(() => buddy.classList.remove('pulse'), 800);
      }

      // PERSIST: Save to Firestore & localStorage
      try {
        await saveCoachMessage(currentUser.uid, 'session_default', coachService.history);
        localStorage.setItem(`carbon_compass_coach_history_${currentUser.uid}`, JSON.stringify(coachService.history));
      } catch (e) {
        console.error("Coach: Failed to save session message history:", e);
      }
    }, delay);

  } catch (error) {
    console.error("Coach: Failed to load Sage's reply:", error);
    if (chatTypingIndicator) chatTypingIndicator.style.display = 'none';
    if (buddy) buddy.classList.remove('typing');
    if (buddySpeech) buddySpeech.classList.remove('show');
    appendMessage('coach', "I apologize, but I ran into a connection glitch. What was that again?");
  }
}

/* --- BOOTSTRAP INITIALIZATION --- */

async function loadCoachData(uid) {
  currentLoadedUid = uid;

  const [assessment, challenges, badges, streaks, profile, sessions] = await Promise.all([
    getAssessment(uid).catch(e => { console.error("Error loading assessment:", e); return null; }),
    getChallenges(uid).catch(e => { console.error("Error loading challenges:", e); return []; }),
    getBadges(uid).catch(e => { console.error("Error loading badges:", e); return []; }),
    getStreaks(uid).catch(e => { console.error("Error loading streaks:", e); return { current: 0, longest: 0, lastActivityDate: null }; }),
    getUserProfile(uid).catch(e => { console.error("Error loading user profile:", e); return null; }),
    getCoachSessions(uid).catch(e => { console.error("Error loading coach history:", e); return []; })
  ]);

  if (uid !== currentLoadedUid) {
    console.warn("Coach: Stale data load discarded for uid =", uid);
    return;
  }

  const hasCompletedAssessment = !!(assessment && assessment.planetHealthScore !== undefined);

  if (!hasCompletedAssessment) {
    // Show empty state onboarding
    if (onboardingPanel) onboardingPanel.style.display = 'flex';
    if (activeCoachLayout) activeCoachLayout.style.display = 'none';
    if (chatLoadingSkeleton) chatLoadingSkeleton.style.display = 'none';
    return;
  }

  // Assessed -> show coaching layout
  if (onboardingPanel) onboardingPanel.style.display = 'none';
  if (activeCoachLayout) activeCoachLayout.style.display = 'grid';

  // Build Context data structure
  userContext = coachService.compileContext(assessment, challenges, badges, streaks, profile);

  // Render cards
  renderSnapshotCard(userContext);
  renderMemoryCard(userContext);
  renderInsightRow(userContext);
  renderSuggestedPrompts(userContext);

  // Retrieve previous session history
  const activeSession = sessions.find(s => s.id === 'session_default');
  let loadedHistory = [];
  if (activeSession && Array.isArray(activeSession.messages)) {
    loadedHistory = activeSession.messages;
  } else {
    try {
      const localRaw = localStorage.getItem(`carbon_compass_coach_history_${uid}`);
      if (localRaw) loadedHistory = JSON.parse(localRaw);
    } catch (e) {}
  }

  if (loadedHistory && loadedHistory.length > 0) {
    coachService.history = loadedHistory;
    
    // Hide Loading skeleton
    if (chatLoadingSkeleton) chatLoadingSkeleton.style.display = 'none';

    // Clear feed first
    chatLogBox.innerHTML = '';

    // Render historical messages
    loadedHistory.forEach(msg => {
      if (msg.role === 'user') {
        appendMessage('user', msg.content, msg.timestamp);
      } else {
        if (typeof msg.content === 'object' && msg.content !== null) {
          appendRichMessage(msg.content);
        } else {
          try {
            const parsed = JSON.parse(msg.content);
            appendRichMessage(parsed);
          } catch (e) {
            appendRichMessage({ response: msg.content, insight: null, recommendedAction: null, challengeSuggestion: null });
          }
        }
      }
    });

    // Detect milestones
    detectAndCelebrateMilestones(userContext);

    // Persist new history with welcome back
    try {
      const welcomeBack = getWelcomeBackMessage(loadedHistory, userContext);
      coachService.addMessage('model', welcomeBack.response);
      appendRichMessage(welcomeBack);
      await saveCoachMessage(uid, 'session_default', coachService.history);
      localStorage.setItem(`carbon_compass_coach_history_${uid}`, JSON.stringify(coachService.history));
    } catch (e) {}

    scrollToBottom();
  } else {
    await loadWelcomeGreeting(userContext);
  }

  // Activate Buddy Greet & Wave
  greetUserWithBuddy();
}

document.addEventListener('DOMContentLoaded', () => {
  // Page routing guard & Navbar
  initRouter();
  initNavbar('coach');

  // DOM bindings
  onboardingPanel = document.getElementById('onboarding-panel');
  activeCoachLayout = document.getElementById('active-coach-layout');

  snapScore = document.getElementById('snap-score');
  snapLevel = document.getElementById('snap-level');
  snapStreak = document.getElementById('snap-streak');
  snapChallenge = document.getElementById('snap-challenge');
  snapBadges = document.getElementById('snap-badges');

  memArchetype = document.getElementById('mem-archetype');
  memStrongest = document.getElementById('mem-strongest');
  memWeakest = document.getElementById('mem-weakest');
  memXp = document.getElementById('mem-xp');

  insightOpportunity = document.getElementById('insight-opportunity');
  insightBestHabit = document.getElementById('insight-best-habit');
  insightRecommendedChallenge = document.getElementById('insight-recommended-challenge');

  chatLogBox = document.getElementById('chat-log-box');
  chatLoadingSkeleton = document.getElementById('chat-loading-skeleton');
  chatTypingIndicator = document.getElementById('chat-typing-indicator');
  suggestedPromptsContainer = document.getElementById('suggested-prompts-container');
  chatUserInput = document.getElementById('chat-user-input');
  chatSendBtn = document.getElementById('chat-send-btn');

  // Background spotlight & particles
  initMouseReactiveGlow();
  initParticlesBackground();

  // UI Event listeners
  if (chatSendBtn && chatUserInput) {
    chatSendBtn.addEventListener('click', () => {
      submitUserMessage(chatUserInput.value);
    });

    chatUserInput.addEventListener('keydown', (e) => {
      // Enter sends message
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // prevent newline insertion
        submitUserMessage(chatUserInput.value);
      }
    });

    // Auto grow height handler for textarea
    chatUserInput.addEventListener('input', () => {
      chatUserInput.style.height = 'auto';
      chatUserInput.style.height = `${Math.min(chatUserInput.scrollHeight, 120)}px`;
    });
  }

  // Auth Observer
  observeAuthState(async (user) => {
    if (!user) return;
    currentUser = user;
    try {
      await loadCoachData(user.uid);
    } catch (e) {
      console.error("Coach: Bootstrap data fetching error:", e);
      showToast("Error establishing connection to Advisor systems.", "error");
    }
  });
});
