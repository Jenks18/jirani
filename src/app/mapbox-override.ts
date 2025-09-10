// Global Mapbox CSS detection override - executed before any other code
// This file should be imported first in the component

if (typeof window !== "undefined") {
  // Store original functions before any modifications
  const originalWarn = console.warn;
  const originalError = console.error;

  // Global console override that's more aggressive
  const isMapboxCSSWarning = (message: string) => {
    return message.includes('CSS declarations for Mapbox GL JS') ||
           message.includes('mapbox-gl.css') ||
           message.includes('missing CSS declarations') ||
           message.includes('may cause the map to display incorrectly');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.warn = function(...args: any[]) {
    const message = args.join(' ');
    if (isMapboxCSSWarning(message)) {
      return;
    }
    return originalWarn.apply(console, args);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = function(...args: any[]) {
    const message = args.join(' ');
    if (isMapboxCSSWarning(message)) {
      return;
    }
    return originalError.apply(console, args);
  };

  // Override the tf function specifically mentioned in your stack trace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).tf = function() { return; };
}

export {}; // Make this a module
