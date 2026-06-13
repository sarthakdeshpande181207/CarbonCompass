import { calculateLevel } from '../utils/helpers.js';

// Maximum size of message history in current session memory
const MAX_HISTORY_LENGTH = 20;

/**
 * Service to manage AI Coach conversation history, context gathering, and response generation.
 */
export class CoachService {
  constructor() {
    this.history = []; // Array of { role: 'user' | 'model', content: string }
  }

  /**
   * Clears session history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Adds a message to history, maintaining the rolling buffer size limit
   */
  addMessage(role, content) {
    this.history.push({ role, content });
    if (this.history.length > MAX_HISTORY_LENGTH) {
      this.history.shift(); // remove oldest message
    }
  }

  /**
   * Compiles user parameters into a structured context object
   */
  compileContext(assessment, challenges, badges, streaks, profile) {
    const scoreVal = assessment ? assessment.planetHealthScore || 0 : 0;
    const levelInfo = profile && typeof profile.xp === 'number' ? calculateLevel(profile.xp) : calculateLevel(0);
    const completedChallenges = challenges ? challenges.filter(c => c.status === 'completed') : [];
    const activeChallenge = challenges ? challenges.find(c => c.status === 'active') : null;
    
    return {
      name: profile?.displayName || 'Eco Pioneer',
      score: scoreVal,
      archetype: assessment?.persona?.name || 'Eco Pioneer',
      weakestCategory: assessment?.weakestArea || 'Transport',
      strongestCategory: assessment?.strongestArea || 'Energy Usage',
      xp: profile?.xp || 0,
      level: levelInfo.level,
      levelTitle: levelInfo.title,
      nextLevelXp: levelInfo.nextLevelXp,
      xpIntoLevel: levelInfo.xpIntoLevel,
      streakCount: streaks?.current || 0,
      completedChallengesCount: completedChallenges.length,
      badgesCount: badges ? badges.length : 0,
      activeChallengeTitle: activeChallenge ? activeChallenge.title : 'None',
      assessmentData: assessment || null
    };
  }

  /**
   * Generates a context-aware dynamic welcome message from Sage
   */
  getWelcomeMessage(context) {
    const name = context.name;
    const score = context.score;
    const streak = context.streakCount;
    
    if (streak > 0) {
      return {
        response: `Great to see you again, ${name}! Your ${streak}-day active habit streak is going strong. We are currently tracking the "${context.activeChallengeTitle}" challenge. Ready to review your sustainability impact today?`,
        insight: `You are currently at Level ${context.level} (${context.levelTitle}) with ${context.xp} total XP.`,
        recommendedAction: context.activeChallengeTitle !== 'None' ? `Continue logging progress for your active challenge: "${context.activeChallengeTitle}".` : "Choose a new challenge to kick off your week!",
        challengeSuggestion: context.activeChallengeTitle === 'None' ? "challenge_carpool" : null
      };
    }

    if (score >= 80) {
      return {
        response: `Welcome, ${name}! As an exemplary "${context.archetype}" with a Planet Health Score of ${score}, your lifestyle choices are leading the way. Let's look into some advanced carbon optimization options today. What area should we explore?`,
        insight: `Your strongest category is ${context.strongestCategory}, showing highly optimized emissions.`,
        recommendedAction: `Focus on sharing your green habits with others or look into community-level advocacy.`,
        challengeSuggestion: "challenge_thrift"
      };
    }

    if (score > 0) {
      return {
        response: `Hi ${name}! I'm Sage, your sustainability coach. I've analyzed your footprint report and see you are currently a "${context.archetype}" with a Planet Health Score of ${score}. I can help you find simple habits and challenges to reduce your footprint. What would you like to discuss first?`,
        insight: `Your report shows ${context.weakestCategory} currently has the largest room for improvement.`,
        recommendedAction: `Let's target your emissions in ${context.weakestCategory} to raise your score!`,
        challengeSuggestion: "challenge_unplug"
      };
    }

    return {
      response: `Hello! I'm Sage, your personal sustainability advisor. To get started, please complete the onboarding carbon assessment. That will give me the data I need to recommend custom lifestyle tweaks and help you build eco-friendly habits.`,
      insight: null,
      recommendedAction: "Complete the 13-question quick assessment.",
      challengeSuggestion: null
    };
  }

