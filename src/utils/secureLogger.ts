/**
 * Secure logging utility to prevent sensitive data exposure
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const isDevelopment = import.meta.env.DEV;

/**
 * Mask sensitive strings for logging
 */
const maskSensitiveData = (value: string): string => {
  if (value.length <= 8) {
    return '***';
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

/**
 * Secure logger that masks sensitive data in production
 */
export const secureLogger = {
  error: (message: string, data?: any) => {
    console.error(message, isDevelopment ? data : sanitizeLogData(data));
  },
  
  warn: (message: string, data?: any) => {
    console.warn(message, isDevelopment ? data : sanitizeLogData(data));
  },
  
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.info(message, data);
    }
  },
  
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(message, data);
    }
  },

  // Secure versions for sensitive operations
  transaction: (message: string, signature?: string) => {
    if (isDevelopment && signature) {
      console.log(message, `signature: ${maskSensitiveData(signature)}`);
    } else {
      console.log(message);
    }
  },

  wallet: (message: string, address?: string) => {
    if (isDevelopment && address) {
      console.log(message, `wallet: ${maskSensitiveData(address)}`);
    } else {
      console.log(message);
    }
  },

  token: (message: string) => {
    if (isDevelopment) {
      console.log(message);
    }
  }
};

/**
 * Sanitize log data by removing or masking sensitive fields
 */
const sanitizeLogData = (data: any): any => {
  if (!data) return data;
  
  if (typeof data === 'string') {
    // Check if it looks like sensitive data
    if (data.length > 40 && (data.includes('signature') || data.includes('key'))) {
      return maskSensitiveData(data);
    }
    return data;
  }
  
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Mask sensitive fields
      if (lowerKey.includes('signature') || 
          lowerKey.includes('private') || 
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('key')) {
        sanitized[key] = typeof value === 'string' ? maskSensitiveData(value) : '***';
      } else if (lowerKey.includes('wallet') || lowerKey.includes('address')) {
        sanitized[key] = typeof value === 'string' ? maskSensitiveData(value) : value;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return data;
};