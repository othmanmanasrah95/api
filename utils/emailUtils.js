/**
 * Normalizes email addresses for consistent storage and lookup
 * Handles Gmail-specific quirks:
 * - Gmail ignores dots in the local part (before @)
 * - Gmail treats googlemail.com the same as gmail.com
 * 
 * @param {string} email - The email address to normalize
 * @returns {string} - Normalized email address
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return email;
  }

  // Trim whitespace and convert to lowercase
  let normalized = email.trim().toLowerCase();

  // Split email into local and domain parts
  const parts = normalized.split('@');
  if (parts.length !== 2) {
    // Invalid email format, return as-is
    return normalized;
  }

  let [localPart, domain] = parts;

  // Normalize Gmail addresses
  // Gmail treats googlemail.com the same as gmail.com
  if (domain === 'googlemail.com') {
    domain = 'gmail.com';
  }

  // Gmail ignores dots in the local part
  if (domain === 'gmail.com') {
    // Remove all dots from the local part
    localPart = localPart.replace(/\./g, '');
    
    // Also handle + aliasing (remove everything after +)
    // e.g., user+tag@gmail.com becomes user@gmail.com
    const plusIndex = localPart.indexOf('+');
    if (plusIndex !== -1) {
      localPart = localPart.substring(0, plusIndex);
    }
  }

  return `${localPart}@${domain}`;
}

module.exports = {
  normalizeEmail
};