  /**
   * Selects contextual suggested prompts based on the user's weakest carbon category
   */
  getSuggestedPrompts(context) {
    const weakest = context.weakestCategory ? context.weakestCategory.toLowerCase() : '';
    
    if (weakest.includes('transport') || weakest.includes('travel')) {
      return [
        "How can I reduce transport emissions?",
        "Is cycling better than public transport?",
        "What is my biggest carbon impact?",
        "Give me a challenge for today."
      ];
    }
    if (weakest.includes('diet') || weakest.includes('food')) {
      return [
        "How can I reduce food waste?",
        "What's the carbon footprint of meat?",
        "Give me a diet-related challenge.",
        "How can I improve my score?"
      ];
    }
    if (weakest.includes('energy') || weakest.includes('heat') || weakest.includes('power')) {
      return [
        "How can I save home energy?",
        "What appliances waste the most energy?",
        "Give me an energy-saving challenge.",
        "How does my level improve?"
      ];
    }
    if (weakest.includes('shop') || weakest.includes('waste') || weakest.includes('goods')) {
      return [
        "How does fast fashion affect carbon?",
        "How can I divert more waste?",
        "What is second-hand shopping saving?",
        "How can I earn more badges?"
      ];
    }
    
    // Default general prompts
    return [
      "How can I improve my score?",
      "Give me a challenge for today.",
      "What is my biggest carbon impact?",
      "How can I save energy?"
    ];
  }

  /**
   * Triggers response generation, trying Gemini proxy and falling back to local advisor
   */
  async generateResponse(userMessage, context) {
    this.addMessage('user', userMessage);
    let output = null;

    try {
      // Attempt to communicate with backend Gemini proxy
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: this.history.slice(0, -1), // pass history excluding the message just added
          context: {
            name: context.name,
            score: context.score,
            archetype: context.archetype,
            strongestCategory: context.strongestCategory,
            weakestCategory: context.weakestCategory,
            activeChallenge: context.activeChallengeTitle,
            xp: context.xp,
            level: context.level,
            streakCount: context.streakCount,
            badgesCount: context.badgesCount,
            completedChallengesCount: context.completedChallengesCount,
            breakdown: context.assessmentData?.carbonBreakdown || {}
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.response) {
          // If Gemini returned a structured response or plain string
          output = this.parseResponseText(data.response, context);
        }
      } else {
        console.warn("CoachService: API response failed, executing local fallback logic");
      }
    } catch (e) {
      console.error("CoachService: Error calling Gemini API Proxy:", e);
    }

    // Local rule-based advisor fallback if server proxy was unconfigured or failed
    if (!output) {
      output = this.generateLocalFallback(userMessage, context);
    }

