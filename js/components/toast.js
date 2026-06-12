import { showToast as helperShowToast } from '../utils/helpers.js';

/**
 * Toast Notification System wrapper
 * Exposes toast alerts for frontend modules.
 */
export const showToast = (message, type = 'success', duration = 4000) => {
  helperShowToast(message, type, duration);
};

export default showToast;
