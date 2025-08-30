import "@testing-library/jest-dom";

// Mock ResizeObserver for D3 components
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-ignore
global.ResizeObserver = ResizeObserver;

// Mock SVG methods for D3
// @ts-ignore
global.SVGElement = class {
  getBBox() {
    return { width: 100, height: 100, x: 0, y: 0 };
  }
  getComputedTextLength() {
    return 100;
  }
};

// Mock window.matchMedia - jest is available globally
Object.defineProperty(window, "matchMedia", {
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
