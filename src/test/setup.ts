import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement scrollIntoView — mock it globally so components
// that call it in useEffect don't throw during tests.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
