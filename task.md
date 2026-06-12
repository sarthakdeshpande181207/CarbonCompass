# 🌍 Carbon Compass — Project Task Document

> **Status:** Planning Phase | **Version:** 1.0 | **Last Updated:** 2026-06-11

---

## 1. Project Overview

**Carbon Compass** is a modern web application that empowers users to understand, track, and reduce their personal carbon footprint. The app combines a personalized assessment, AI-driven coaching via Gemini, impact simulation, and gamified eco-challenges to drive meaningful behavior change.

**Core Philosophy:**
- Make carbon literacy accessible and engaging
- Provide personalized, actionable insights — not generic advice
- Gamify sustainability to build long-term habits
- Leverage AI (Gemini) as a knowledgeable, empathetic sustainability coach

**Target Users:** Environmentally conscious individuals who want data-driven guidance on reducing their personal carbon footprint.

**Tech Stack:**
| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript (ES Modules) |
| Auth | Firebase Authentication (Google Sign-In only) |
| Database | Cloud Firestore |
| AI | Google Gemini API |
| Hosting | Firebase Hosting (planned) |
| Testing | Jest (unit), Playwright (e2e) |

---

## 2. Features

### 🔒 Locked Features (MVP Scope)

| # | Feature | Description |
|---|---|---|
| 1 | **Landing Page** | Hero section, value proposition, CTA to sign in |
| 2 | **Google Sign-In** | Firebase Auth — Google provider only |
| 3 | **Quick Assessment** | 13-question onboarding quiz covering lifestyle categories |
| 4 | **Planet Health Score** | 0–100 composite score derived from assessment answers |
| 5 | **Carbon Compass Report** | Full breakdown screen shown after assessment completion |
| 6 | **Carbon Breakdown Report** | Category-level carbon emissions breakdown (transport, diet, energy, etc.) |
| 7 | **Carbon Mirror** | Persona assignment (🌱 Eco Explorer, 🌍 Conscious Commuter, ⚡ Energy Drifter, 🚗 Carbon Heavyweight) with custom description and recommendations |
| 8 | **Dashboard** | Central hub after login — score, challenges, recent activity |
| 9 | **AI Sustainability Coach** | Gemini-powered chat interface for personalized advice |
| 10 | **Impact Simulator** | What-if tool to model carbon reductions from lifestyle changes |
| 11 | **Weekly Eco Challenges** | Curated weekly actions with progress tracking |
| 12 | **Badges & Streaks** | Achievement system for completed challenges and login streaks |
| 13 | **Profile & Settings** | User profile, notification preferences, account management |

---

## 3. User Flow

```
Landing Page
    │
    ▼
Google Sign-In (Firebase Auth)
    │
    ├─── [New User] ──────▶ Quick Assessment (13 questions)
    │                              │
    │                              ▼
    │                      Carbon Compass Report
    │                      (Planet Health Score + Carbon Breakdown + Carbon Mirror)
    │                              │
    └─── [Returning User] ─────────▼
                           Dashboard
                           ┌────────────────┐
                           │  AI Coach      │
                           │  Impact Sim    │
                           │  Challenges    │
                           │  Profile       │
                           └────────────────┘
```

**Flow Rules:**
- New users **must** complete assessment before seeing the Dashboard
- Assessment data is saved to Firestore after completion
- Returning users land directly on the Dashboard
- Assessment can be re-taken from Profile & Settings
- Google Sign-In is the **only** authentication method

---

## 4. Page Structure

### 4.1 Landing Page (`/`)
- Hero section with tagline and animated earth/carbon visual
- Feature highlights (3–4 value props)
- "Get Started with Google" CTA button
- Footer with links

### 4.2 Assessment Page (`/assessment`)
- Progress bar (question X of 13)
- Single question per screen with animated transitions
- Question categories:
  - 🚗 Transportation (3 questions)
  - 🍽️ Diet & Food (3 questions)
  - ⚡ Home Energy (3 questions)
  - 🛍️ Shopping & Consumption (2 questions)
  - ✈️ Travel & Flights (2 questions)
