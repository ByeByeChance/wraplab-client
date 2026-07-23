import { debounce } from '../debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('delays function execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('debounces multiple rapid calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 300);

    debounced();
    debounced();
    debounced();
    debounced();

    jest.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the original function', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('hello', 42);
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('hello', 42);
  });

  it('uses default delay of 300ms', () => {
    const fn = jest.fn();
    const debounced = debounce(fn);

    debounced();
    jest.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on subsequent calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);

    debounced();
    jest.advanceTimersByTime(150);
    debounced(); // reset
    jest.advanceTimersByTime(150);
    expect(fn).not.toHaveBeenCalled(); // 300ms from first call, but only 150ms from reset

    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
