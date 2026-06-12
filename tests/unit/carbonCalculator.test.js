import { calculateCarbonFootprint } from '../../js/services/carbonCalculator.js';
import { ASSESSMENT_QUESTIONS } from '../../js/utils/constants.js';

describe('Carbon Calculator Engine', () => {
  
  test('should calculate correct scores for low impact answers (Eco Explorer)', () => {
    // Generate answers using the index 0 option (usually lowest footprint / highest points)
    const answers = {};
    ASSESSMENT_QUESTIONS.forEach(q => {
      answers[q.id] = 0;
    });

    const result = calculateCarbonFootprint(answers);

    expect(result.planetHealthScore).toBe(100);
    expect(result.persona.id).toBe('ECO_EXPLORER');
    expect(result.strongestArea).toBeDefined();
    expect(result.weakestArea).toBeDefined();
    
    // Low emissions check
    Object.keys(result.carbonBreakdown).forEach(cat => {
      expect(result.carbonBreakdown[cat]).toBeLessThanOrEqual(5);
    });
  });

  test('should calculate correct scores for high impact answers (Carbon Heavyweight)', () => {
    // Generate answers using the last option for each question (highest footprint / 0 points)
    const answers = {};
    ASSESSMENT_QUESTIONS.forEach(q => {
      answers[q.id] = q.options.length - 1;
    });

    const result = calculateCarbonFootprint(answers);

    // Some questions might have > 0 points as minimum, but score should be very low
    expect(result.planetHealthScore).toBeLessThanOrEqual(20);
    expect(result.persona.id).toBe('CARBON_HEAVYWEIGHT');
  });

  test('should handle empty or missing answers gracefully by applying fallback', () => {
    const answers = {}; // no answers provided
    
    const result = calculateCarbonFootprint(answers);
    
    expect(result.planetHealthScore).toBeDefined();
    expect(result.persona).toBeDefined();
    expect(result.carbonBreakdown).toBeDefined();
    expect(result.scoreBreakdown).toBeDefined();
  });
});