- Back/Next navigation
- Save & Submit (store answers locally during assessment, save completed assessment once to Firestore upon submission)

### 4.3 Report Page (`/report`)
- Planet Health Score display (animated 0–100 gauge)
- Carbon Breakdown chart (category-level visualization)
- Carbon Mirror section (displays one of the four personas: 🌱 Eco Explorer, 🌍 Conscious Commuter, ⚡ Energy Drifter, 🚗 Carbon Heavyweight, including custom description and recommendations)
- "Why My Score?" section (breakdown of score impact per category, e.g., Transport: -12 points, Diet: -5 points, Energy: -3 points, and identification of Strongest and Weakest Areas)
- Top 3 personalized recommendations
- CTA to Dashboard

### 4.4 Dashboard (`/dashboard`)
- Greeting with user name and avatar
- Planet Health Score card (current score + trend)
- Active Weekly Challenge card
- Recent badges earned
- Quick links: AI Coach, Impact Simulator, Challenges
- Carbon footprint trend chart (historical)

### 4.5 AI Coach Page (`/coach`)
- Chat interface (Gemini-powered)
- Pre-loaded context: user's score, category breakdown, recent challenges
- Suggested prompts / quick questions
- Conversation history (saved to Firestore)
- Export/copy conversation option

### 4.6 Impact Simulator Page (`/simulator`)
- Lifestyle change sliders (transport, diet, energy, etc.)
- Real-time CO₂ savings calculation
- Comparison: current vs. simulated footprint
- "Commit to This Change" → creates a Challenge
- Annual impact projection

### 4.7 Challenges Page (`/challenges`)
- Weekly challenge cards (active, upcoming, completed)
- Challenge details: description, estimated CO₂ saving, difficulty
- Mark as complete with confirmation
- Streak tracker and calendar view
- Badge unlock animations

### 4.8 Profile & Settings (`/profile`)
- User info (name, email, avatar from Google)
- Planet Health Score history chart
- Badges earned grid
- Streak stats
- Notification preferences (toggle)
- Re-take Assessment option
- Sign out button
- Account deletion option

---

## 5. File Structure

