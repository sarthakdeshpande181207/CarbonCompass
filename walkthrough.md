# Walkthrough - Carbon Compass Features & Final UI Polish

This walkthrough details the architecture, features, verification, and final UI polish of the Carbon Compass platform, including the **AI Coach** ("Sage"), **Impact Simulator**, **Sustainability Passport (Profile)**, and the **Deployment Readiness Pass**.

---

## 1. AI Coach ("Sage") Enhancements

### Key Implementations
1. **Structure & Interface Layout ([coach.html](file:///c:/Users/Sarthak%20Deshpande/Desktop/CarbonCompass/coach.html))**:
   - Built a 2-column grid template featuring the Sage Profile Card, Sustainability Health Snapshot, What Sage Knows Memory Panel, and AI Insight cards.
   - Wrote dynamic typing status indicators and suggested quick prompt chips.
2. **Onboarding Empty State**:
   - Added a friendly empty state panel to redirect unassessed users to the onboarding quiz.
3. **Sage Buddy Companion ([coach.css](file:///c:/Users/Sarthak%20Deshpande/Desktop/CarbonCompass/styles/coach.css))**:
   - Created a glowing glass-orb assistant floating next to the input.
   - Programmed with responsive float, typing rapid bob, message pulse, and idle blinks/sparkles.
4. **Milestone Celebrations & Persistence**:
   - Restores the last 20 messages on refresh.
   - Detects promotions, streaks, and achievements, triggering gold-bordered celebration bubbles.
5. **Gemini API Integration**:
   - Connects to `/api/coach` backend route. Resolves model configuration settings using the `gemini-2.5-flash` model.

---

## 2. Impact Simulator (`/simulator`)

### Key Implementations

1. **Skeleton and Grid Layout ([simulator.html](file:///c:/Users/Sarthak%20Deshpande/Desktop/CarbonCompass/simulator.html))**:
   - Crafted a premium 2-column dashboard:
     - **Left Column**: Scenario Preset Buttons and category sliders (Transport, Diet, Energy, Shopping, Travel).
     - **Right Column**: Circular projected score SVG gauge, Current vs. Simulated emissions bar charts, Equivalency cards, Recommended next mission, and Pledge commit panels.
2. **Aesthetic Styling ([styles/simulator.css](file:///c:/Users/Sarthak%20Deshpande/Desktop/CarbonCompass/styles/simulator.css))**:
   - Implemented high-depth glassmorphic card panels, glowing ranges, custom neon thumb controls, comparison progress lines, and responsive layouts that stack vertically on mobile.
   - **Glassmorphism Pass**: Enclosed every major section (Recommended Scenarios, Lifestyle Sliders, Category Comparison, Gauge, and Commit panels) inside premium glass cards matching Dashboard, Challenges, and AI Coach page styling exactly. Wrote 1px separator dividers between slider groups, hover elevates (`transform: translateY(-2px); transition: 0.3s ease`), and active slider highlight glows.
3. **Routing Bypass ([js/utils/router.js](file:///c:/Users/Sarthak%20Deshpande/Desktop/CarbonCompass/js/utils/router.js))**:
   - Excluded `/coach` and `/simulator` from the strict unassessed auto-redirect, allowing users to stay on these screens and see premium onboarding cards.
4. **Calculations & Math ([js/pages/simulator.js](file:///c:/Users/Sarthak%20Deshpande/Desktop/CarbonCompass/js/pages/simulator.js))**:
   - Aligns simulated answers directly with [carbonCalculator.js](file:///c:/Users/Sarthak%20Deshpande/Desktop/CarbonCompass/js/services/carbonCalculator.js) to avoid any score calculation mismatch.
   - Translates slider positions to matching assessment question option indexes.
5. **Scenario Presets**:
   - Added quick-preset configuration cards:
     - **Eco Starter**: Light, easy footprint tweaks.
     - **Green Commuter**: Swaps driving for transit/cycling and zero annual flights.
     - **Plant-Powered**: Sets diet to Fully Vegan and occasionally buys new clothing/electronics.
     - **Net-Zero Explorer**: Maximizes all green lifestyle adjustments to the absolute cleanest options.
6. **Equivalency Calculations**:
   - Translates CO₂ savings into real-world equivalents:
     - **🌳 Trees Saved**: $1\text{ tree} \approx 22\text{ kg CO}_2\text{ absorbed / yr}$.
     - **🚗 Cars Removed**: $1\text{ car} \approx 4,600\text{ kg CO}_2\text{ emitted / yr}$.
     - **💡 Energy Saved**: Estimated from home energy CO₂ savings, where $1\text{ kWh} \approx 0.38\text{ kg CO}_2\text{ emitted}$.
7. **Commit Pledges & Active Challenge Integration**:
   - Saves committed simulations to Firestore/localStorage under `simulation/latest` and displays history on load.
   - Selects the category with the **biggest simulated improvement** and automatically activates its matching default challenge:
     - Transport -> `challenge_carpool` (Transit Day)
     - Diet -> `challenge_veggie` (Plant-Powered Weekend)
     - Energy -> `challenge_unplug` (Phantom Power Sweep)
     - Shopping -> `challenge_thrift` (Second-Hand First)
   - Awards the legendary **`CARBON_SHREDDER`** (Carbon Saver) badge if projected score improves by $\ge 15$ points OR annual CO₂ savings exceed $1,000\text{ kg}$.
   - Triggers a full-screen canvas particle explosion and success toast notification on commit.

---

## 3. Sustainability Profile Passport (`/profile`)

### Key Implementations

1. **Double-Column Grid Layout ([profile.html](file:///c:/Users/Sarthak%20Deshpande/Desktop/CarbonCompass/profile.html))**:
   - Re-balanced layout for vertical heights. The Left column aggregates portfolio statistics (Identity, Streaks, and Legacy card), while the Right column aggregates gamified progression metrics (Achievements Showcase, Current Goals, and Journey Timeline).
   - Increased card margins and spacing (`gap: 40px`) to prevent card overlaps and create consistent margins.
2. **Hero Passport Redesign & Visual Effects ([styles/profile.css](file:///c:/Users/Sarthak%20Deshpande/Desktop/CarbonCompass/styles/profile.css))**:
   - **Prominent Avatar**: Upgraded avatar size to `110px` with a rotating, pulsing radial gradient glow filter (`avatar-bg-glow`) behind the wrapper.
   - **Local Floating Particles**: Integrated 6 CSS-animated floating particle nodes that drift upward and fade inside the Hero container.
   - **Archetype and Rank Glows**: Repositioned the Rank badge and Archetype badge under the XP bar. Enhanced them with faint background glows and level-based emojis (🌱, 🌍, 🌳, ♻️).
   - **XP Progression**: Styled the progress bar track with a glowing border and a neon gradient fill featuring an animated scan shimmer effect and a glowing cursor tip.
3. **SVG Passport Progress Circle**:
   - Upgraded the profile completion circle to an SVG path.
   - Positioned **5 milestone ticks** around the circular ring path (Assessment, Challenge, Badge, Level 2, Streak). Ticks light up green with a neon glow once their corresponding checkbox requirement is complete.
4. **Interactive Achievement Modals ([js/pages/profile.js](file:///c:/Users/Sarthak%20Deshpande/Desktop/CarbonCompass/js/pages/profile.js))**:
   - Unlocked badges display custom border glows mapped to badge rarity (Common = green, Rare = blue, Epic = purple, Legendary = gold).
   - Locked badges appear with a dashed border and a padlock symbol overlay.
   - Clicking badges opens a premium glass modal showing large artwork, requirements, earned date (if unlocked), XP rewards (+100 XP, +150 XP, etc.), and a progress track for locked achievements (e.g., `2 / 3 Days` for Streaks).
5. **Milestone Journey Storytelling**:
   - Sized timeline node bubbles at `42px` and centered them on the timeline line.
   - Color-coded timeline content bubbles using category-specific accent left borders and glow highlights:
     - 📋 Assessment Completed (Green accent)
     - 🏆 First Badge Earned (Gold accent)
     - 🎯 First Challenge Completed (Teal accent)
     - ⚡ Carbon Saver Unlocked (Orange accent)
     - 🌍 Level Up (Purple accent)
6. **Themed Stats Counters & Hover Tints**:
   - Stats boxes inside the Legacy Card are styled with left border highlights and gradient accents (Green for CO₂ saved, yellow for active days, teal for simulator pledges).
   - Streak counters scale up (`scale(1.02)`) and light up colored shadows on hover (orange for streaks, cyan for active missions).

---

## 4. Final UI Polish & Deployment Readiness Pass

### Key Implementations

1. **Global Spacing & CSS Centralization**:
   - Relocated duplicate `.glass-panel` and `.glass-panel:hover` styles from `dashboard.css`, `profile.css`, `simulator.css`, and `coach.css` to `components.css`.
   - Set consistent gutters and margins. Cards now have standard vertical and horizontal spacing to prevent overlaps or touching cards.
2. **Responsive Navigation Hamburger Upgrade**:
   - Replaced static mobile links in `navbar.js` with a responsive collapse mechanism.
   - Wired up click event handlers on mobile viewports (<768px) that toggle a `.open` class and update screen reader accessibility state (`aria-expanded`).
   - Standardized layout transitions changing the hamburger icon bars into a clean visual "X" when active.
   - Styled an active neon pulse ring around the header profile avatar for highlighted page consistency.
3. **Scroll Entrance & Animations**:
   - Wired up the lightweight `initScrollReveal` IntersectionObserver in `js/utils/helpers.js` to observe elements using the `.reveal-on-scroll` class, fading and sliding them into view smoothly.
   - Converted static delayed cards in `profile.html` to utilize class-based stagger selectors (`stagger-1` to `stagger-6`) and viewport scroll triggers.
4. **Premium Error Alerts**:
   - Built a sleek, glassmorphic `.alert-card` layout inside `components.css` displaying an orange/red alert icon, custom title, explanation text, and an interactive "Retry" button.
   - Modified catch-blocks in `profile.js`, `simulator.js`, `dashboard.js`, and `challenges.js` to remove redundant console artifacts and dynamically construct these retry states on database failures.
5. **Code Sanitization**:
   - Cleaned up redundant developer `console.log` statements in all page scripts and firestore interfaces.

---

## 5. Verification & Testing

### Automated Tests
- Ran the Jest test suite:
  `npm test`
- **Result**: All tests pass successfully without regression.

### Manual Scenarios Verified
1. **Unassessed Onboarding Card**: Verified that an unassessed user is not redirected, but sees a card saying "Complete your carbon assessment to unlock personalized simulations." with a functioning "Start Assessment" button.
2. **Baseline Loading**: Assessed user loads the page. The sliders load positioned exactly at their baseline assessment choices, showing "Baseline: [Choice Text]" and savings of "0 kg CO₂/yr".
3. **Interactive Presets**: Clicking presets correctly updates slider tracks, triggers score circular sweep animation, and updates charts/equivalency readouts in real-time.
4. **Score & Equivalency Transitions**: Dragging sliders triggers smooth numerical text count animations and updates trees/cars/energy estimates.
5. **Pledge Commit & Badge Unlock**: Committed a simulation saving 1.2 tons of CO₂ and improving score by 16 points. Verified:
   - Full-screen particle burst fires.
   - Achievement toast "Unlocked Achievement: ⚡ Carbon Saver!" triggers.
   - Active challenge is created.
   - Navigation redirects to `/challenges` where the category's challenge is active.
   - Saved simulation log successfully displays on returning.
6. **Responsive Stack**: Tested mobile size layouts. Sliders stack vertically, circular gauge appears above charts, and elements fit without clipping.

---

## 6. Clean URL Routing & Vercel Compatibility

To resolve the redirect loops on localhost and ensure smooth static routing on Vercel:
1. **Vercel Config**: Added `vercel.json` in the root setting `"cleanUrls": true` and configured explicit `rewrites` to route extensionless URL paths directly to their physical HTML files.
2. **Router & Guard Normalize**: Restored `PATH_ASSESSMENT`, `PATH_REPORT`, and `PATH_DASHBOARD` route constants to clean paths, and updated `getNormalizedPath` to strip `.html` extensions on incoming URLs.
3. **Menu Links**: Restored dynamic navigation items in `navbar.js` to extensionless paths.
4. **Page Redirects**: Updated redirects in page scripts (`assessment.js`, `report.js`, `simulator.js`, `dashboard.js`) to use clean paths.
5. **Onboarding & CTA Links**: Updated onboarding buttons in `coach.html`, `dashboard.html`, `profile.html`, `report.html`, and `simulator.html` to clean paths.
