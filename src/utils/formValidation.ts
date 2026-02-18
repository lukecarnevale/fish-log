// utils/formValidation.ts

/**
 * Validates email format with TLD checking
 * @param email - The email address to validate
 * @returns Error message if invalid, undefined if valid (or empty)
 */
export const validateEmail = (email: string): string | undefined => {
  if (!email.trim()) return undefined; // Don't show error for empty (will be caught on submit)

  const trimmedEmail = email.trim().toLowerCase();

  // Reject consecutive dots anywhere in the email
  if (trimmedEmail.includes('..')) {
    return "Please enter a valid email address";
  }

  // More robust email regex:
  // - Local part: letters, numbers, dots, hyphens, underscores, plus signs
  // - Domain: letters, numbers, hyphens, dots
  // - TLD: 2-6 letters only (covers .com, .org, .io, .museum, etc.)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!emailRegex.test(trimmedEmail)) {
    return "Please enter a valid email address";
  }

  // Check for common TLD typos (catches .clm, .con, .cpm, .ocm, .vom, etc.)
  const commonTldTypos = ['.clm', '.con', '.cpm', '.ocm', '.vom', '.gmai', '.gmial', '.gmil', '.comn', '.comm'];
  for (const typo of commonTldTypos) {
    if (trimmedEmail.endsWith(typo)) {
      return "Please check your email address for typos";
    }
  }

  // Check common email providers have correct TLD
  const commonProviders: Record<string, string[]> = {
    'gmail': ['.com'],
    'yahoo': ['.com', '.co.uk', '.ca'],
    'hotmail': ['.com', '.co.uk'],
    'outlook': ['.com'],
    'icloud': ['.com'],
    'aol': ['.com'],
  };

  for (const [provider, validTlds] of Object.entries(commonProviders)) {
    if (trimmedEmail.includes(`@${provider}.`) || trimmedEmail.includes(`@${provider}`)) {
      const hasValidTld = validTlds.some(tld => trimmedEmail.endsWith(`${provider}${tld}`));
      if (!hasValidTld && trimmedEmail.includes(`@${provider}.`)) {
        return `Did you mean @${provider}.com?`;
      }
    }
  }

  return undefined;
};

/**
 * Validates phone number format (10-digit phone)
 * @param phone - The phone number to validate
 * @returns Error message if invalid, undefined if valid (or empty)
 */
export const validatePhone = (phone: string): string | undefined => {
  if (!phone.trim()) return undefined; // Phone is optional
  // Remove formatting to check digit count
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length > 0 && digitsOnly.length < 10) {
    return "Please enter a complete 10-digit phone number";
  }
  return undefined;
};

/**
 * Formats phone number as xxx-xxx-xxxx
 * @param text - The unformatted phone number text
 * @returns Formatted phone number
 */
export const formatPhoneNumber = (text: string): string => {
  const digitsOnly = text.replace(/\D/g, "");
  if (digitsOnly.length <= 3) {
    return digitsOnly;
  } else if (digitsOnly.length <= 6) {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
  } else {
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
  }
};