```
CarbonCompass/
│
├── index.html                    # Landing page
├── assessment.html               # Assessment page
├── report.html                   # Carbon Compass Report
├── dashboard.html                # Main dashboard
├── coach.html                    # AI Sustainability Coach
├── simulator.html                # Impact Simulator
├── challenges.html               # Weekly Eco Challenges
├── profile.html                  # Profile & Settings
│
├── assets/
│   ├── icons/                    # SVG icons and favicons
│   ├── images/                   # Hero images, illustrations
│   └── fonts/                    # Local font files (if any)
│
├── styles/
│   ├── base.css                  # CSS reset, variables, typography
│   ├── components.css            # Reusable component styles
│   ├── animations.css            # Keyframes and transitions
│   ├── landing.css               # Landing page styles
│   ├── assessment.css            # Assessment page styles
│   ├── report.css                # Report page styles
│   ├── dashboard.css             # Dashboard styles
│   ├── coach.css                 # AI Coach styles
│   ├── simulator.css             # Impact Simulator styles
│   ├── challenges.css            # Challenges styles
│   └── profile.css               # Profile & Settings styles
│
├── js/
│   ├── pages/
│   │   ├── landing.js            # Landing page logic
│   │   ├── assessment.js         # Assessment flow, scoring
│   │   ├── report.js             # Report rendering, chart logic
│   │   ├── dashboard.js          # Dashboard data fetching
│   │   ├── coach.js              # Gemini chat interface
│   │   ├── simulator.js          # Impact simulation logic
│   │   ├── challenges.js         # Challenge management
│   │   └── profile.js            # Profile & settings
│   │
│   ├── components/
│   │   ├── navbar.js             # Top navigation component
│   │   ├── scoreGauge.js         # Planet Health Score gauge
│   │   ├── carbonChart.js        # Category breakdown chart
│   │   ├── challengeCard.js      # Challenge card component
│   │   ├── badgeGrid.js          # Badge display grid
│   │   ├── chatBubble.js         # Chat message bubble
│   │   ├── progressBar.js        # Assessment progress bar
│   │   └── toast.js              # Toast notification system
│   │
│   ├── services/
│   │   ├── carbonCalculator.js   # Carbon score calculation engine
│   │   ├── geminiService.js      # Gemini API wrapper
│   │   ├── challengeService.js   # Challenge CRUD & scheduling
│   │   ├── badgeService.js       # Badge unlock logic
│   │   └── reportService.js      # Report generation logic
│   │
│   ├── firebase/
│   │   ├── config.js             # Firebase app initialization
│   │   ├── auth.js               # Auth helpers (signIn, signOut, onAuthChange)
│   │   └── firestore.js          # Firestore CRUD wrappers
│   │
│   └── utils/
│       ├── router.js             # Client-side routing / redirect guards
│       ├── constants.js          # App-wide constants (questions, categories, etc.)
│       ├── helpers.js            # Utility functions (date, format, etc.)
│       └── validators.js         # Input validation helpers
│
├── tests/
│   ├── unit/
│   │   ├── carbonCalculator.test.js
│   │   ├── badgeService.test.js
│   │   └── validators.test.js
│   ├── integration/
│   │   ├── auth.test.js
│   │   └── firestore.test.js
│   └── e2e/
│       ├── assessment.spec.js
│       ├── dashboard.spec.js
│       └── coach.spec.js
│
├── .env.example                  # Environment variable template
├── .gitignore
├── firebase.json                 # Firebase Hosting config
├── .firebaserc                   # Firebase project config
├── jest.config.js                # Jest unit test config
├── playwright.config.js          # Playwright e2e test config
├── package.json
└── task.md                       # This file
```

---

## 6. Firebase Requirements

### 6.1 Authentication
- [ ] Enable **Google Sign-In** provider only in Firebase Console
- [ ] Implement `signInWithPopup` (Google) flow
- [ ] Implement `signOut` handler
- [ ] Persist auth state with `browserLocalPersistence`
- [ ] Auth state observer (`onAuthStateChanged`) on every protected page
- [ ] Redirect unauthenticated users to Landing Page
- [ ] Redirect authenticated users away from Landing/Assessment if already completed

### 6.2 Firestore Database Structure
```
users/{uid}/
  ├── profile {
  │     displayName, email, photoURL, createdAt, lastLoginAt
  │   }
  ├── assessment {
  │     answers: [...],
  │     completedAt: timestamp,
  │     planetHealthScore: number,
  │     carbonBreakdown: { transport, diet, energy, shopping, travel }
  │   }
  ├── challenges/
  │   └── {challengeId} {
  │         title, description, co2Saving, startedAt, completedAt, status
  │       }
  ├── badges/
  │   └── {badgeId} {
  │         name, earnedAt, description
  │       }
  ├── streaks {
  │     current: number, longest: number, lastActivityDate: date
  │   }
  └── coachHistory/
      └── {sessionId} {
            messages: [...], createdAt, updatedAt
          }
```

### 6.3 Firestore Security Rules
- [ ] Users can only read/write their own documents (`request.auth.uid == userId`)
- [ ] All collections require authentication
- [ ] Validate data types and field constraints in rules
- [ ] No public read/write access on any collection

### 6.4 Firebase Hosting
- [ ] Configure `firebase.json` for SPA routing (rewrites all to `index.html`)
- [ ] Set up environment-specific configs (dev vs. prod)

---

## 7. Gemini Requirements

### 7.1 Integration
- [ ] Use **Gemini API** (via REST or `@google/generative-ai` SDK)
- [ ] Store Gemini API key securely (environment variable, never in client code)
- [ ] Implement a **server-side proxy** or Firebase Function to call Gemini (avoid exposing API key in browser)