    this.addMessage('model', output.response);
    return output;
  }

  /**
   * Parses text returned from Gemini API, supporting both plain string and structured JSON formats
   */
  parseResponseText(text, context) {
    try {
      // Try to parse if Gemini outputted JSON
      const parsed = JSON.parse(text);
      if (parsed.response) {
        return {
          response: parsed.response,
          insight: parsed.insight || null,
          recommendedAction: parsed.recommendedAction || null,
          challengeSuggestion: parsed.challengeSuggestion || null
        };
      }
    } catch (e) {
      // Return as plain conversational text if not JSON
    }

    return {
      response: text,
      insight: null,
      recommendedAction: null,
      challengeSuggestion: null
    };
  }

  /**
   * Fallback rule-based local expert reasoning engine
   */
  generateLocalFallback(message, context) {
    const text = message.toLowerCase();
    const name = context.name;
    const weakest = context.weakestCategory || 'Transport';
    const strongest = context.strongestCategory || 'Energy Usage';

    // 1. Progression modifiers
    let progressionNote = "";
    if (context.level >= 4) {
      progressionNote = ` As a Level ${context.level} Climate Champion, you are aiming for advanced micro-habits.`;
    } else if (context.level <= 1) {
      progressionNote = ` As an Eco Explorer starting your journey, focus on small, consistent steps.`;
    }

    // 2. Query Routing
    if (text.includes('energy') || text.includes('electricity') || text.includes('power') || text.includes('appliances')) {
      const deductionVal = context.assessmentData?.scoreBreakdown?.energy || -6;
      return {
        response: `Hi ${name}!${progressionNote} Your home energy sector currently deducts about ${Math.abs(deductionVal)} points from your score. Standard utility grids have high emission intensities. Reducing phantom loads (unplugging chargers when not in use) and shifting your thermostat by just 2°C can reduce energy emissions significantly.`,
        insight: `Energy efficiency habits are the fastest way to save both money and carbon.`,
        recommendedAction: `Unplug 5 idle devices in your home today.`,
        challengeSuggestion: "challenge_unplug"
      };
    }

    if (text.includes('transport') || text.includes('car') || text.includes('drive') || text.includes('mileage') || text.includes('transit') || text.includes('cycle') || text.includes('bike')) {
      const deductionVal = context.assessmentData?.scoreBreakdown?.transport || -10;
      return {
        response: `Hello ${name}! Transportation is a primary carbon source, accounting for ${Math.abs(deductionVal)} points of deduction in your footprint. Swapping a daily car commute for walking, cycling, or public transit is a high-yield decision. Saving 8.5 kg of CO₂ per transit day makes a notable annual dent.`,
        insight: `Walking and cycling have zero operational footprint and double as fitness habits.`,
        recommendedAction: `Plan a route for public transit or walking for your next commute.`,
        challengeSuggestion: "challenge_carpool"
      };
    }

    if (text.includes('diet') || text.includes('food') || text.includes('meat') || text.includes('vegan') || text.includes('vegetarian') || text.includes('waste')) {
      return {
        response: `Sourcing local foods and lowering animal product consumption are high-impact variables, ${name}. Shifting to low-meat or flexitarian meals is estimated to reduce dietary emissions by 30% to 50%. Diverting spoiled food to compost also avoids high-impact methane release in landfills.`,
        insight: `Plant-based diets have a significantly lower land-use and greenhouse gas intensity.`,
        recommendedAction: `Pledge a fully veggie weekend or plant-based meal today.`,
        challengeSuggestion: "challenge_veggie"
      };
    }

    if (text.includes('shopping') || text.includes('clothing') || text.includes('buy') || text.includes('fashion') || text.includes('waste') || text.includes('recycle') || text.includes('compost')) {
      return {
        response: `Hey ${name}! Production and waste diversion contribute heavily to individual impacts. Committing to a "Second-Hand First" guideline for clothing or appliances helps save up to 12 kg of CO₂ per week. Setting up a dedicated home sorting/recycling system will also minimize landfill emissions.`,
        insight: `Reusing and thrifting keeps manufacturing energy footprint out of the equation.`,
        recommendedAction: `Sort plastic, paper, and metal waste into recycling containers today.`,
        challengeSuggestion: "challenge_thrift"
      };
    }

    if (text.includes('flight') || text.includes('travel') || text.includes('plane') || text.includes('trip')) {
      return {
        response: `Long-distance travel is highly carbon-dense. A single long-haul round-trip flight can emit over 1,500 kg of CO₂. Consider consolidating business travel or planning local "staycations" to keep travel emissions at bay, ${name}.`,
        insight: `Flights carry the highest emissions per passenger-mile of any transit option.`,
        recommendedAction: `Calculate travel distances and purchase carbon offsets for mandatory flights.`,
        challengeSuggestion: null
      };
    }

    if (text.includes('score') || text.includes('improve') || text.includes('weak') || text.includes('weakest')) {
      return {
        response: `To maximize your Planet Health Score, Sarthak, focus on optimizing your weakest area: ${weakest}. Shifting habits in this category will yield the largest score improvements and potentially promote you from "${context.archetype}" to a higher title.`,
        insight: `Your strongest category is ${strongest}, which you should maintain.`,
        recommendedAction: `Choose an active challenge matching your weakest area: ${weakest}.`,
        challengeSuggestion: weakest.toLowerCase().includes('transport') ? "challenge_carpool" : "challenge_unplug"
      };
    }

    if (text.includes('streak') || text.includes('habit') || text.includes('day') || text.includes('badge') || text.includes('level') || text.includes('xp')) {
      return {
        response: `Every day you log progress helps build your habit streak, currently at ${context.streakCount} days. You are at Level ${context.level} (${context.levelTitle}) with ${context.xp} total XP. You have earned ${context.badgesCount} badges so far! Keep up the great consistency.`,
        insight: `Consistency is the secret to locking in permanent lifestyle changes.`,
        recommendedAction: `Keep checking in daily and log your active challenge tasks.`,
        challengeSuggestion: null
      };
    }

    // Default Sage advice
    return {
      response: `I'm here to help, ${name}! You can ask me specific questions about saving energy, reducing transportation impact, adopting veggie diets, thrifting, or tracking your challenge streaks. Let's make small, sustainable choices together.`,
      insight: `Sage tip: Small daily improvements compound into huge yearly carbon reductions.`,
      recommendedAction: `Ask a specific question like "How can I reduce transport emissions?"`,
      challengeSuggestion: null
    };
  }
}
