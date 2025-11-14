/**
 * Data Encryption Utilities
 * LGPD Requirement 8.10 - AES-256-GCM encryption for sensitive health data
 */

const crypto = require('crypto');
const logger = require('./logger');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * @returns {Buffer} Encryption key
 * @throws {Error} If encryption key is not configured
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY não configurada nas variáveis de ambiente');
  }
  
  // Convert hex string to buffer
  try {
    const keyBuffer = Buffer.from(key, 'hex');
    
    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(`ENCRYPTION_KEY deve ter ${KEY_LENGTH * 2} caracteres hexadecimais (${KEY_LENGTH} bytes)`);
    }
    
    return keyBuffer;
  } catch (error) {
    throw new Error('ENCRYPTION_KEY inválida: deve ser uma string hexadecimal');
  }
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @returns {Object} Encrypted data with iv and authTag
 * @throws {Error} If encryption fails
 */
function encrypt(plaintext) {
  try {
    if (!plaintext) {
      return null;
    }
    
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    logger.error('Erro ao criptografar dados', {
      error: error.message,
      stack: error.stack
    });
    throw new Error('Falha ao criptografar dados sensíveis');
  }
}

/**
 * Decrypt data encrypted with AES-256-GCM
 * @param {Object} encryptedData - Object with encrypted, iv, and authTag
 * @returns {string} Decrypted plaintext
 * @throws {Error} If decryption fails
 */
function decrypt(encryptedData) {
  try {
    if (!encryptedData || !encryptedData.encrypted) {
      return null;
    }
    
    const { encrypted, iv, authTag } = encryptedData;
    
    if (!iv || !authTag) {
      throw new Error('Dados de criptografia incompletos');
    }
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Erro ao descriptografar dados', {
      error: error.message,
      stack: error.stack
    });
    throw new Error('Falha ao descriptografar dados sensíveis');
  }
}

/**
 * Hash data using SHA-256 (one-way, for pseudonymization)
 * @param {string} data - Data to hash
 * @param {string} salt - Optional salt (uses env PSEUDONYM_SALT if not provided)
 * @returns {string} Hex hash
 */
function hash(data, salt = null) {
  try {
    const saltToUse = salt || process.env.PSEUDONYM_SALT || '';
    return crypto
      .createHash('sha256')
      .update(data + saltToUse)
      .digest('hex');
  } catch (error) {
    logger.error('Erro ao gerar hash', {
      error: error.message
    });
    throw new Error('Falha ao gerar hash');
  }
}

/**
 * Generate a random encryption key (for initial setup)
 * @returns {string} Hex-encoded random key
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Encrypt multiple fields in an object
 * @param {Object} obj - Object with fields to encrypt
 * @param {Array<string>} fields - Field names to encrypt
 * @returns {Object} Object with encrypted fields
 */
function encryptFields(obj, fields) {
  const result = { ...obj };
  
  for (const field of fields) {
    if (result[field]) {
      const encrypted = encrypt(result[field]);
      result[`${field}_encrypted`] = encrypted.encrypted;
      result[`${field}_iv`] = encrypted.iv;
      result[`${field}_authTag`] = encrypted.authTag;
      delete result[field]; // Remove plaintext
    }
  }
  
  return result;
}

/**
 * Decrypt multiple fields in an object
 * @param {Object} obj - Object with encrypted fields
 * @param {Array<string>} fields - Original field names
 * @returns {Object} Object with decrypted fields
 */
function decryptFields(obj, fields) {
  const result = { ...obj };
  
  for (const field of fields) {
    const encryptedField = `${field}_encrypted`;
    const ivField = `${field}_iv`;
    const authTagField = `${field}_authTag`;
    
    if (result[encryptedField]) {
      const decrypted = decrypt({
        encrypted: result[encryptedField],
        iv: result[ivField],
        authTag: result[authTagField]
      });
      
      result[field] = decrypted;
      delete result[encryptedField];
      delete result[ivField];
      delete result[authTagField];
    }
  }
  
  return result;
}

module.exports = {
  encrypt,
  decrypt,
  hash,
  generateKey,
  encryptFields,
  decryptFields
};