### 7.2 AI Coach Context
- [ ] Pass user's Planet Health Score in system prompt
- [ ] Pass category-level carbon breakdown in system prompt
- [ ] Pass recently completed/active challenges in system prompt
- [ ] Gemini persona: "Sage" — an empathetic, knowledgeable, and encouraging sustainability coach
- [ ] System prompt includes: tone guidelines, domain constraints (sustainability only), user profile summary

### 7.3 Conversation Management
- [ ] Maintain multi-turn conversation history in session
- [ ] Save conversation history to Firestore (per session)
- [ ] Implement message streaming (show response word-by-word)
- [ ] Handle API errors gracefully with user-friendly messages
- [ ] Rate limiting: max 20 messages per session to prevent abuse

### 7.4 Suggested Prompts
- [ ] Display 3–4 context-aware suggested prompts on Coach page load
- [ ] Prompts generated based on user's weakest carbon categories

---

## 8. Accessibility Requirements

### 8.1 WCAG 2.1 AA Compliance
- [ ] All color combinations meet **4.5:1 contrast ratio** for normal text
- [ ] All interactive elements have visible **focus indicators**
- [ ] No content relies on color alone to convey meaning

### 8.2 Semantic HTML
- [ ] Use proper heading hierarchy (one `<h1>` per page)
- [ ] Use semantic elements: `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`
- [ ] All form inputs have associated `<label>` elements
- [ ] Use `<button>` for interactive controls (not `<div>` or `<span>`)

### 8.3 ARIA
- [ ] Add `aria-label` / `aria-labelledby` to all non-text interactive elements
- [ ] Live regions (`aria-live="polite"`) for dynamic content updates (toast notifications, chat responses)
- [ ] `aria-describedby` for form field hints and errors
- [ ] `role="progressbar"` with `aria-valuenow` for assessment progress
- [ ] `aria-expanded` for collapsible panels

### 8.4 Keyboard Navigation
- [ ] All interactive elements reachable via keyboard (Tab order logical)
- [ ] Modal dialogs trap focus and restore on close
- [ ] Escape key closes modals and dropdowns
- [ ] Assessment questions navigable with arrow keys

### 8.5 Motion & Readability
- [ ] Respect `prefers-reduced-motion` — disable/reduce animations
- [ ] Minimum tap target size: 44×44px for all interactive elements
- [ ] Line height ≥ 1.5 for body text
- [ ] Font size ≥ 16px for body text

---

## 9. Security Requirements

### 9.1 Authentication & Authorization
- [ ] Enforce auth on all protected pages (client-side redirect guards)
- [ ] Firestore Security Rules enforce server-side authorization
- [ ] Never trust client-supplied user IDs — use `request.auth.uid` in rules
- [ ] Session tokens managed by Firebase SDK (no manual token handling)

### 9.2 API Key Security
- [ ] Firebase config keys are **not secret** but restrict via HTTP referrer in Firebase Console
- [ ] Gemini API key **must never** be in client-side code
- [ ] Use Firebase Cloud Functions or a backend proxy for Gemini calls
- [ ] Store all secrets in environment variables (`.env`) — never commit to repo

### 9.3 Input Validation & Sanitization
- [ ] Sanitize all user inputs before storing to Firestore
- [ ] Validate assessment answers client-side and enforce constraints via Firestore rules
- [ ] Escape all dynamic content before injecting into the DOM (use `textContent`, not `innerHTML`)
- [ ] Implement Content Security Policy (CSP) headers

