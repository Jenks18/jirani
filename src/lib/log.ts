export const debug = (...args: unknown[]): void => {
  if (process.env.LOG_LEVEL === 'debug') console.log(...args);
};

export const maskPhone = (phone: string): string => phone.replace(/\d(?=\d{3})/g, '*');
