// src/utils/validators.js

export const validateEmail = (email) => {
  if (typeof email !== 'string') return false;

  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase());
};

export const validatePassword = (password) => {
  if (typeof password !== 'string') return false;

  // Minimum 8 characters (you can strengthen this later)
  return password.length >= 8;
};

export const validateAmount = (amount, min = 0) => {
  const num = Number(amount);
  return Number.isFinite(num) && num >= min;
};

export const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
};