### 9.4 Firestore Rules
- [ ] No wildcard (`allow read, write: if true`) rules — ever
- [ ] Rate limit writes where possible (Firestore rules don't support rate limiting natively — use Cloud Functions)
- [ ] Validate field types: `request.resource.data.score is number`

### 9.5 General
- [ ] HTTPS enforced (Firebase Hosting does this by default)
- [ ] Dependencies audited (`npm audit`) before deployment
- [ ] No sensitive data logged to browser console in production
- [ ] `.env` and `firebase-debug.log` in `.gitignore`

---

## 10. Testing Requirements

### 10.1 Unit Tests (Jest)
- [ ] `carbonCalculator.js` — test score calculation for all input combinations
- [ ] `badgeService.js` — test badge unlock logic for each badge type
- [ ] `validators.js` — test all input validation functions
- [ ] `helpers.js` — test date formatting and utility functions
- [ ] `challengeService.js` — test challenge CRUD operations with mocked Firestore

### 10.2 Integration Tests
- [ ] Auth flow: sign-in, sign-out, auth state persistence
- [ ] Firestore CRUD: create/read/update user profile, assessment, challenges
- [ ] Gemini service: mock API call, test prompt construction, test error handling

### 10.3 End-to-End Tests (Playwright)
- [ ] **Assessment flow**: complete all 13 questions, verify score appears on report
- [ ] **Dashboard load**: verify user data loads correctly after assessment
- [ ] **AI Coach**: send a message, verify response renders
- [ ] **Challenges**: mark a challenge complete, verify badge/streak update
- [ ] **Profile**: verify score history and badges display correctly

### 10.4 Accessibility Tests
- [ ] Run `axe-core` automated a11y scans on all pages
- [ ] Manual keyboard navigation test on all pages
- [ ] Screen reader test (NVDA or VoiceOver) on assessment and coach

### 10.5 Coverage Targets
| Type | Target |
|---|---|
| Unit Test Coverage | ≥ 80% |
| Integration Tests | All critical paths |
| E2E Flows | All 5 main user flows |
| A11y Violations | 0 critical, 0 serious |

---

## 11. ✅ MVP Checklist

### Infrastructure
- [x] Initialize Firebase project (Auth + Firestore + Hosting)
- [x] Set up project file structure
- [x] Configure `.env.example` and `.gitignore`
- [x] Set up `package.json` with scripts
- [ ] Set up Jest and Playwright configs

### Design System
- [x] Define CSS custom properties (colors, typography, spacing, radii)
- [x] Create `base.css` (reset, variables, typography)
- [x] Create `components.css` (buttons, cards, inputs, badges)
- [x] Create `animations.css` (keyframes, transitions)
- [x] Choose and integrate Google Font (e.g., Inter or Outfit)

### Authentication
- [x] Implement Firebase Auth initialization (`firebase/config.js`, `firebase/auth.js`)
- [x] Build Google Sign-In flow on Landing Page
- [x] Implement auth guards (`utils/router.js`)
- [x] Handle new vs. returning user redirect logic

### Landing Page
- [x] Hero section with animated visual
- [x] Feature highlights
- [x] Google Sign-In CTA
- [x] Responsive layout

### Assessment
- [x] Define all 13 questions and answer options (`utils/constants.js`)
- [x] Build question-by-question UI with progress bar
- [x] Implement answer state management
- [x] Save answers to Firestore on completion
- [x] Trigger carbon score calculation on completion

### Carbon Calculator
- [x] Define scoring algorithm for each category
- [x] Calculate Planet Health Score (0–100)
- [x] Calculate category-level carbon breakdown

### Report Page
- [x] Animated Planet Health Score gauge
- [x] Category breakdown chart (bar or donut)
- [x] Carbon Mirror persona assignment (🌱 Eco Explorer, 🌍 Conscious Commuter, ⚡ Energy Drifter, 🚗 Carbon Heavyweight) with description and recommendations
- [x] "Why My Score?" breakdown section (category points impact, strongest/weakest areas)
- [x] Top 3 recommendations based on weakest categories
- [x] CTA to Dashboard

### Dashboard
- [x] Auth-protected route
- [x] Fetch and display user profile + score
- [x] Display active weekly challenge
- [x] Recent badges section
- [x] Navigation to other pages

### AI Coach
- [ ] Implement `geminiService.js` with secure proxy
- [ ] Build chat UI (message bubbles, input, send button)
- [ ] Construct context-aware system prompt
- [ ] Implement message streaming
- [ ] Save/load conversation history

### Impact Simulator
- [ ] Build slider UI for each lifestyle category
- [ ] Implement real-time CO₂ delta calculation
- [ ] Display before/after comparison
- [ ] "Commit" action creates a Challenge

### Challenges
- [x] Define default weekly challenge set (`utils/constants.js`)
- [x] Build challenge card UI
- [x] Implement mark-as-complete flow
- [x] Update streak on completion

### Badges & Streaks
- [x] Define badge types and unlock conditions
- [x] Implement `badgeService.js`
- [x] Build badge grid UI
- [x] Streak calculation logic

### Profile & Settings
- [ ] Display user info from Firebase Auth
- [ ] Score history chart
- [ ] Badge grid
- [ ] Sign out
- [ ] Re-take assessment option

### Firebase Security
- [ ] Write and deploy Firestore Security Rules
- [ ] Restrict Firebase Auth to Google provider only
- [ ] Apply HTTP referrer restrictions to Firebase keys

---

## 12. 🚀 Phase 2 Checklist

- [ ] **Social Sharing** — Share Planet Health Score card on social media
- [ ] **Friends & Leaderboard** — Compare scores with friends
- [ ] **Push Notifications** — Weekly challenge reminders (Firebase Cloud Messaging)
- [ ] **Offline Support** — PWA with service worker for offline access
- [ ] **Carbon Footprint History** — Track score changes over time with detailed timeline
- [ ] **Custom Challenges** — User-created challenges
- [ ] **Community Challenges** — Group challenges with collective impact tracking
- [ ] **Deep-dive Category Reports** — Detailed per-category reports with benchmarks
- [ ] **Export Data** — Download your carbon data as CSV/PDF
- [ ] **Localization (i18n)** — Multi-language support (English, Spanish, French)
- [ ] **Dark/Light Mode Toggle** — User-controlled theme switching
- [ ] **Advanced Impact Simulator** — More variables, flight routes, vehicle types
- [ ] **Referral System** — Invite friends, earn bonus badges

---

## 13. ✨ Polish Checklist

### Visual Design
- [ ] Consistent design language across all pages
- [ ] Smooth page transitions (fade/slide between pages)
- [ ] Micro-animations on all interactive elements (hover, active states)
- [ ] Loading skeletons for async data
- [ ] Empty states designed (no challenges, no badges yet)
- [ ] Error states designed (API failure, network error)
- [ ] Toast notification system for user feedback
- [ ] Animated score gauge on Report page
- [ ] Confetti/celebration animation on challenge completion

### Performance
- [ ] Lighthouse Performance score ≥ 90
- [ ] Images optimized (WebP format, lazy loading)
- [ ] CSS and JS minified for production
- [ ] Critical CSS inlined
- [ ] Font display swap for custom fonts

### UX
- [ ] Onboarding tooltips for first-time Dashboard users
- [ ] Smooth assessment question transitions
- [ ] Haptic-friendly button sizes on mobile
- [ ] Responsive across mobile, tablet, and desktop
- [ ] 404 page designed and implemented
- [ ] Offline page for PWA

### Code Quality
- [ ] ESLint configured and all warnings resolved
- [ ] Consistent code formatting (Prettier)
- [ ] No `console.log` statements in production code
- [ ] All TODO comments resolved before release
- [ ] Code reviewed for accessibility and security

### Pre-Launch
- [ ] Privacy Policy page
- [ ] Terms of Service page
- [ ] Cookie/data consent banner (if applicable for region)
- [ ] Final Lighthouse audit (Performance, A11y, Best Practices, SEO) — all ≥ 90
- [ ] Final security audit (Firestore rules, API key restrictions)
- [ ] Cross-browser test (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device test (iOS Safari, Android Chrome)
