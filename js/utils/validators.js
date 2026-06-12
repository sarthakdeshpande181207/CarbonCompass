/**
 * Validates displayName input
 */
export const validateDisplayName = (name) => {
  if (!name || typeof name !== 'string') return 'Name is required';
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  if (trimmed.length > 50) return 'Name must be under 50 characters';
  return null;
};

/**
 * Validates notification settings map
 */
export const validateNotificationSettings = (settings) => {
  if (!settings || typeof settings !== 'object') return false;
  return 'email' in settings && typeof settings.email === 'boolean';
};

/**
 * Checks if a string is a valid email (mostly useful if custom fields are ever used)
 */
export const validateEmail = (email) => {
  if (!email) return 'Email is required';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'Invalid email format';
  return null;
};
