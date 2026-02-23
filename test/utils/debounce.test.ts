import { debounce } from '../../src/utils/debounce';

describe('debounce', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('delays function execution by the specified delay', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on subsequent calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);

    debounced();
    jest.advanceTimersByTime(200);
    debounced(); // restart timer
    jest.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the underlying function', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('hello', 42);
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('hello', 42);
  });

  it('uses the latest arguments when called multiple times', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');
    debounced('third');
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });

  it('cancel() prevents execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced.cancel();
    jest.advanceTimersByTime(200);

    expect(fn).not.toHaveBeenCalled();
  });

  it('cancel() is safe to call when no pending execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    expect(() => debounced.cancel()).not.toThrow();
  });

  it('can be called again after cancel', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced.cancel();
    debounced();
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
