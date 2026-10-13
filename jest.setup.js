require('@testing-library/jest-dom');

// Texts come from the translation files: load them (French) for every test.
require('./src/lib/i18n');

// jsdom does not implement matchMedia, which the responsive hooks rely on.
// (Skipped by the few tests that run without a DOM, as the server does.)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
