jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), debug: jest.fn() }));
const ToolRegistry = require('../services/toolRegistry');

test('every tool declares at least one property (Gemini rejects empty object schemas)', () => {
  for (const t of ToolRegistry.getToolsSchema()) {
    expect(Object.keys(t.function.parameters.properties || {}).length).toBeGreaterThan(0);
    expect(t.function.parameters.properties.householdId).toBeUndefined();
  }
});
