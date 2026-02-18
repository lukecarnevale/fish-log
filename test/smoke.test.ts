describe('Test infrastructure', () => {
  it('runs a test', () => {
    expect(1 + 1).toBe(2);
  });

  it('can import from src/', () => {
    const { colors } = require('../src/styles/common');
    expect(colors.primary).toBeDefined();
  });
});
