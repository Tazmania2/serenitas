/**
 * Brazilian Formatting Utilities
 * 
 * Functions to format dates, times, currency, phone numbers, and CPF
 * according to Brazilian standards.
 * 
 * Requirements: 13.2, 13.3, 13.4, 13.5, 13.7
 */

const { constants } = require('../config');

/**
 * Format date to Brazilian format (DD/MM/YYYY)
 * 
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';

  return new Intl.DateTimeFormat(constants.BRAZIL.LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: constants.BRAZIL.TIMEZONE
  }).format(dateObj);
}

/**
 * Format time to Brazilian format (HH:MM)
 * 
 * @param {Date|string} date - Date/time to format
 * @returns {string} Formatted time string
 */
function formatTime(date) {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';

  return new Intl.DateTimeFormat(constants.BRAZIL.LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: constants.BRAZIL.TIMEZONE
  }).format(dateObj);
}

/**
 * Format date and time to Brazilian format (DD/MM/YYYY HH:MM)
 * 
 * @param {Date|string} date - Date/time to format
 * @returns {string} Formatted date and time string
 */
function formatDateTime(date) {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';

  return new Intl.DateTimeFormat(constants.BRAZIL.LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: constants.BRAZIL.TIMEZONE
  }).format(dateObj);
}

/**
 * Format currency to Brazilian Real (R$)
 * 
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '';

  return new Intl.NumberFormat(constants.BRAZIL.LOCALE, {
    style: 'currency',
    currency: constants.BRAZIL.CURRENCY
  }).format(amount);
}

/**
 * Format phone number to Brazilian format
 * (XX) XXXXX-XXXX for mobile or (XX) XXXX-XXXX for landline
 * 
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
function formatPhone(phone) {
  if (!phone) return '';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Check length and format accordingly
  if (cleaned.length === 11) {
    // Mobile: (XX) XXXXX-XXXX
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleaned.length === 10) {
    // Landline: (XX) XXXX-XXXX
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  // Return original if format is not recognized
  return phone;
}

/**
 * Format CPF to Brazilian format (XXX.XXX.XXX-XX)
 * 
 * @param {string} cpf - CPF to format
 * @returns {string} Formatted CPF
 */
function formatCPF(cpf) {
  if (!cpf) return '';

  // Remove all non-digit characters
  const cleaned = cpf.replace(/\D/g, '');

  // Check length
  if (cleaned.length !== 11) {
    return cpf; // Return original if not 11 digits
  }

  // Format: XXX.XXX.XXX-XX
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Format number with Brazilian decimal separator
 * 
 * @param {number} number - Number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number
 */
function formatNumber(number, decimals = 2) {
  if (number === null || number === undefined) return '';

  return new Intl.NumberFormat(constants.BRAZIL.LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
}

/**
 * Parse Brazilian date format (DD/MM/YYYY) to Date object
 * 
 * @param {string} dateStr - Date string in DD/MM/YYYY format
 * @returns {Date|null} Date object or null if invalid
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month, day);

  // Validate date
  if (isNaN(date.getTime())) return null;
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null; // Invalid date (e.g., 31/02/2024)
  }

  return date;
}

/**
 * Format file size to human-readable format
 * 
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return '';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration in minutes to hours and minutes
 * 
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "1h 30min")
 */
function formatDuration(minutes) {
  if (!minutes) return '0min';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}min`;
  } else if (mins === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${mins}min`;
  }
}

/**
 * Get relative time in Portuguese (e.g., "há 2 horas", "em 3 dias")
 * 
 * @param {Date|string} date - Date to compare
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);
  const isPast = diffMs < 0;

  // Less than a minute
  if (diffSec < 60) {
    return isPast ? 'há poucos segundos' : 'em poucos segundos';
  }

  // Less than an hour
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return isPast 
      ? `há ${diffMin} minuto${diffMin > 1 ? 's' : ''}`
      : `em ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
  }

  // Less than a day
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return isPast
      ? `há ${diffHour} hora${diffHour > 1 ? 's' : ''}`
      : `em ${diffHour} hora${diffHour > 1 ? 's' : ''}`;
  }

  // Less than a month
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) {
    return isPast
      ? `há ${diffDay} dia${diffDay > 1 ? 's' : ''}`
      : `em ${diffDay} dia${diffDay > 1 ? 's' : ''}`;
  }

  // Less than a year
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) {
    return isPast
      ? `há ${diffMonth} ${diffMonth > 1 ? 'meses' : 'mês'}`
      : `em ${diffMonth} ${diffMonth > 1 ? 'meses' : 'mês'}`;
  }

  // Years
  const diffYear = Math.floor(diffMonth / 12);
  return isPast
    ? `há ${diffYear} ano${diffYear > 1 ? 's' : ''}`
    : `em ${diffYear} ano${diffYear > 1 ? 's' : ''}`;
}

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  formatCurrency,
  formatPhone,
  formatCPF,
  formatNumber,
  parseDate,
  formatFileSize,
  formatDuration,
  getRelativeTime
};
