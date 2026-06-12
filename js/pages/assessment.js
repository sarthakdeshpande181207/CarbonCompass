import { observeAuthState } from '../firebase/auth.js';
import { submitAssessmentResults } from '../services/reportService.js';
import { initNavbar } from '../components/navbar.js';
import { showToast } from '../components/toast.js';
import { initRouter } from '../utils/router.js';
import { ASSESSMENT_QUESTIONS } from '../utils/constants.js';

// Local storage key for temporarily storing answers during quiz
const STORAGE_DRAFT_ANSWERS = 'carbon_compass_draft_answers';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize routes & page guard
  initRouter();
  initNavbar('assessment');

  let currentUser = null;
  let currentIndex = 0;
  let answers = {};

  // DOM Elements
  const categoryBadge = document.getElementById('category-badge');
  const questionProgressText = document.getElementById('question-progress-text');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const questionTextEl = document.getElementById('question-text-el');
  const categoryPill = document.getElementById('category-pill');
  const optionsContainer = document.getElementById('options-container');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const cardContainer = document.getElementById('assessment-card-container');

  // Load draft answers from localStorage if any
  const loadDraftAnswers = () => {
    const draft = localStorage.getItem(STORAGE_DRAFT_ANSWERS);
    if (draft) {
      try {
        answers = JSON.parse(draft);
      } catch (e) {
        answers = {};
      }
    }
  };

  // Save draft answers to localStorage
  const saveDraftAnswers = () => {
    localStorage.setItem(STORAGE_DRAFT_ANSWERS, JSON.stringify(answers));
  };

  // Map raw category IDs to User Friendly Groupings
  const getCategoryLabel = (rawCategory) => {
    switch (rawCategory) {
      case 'transport':
      case 'travel':
        return 'Transport';
      case 'diet':
        return 'Food';
      case 'energy':
        return 'Energy';
      case 'shopping':
        return 'Waste';
      default:
        return 'General';
    }
  };

  // Render the current question
  const renderQuestion = () => {
    const question = ASSESSMENT_QUESTIONS[currentIndex];
    if (!question) return;

    // Trigger minor fade-in slide effect by resetting CSS animation class
    const questionContent = document.getElementById('question-content');
    if (questionContent) {
      questionContent.classList.remove('question-slide-in');
      void questionContent.offsetWidth; // trigger reflow
      questionContent.classList.add('question-slide-in');
    }

    // Set headers
    const categoryLabel = getCategoryLabel(question.category);
    categoryBadge.textContent = categoryLabel;
    categoryPill.textContent = categoryLabel.toUpperCase();
    questionProgressText.textContent = `Question ${currentIndex + 1} of ${ASSESSMENT_QUESTIONS.length}`;
    
    // Set progress bar fill
    const progressPct = ((currentIndex) / ASSESSMENT_QUESTIONS.length) * 100;
    progressBarFill.style.width = `${progressPct}%`;
    progressBarFill.setAttribute('aria-valuenow', Math.round(progressPct));

    // Set question text
    questionTextEl.textContent = question.text;

    // Render options
    optionsContainer.innerHTML = '';
    question.options.forEach((option, idx) => {
      const isChecked = answers[question.id] === idx;
      
      const optionLabel = document.createElement('label');
      optionLabel.className = 'option-label';
      optionLabel.setAttribute('for', `opt-${question.id}-${idx}`);

      optionLabel.innerHTML = `
        <input type="radio" 
               name="question-${question.id}" 
               id="opt-${question.id}-${idx}" 
               class="option-input" 
               value="${idx}" 
               ${isChecked ? 'checked' : ''} 
               aria-label="${option.text}">
        <div class="option-card">
          <div class="option-text-content">${option.text}</div>
          <div class="option-check" aria-hidden="true"></div>
        </div>
      `;
      
      optionsContainer.appendChild(optionLabel);
    });

    // Handle Back button state
    prevBtn.disabled = currentIndex === 0;

    // Update Next/Submit button label
    if (currentIndex === ASSESSMENT_QUESTIONS.length - 1) {
      nextBtn.innerHTML = 'Submit <span>&rarr;</span>';
      nextBtn.setAttribute('aria-label', 'Submit assessment');
    } else {
      nextBtn.innerHTML = 'Next <span>&rarr;</span>';
      nextBtn.setAttribute('aria-label', 'Go to next question');
    }

    // Enable/disable Next button based on whether an answer is selected
    validateSelection();
  };

  // Validates if the user has selected an option for the current question
  const validateSelection = () => {
    const question = ASSESSMENT_QUESTIONS[currentIndex];
    const hasAnswer = answers[question.id] !== undefined;
    nextBtn.disabled = !hasAnswer;
  };

  // Monitor selections on radio buttons
  optionsContainer.addEventListener('change', (e) => {
    if (e.target.classList.contains('option-input')) {
      const question = ASSESSMENT_QUESTIONS[currentIndex];
      answers[question.id] = parseInt(e.target.value, 10);
      saveDraftAnswers();
      validateSelection();
    }
  });

  // Next / Submit Action Click
  nextBtn.addEventListener('click', async () => {
    const question = ASSESSMENT_QUESTIONS[currentIndex];
    if (answers[question.id] === undefined) {
      showToast("Please select an answer to proceed.", "warning");
      return;
    }

    if (currentIndex < ASSESSMENT_QUESTIONS.length - 1) {
      currentIndex++;
      renderQuestion();
    } else {
      // Final Submit
      if (!currentUser) {
        showToast("You must be signed in to submit the assessment.", "error");
        return;
      }

      nextBtn.disabled = true;
      nextBtn.innerHTML = 'Calculating...';

      try {
        await submitAssessmentResults(currentUser.uid, answers);
        
        // Remove locally stored draft upon successful DB submission
        localStorage.removeItem(STORAGE_DRAFT_ANSWERS);

        showToast("Carbon footprint calculated successfully!", "success");
        
        // Redirect to Dashboard page
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1200);

      } catch (error) {
        console.error("Submission failed:", error);
        showToast("Failed to save results. Please try again.", "error");
        nextBtn.disabled = false;
        nextBtn.innerHTML = 'Submit <span>&rarr;</span>';
      }
    }
  });

  // Back Button Action Click
  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderQuestion();
    }
  });

  // Fetch current user and bootstrap
  observeAuthState((user) => {
    if (user) {
      currentUser = user;
      loadDraftAnswers();
      renderQuestion();
    }
  });
});
