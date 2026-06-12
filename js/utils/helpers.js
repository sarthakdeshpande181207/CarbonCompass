/**
 * Format date into readable string (e.g. June 12, 2026)
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Safely format numbers with fixed decimal places
 */
export const formatNumber = (num, decimals = 1) => {
  const val = Number(num);
  return isNaN(val) ? '0' : val.toFixed(decimals);
};

/**
 * Toast notification trigger
 * Type can be: 'info' | 'success' | 'warning' | 'error'
 */
export const showToast = (message, type = 'success', duration = 4000) => {
  let container = document.querySelector('.toast-container');
  
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Icon picker
  let emoji = '🔔';
  if (type === 'success') emoji = '✅';
  else if (type === 'error') emoji = '❌';
  else if (type === 'warning') emoji = '⚠️';
  else if (type === 'info') emoji = '💡';

  toast.innerHTML = `
    <span>${emoji}</span>
    <div>${message}</div>
  `;

  container.appendChild(toast);
  
  // Trigger CSS transition
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300); // match CSS transition duration
  }, duration);
};

/**
 * Escapes HTML to prevent XSS
 */
export const escapeHTML = (str) => {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
};

/**
 * Calculates level based on XP thresholds:
 * - Level 1 (Eco Explorer): 0 XP
 * - Level 2 (Conscious Commuter): 100 XP
 * - Level 3 (Green Guardian): 300 XP
 * - Level 4 (Climate Champion): 600 XP
 * - Level 5 (Planet Hero): 1000 XP
 */
export const calculateLevel = (xp) => {
  const score = Number(xp) || 0;
  const thresholds = [
    { level: 1, name: 'Eco Explorer', minXp: 0, maxXp: 100 },
    { level: 2, name: 'Conscious Commuter', minXp: 100, maxXp: 300 },
    { level: 3, name: 'Green Guardian', minXp: 300, maxXp: 600 },
    { level: 4, name: 'Climate Champion', minXp: 600, maxXp: 1000 },
    { level: 5, name: 'Planet Hero', minXp: 1000, maxXp: Infinity }
  ];
  
  for (let i = 0; i < thresholds.length; i++) {
    const t = thresholds[i];
    if (score >= t.minXp && score < t.maxXp) {
      const progress = t.maxXp === Infinity ? 100 : ((score - t.minXp) / (t.maxXp - t.minXp)) * 100;
      const nextText = t.maxXp === Infinity ? 'Max Level' : `${t.maxXp - score} XP to Level ${t.level + 1}`;
      return {
        level: t.level,
        name: t.name,
        progress,
        nextText,
        minXp: t.minXp,
        maxXp: t.maxXp
      };
    }
  }
  
  return {
    level: 5,
    name: 'Planet Hero',
    progress: 100,
    nextText: 'Max Level reached',
    minXp: 1000,
    maxXp: Infinity
  };
};
