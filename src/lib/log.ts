/** Verbose diagnostics are off by default so message content and phone numbers never reach production logs. */
export const debug = (...args: unknown[]): void => {
  if (process.env.LOG_LEVEL === 'debug') console.log(...args);
};

/** Mask all but the last 3 digits of a phone number for log lines. */
export const maskPhone = (phone: string): string => phone.replace(/\d(?=\d{3})/g, '*');
