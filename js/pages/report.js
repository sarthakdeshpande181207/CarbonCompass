import { observeAuthState } from '../firebase/auth.js';
import { getAssessment } from '../firebase/firestore.js';
import { initNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { initRouter } from '../utils/router.js';
import { CATEGORY_LABELS } from '../services/carbonCalculator.js';
import { formatNumber } from '../utils/helpers.js';

// Mapping categories to user friendly emojis
const CATEGORY_EMOJIS = {
  transport: '🚗',
  diet: '🍽️',
  energy: '⚡',
  shopping: '🛍️',
  travel: '✈️'
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize route guards & navbar
  initRouter();
  initNavbar('report');

  const gaugeFillEl = document.getElementById('gauge-fill-el');
  const gaugeScoreVal = document.getElementById('gauge-score-val');
  const gaugeScoreDesc = document.getElementById('gauge-score-desc');
  const deductionsContainer = document.getElementById('deductions-container');
  const strongestVal = document.getElementById('strongest-val');
  const weakestVal = document.getElementById('weakest-val');

  const personaEmojiEl = document.getElementById('persona-emoji-el');
  const personaNameEl = document.getElementById('persona-name-el');
  const personaDescEl = document.getElementById('persona-desc-el');
  const recommendationsContainer = document.getElementById('recommendations-container');

  const chartBarsContainer = document.getElementById('chart-bars-container');

  let currentLoadedUid = null;

  // Load results
  observeAuthState(async (user) => {
    if (!user) {
      console.warn("Report: No authenticated user found!");
      return;
    }

    const uid = user.uid;
    currentLoadedUid = uid;
    console.log("Report: observeAuthState user.uid =", uid);

    try {
      const assessment = await getAssessment(uid);
      console.log("Report: Assessment retrieved:", assessment);

      if (uid !== currentLoadedUid) {
        console.warn("Report: Stale data load discarded for uid =", uid);
        return;
      }

      if (!assessment) {
        showToast("No assessment found. Redirecting to quiz...", "warning");
        setTimeout(() => {
          window.location.href = '/assessment';
        }, 1500);
        return;
      }

      renderReportData(assessment);
    } catch (error) {
      console.error("Report: Failed to fetch results", error);
      showToast("Error loading report. Please refresh.", "error");
    }
  });

  // Render all UI nodes
  const renderReportData = (assessment) => {
    const { planetHealthScore, carbonBreakdown, scoreBreakdown, strongestArea, weakestArea, persona } = assessment;

    // 1. Render Score Gauge with animations
    animateScoreGauge(planetHealthScore);

    // 2. Render "Why My Score?" deductions
    renderWhyScore(scoreBreakdown, strongestArea, weakestArea);

    // 3. Render Carbon Mirror Persona
    renderPersona(persona);

    // 4. Render Carbon Footprint Chart
    renderCarbonChart(carbonBreakdown);
  };

  // Animate score counter & gauge path sweep
  const animateScoreGauge = (targetScore) => {
    // Circle circumference for r=90 is approx 565.48
    const circumference = 565.48;
    const targetOffset = circumference - (circumference * targetScore) / 100;
    
    // Set SVG offset
    setTimeout(() => {
      gaugeFillEl.style.strokeDashoffset = targetOffset;
    }, 200);

    // Animate Text counter
    let currentScore = 0;
    const duration = 1200; // ms
    const startTime = performance.now();

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (outQuad)
      const easeProgress = progress * (2 - progress);
      currentScore = Math.round(easeProgress * targetScore);
      
      gaugeScoreVal.textContent = currentScore;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        gaugeScoreVal.textContent = targetScore;
      }
    };
    
    requestAnimationFrame(updateCounter);

    // Set score summary description
    let description = '';
    if (targetScore >= 80) {
      description = 'Superb! Your lifestyle footprint is highly sustainable. Keep setting the example!';
    } else if (targetScore >= 60) {
      description = 'Good job! You are living mindfully, but a few adjustments could lower your impact even more.';
    } else if (targetScore >= 40) {
      description = 'Moderate impact. Convenient habits are causing substantial carbon emissions.';
    } else {
      description = 'High impact. Swapping daily carbon habits will significantly help restore planet health.';
    }
    gaugeScoreDesc.textContent = description;
  };

  // Render category deductions and summary metrics
  const renderWhyScore = (scoreBreakdown, strongest, weakest) => {
    deductionsContainer.innerHTML = '';
    
    Object.entries(scoreBreakdown || {}).forEach(([category, deduction]) => {
      const label = CATEGORY_LABELS[category] || category;
      const emoji = CATEGORY_EMOJIS[category] || '🌱';
      
      const item = document.createElement('div');
      item.className = 'deduction-item';
      
      const isPerfect = deduction === 0;
      const deductionText = isPerfect ? 'Perfect Score' : `${deduction} points`;
      const valClass = isPerfect ? 'perfect' : '';
      
      item.innerHTML = `
        <span class="deduction-category">${emoji} ${label}</span>
        <span class="deduction-value ${valClass}">${deductionText}</span>
      `;
      
      deductionsContainer.appendChild(item);
    });

    strongestVal.textContent = strongest || 'N/A';
    weakestVal.textContent = weakest || 'N/A';
  };

  // Render Carbon Mirror Persona Card
  const renderPersona = (persona) => {
    if (!persona) return;
    personaEmojiEl.textContent = persona.emoji || '🌱';
    personaNameEl.textContent = persona.name || 'Eco Advocate';
    personaDescEl.textContent = persona.description || '';

    // Recommendations list
    recommendationsContainer.innerHTML = '';
    (persona.recommendations || []).forEach(tip => {
      const li = document.createElement('li');
      li.textContent = tip;
      recommendationsContainer.appendChild(li);
    });
  };

  // Render Category carbon footprint bars
  const renderCarbonChart = (carbonBreakdown) => {
    chartBarsContainer.innerHTML = '';
    
    const entries = Object.entries(carbonBreakdown || {});
    // Find highest value to scale the bars proportionally
    const maxVal = Math.max(...entries.map(([, val]) => val), 1); // default to 1 to avoid /0

    entries.forEach(([category, co2Val]) => {
      const label = CATEGORY_LABELS[category] || category;
      const emoji = CATEGORY_EMOJIS[category] || '🌱';
      
      // Calculate width percentage relative to max category footprint
      const percentage = (co2Val / maxVal) * 100;
      
      const barItem = document.createElement('div');
      barItem.className = 'chart-bar-item';
      
      barItem.innerHTML = `
        <div class="chart-bar-header">
          <span class="chart-bar-label">${emoji} ${label}</span>
          <span class="chart-bar-value">${formatNumber(co2Val, 1)} kg</span>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: 0%;"></div>
        </div>
      `;
      
      chartBarsContainer.appendChild(barItem);
      
      // Animate widths on page load
      setTimeout(() => {
        const fill = barItem.querySelector('.chart-bar-fill');
        if (fill) fill.style.width = `${Math.max(5, percentage)}%`; // min 5% for visibility
      }, 300);
    });
  };
});
