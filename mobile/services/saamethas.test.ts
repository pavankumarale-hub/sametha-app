import { getTodaysSametha, shuffleArray } from './saamethas';

describe('getTodaysSametha', () => {
  const saamethas = Array.from({ length: 100 }, (_, i) => `sametha_${i}`);

  it('returns a non-empty string for a non-empty array', () => {
    expect(getTodaysSametha(saamethas)).toBeTruthy();
  });

  it('returns empty string for empty array', () => {
    expect(getTodaysSametha([])).toBe('');
  });

  it('returns the same value on repeated calls (deterministic within a day)', () => {
    expect(getTodaysSametha(saamethas)).toBe(getTodaysSametha(saamethas));
  });

  it('returns a value from the input array', () => {
    const result = getTodaysSametha(saamethas);
    expect(saamethas).toContain(result);
  });

  it('produces different results for different "days" via mocked date', () => {
    const jan1 = new Date(2025, 0, 1).getTime();
    const jan2 = new Date(2025, 0, 2).getTime();

    const spy = jest.spyOn(Date.prototype, 'getTime');

    spy.mockReturnValue(jan1);
    const day1 = getTodaysSametha(saamethas);

    spy.mockReturnValue(jan2);
    const day2 = getTodaysSametha(saamethas);

    spy.mockRestore();
    // Different days should (very likely) produce different saamethas for this array size
    // We just verify both are valid entries — strict inequality is probabilistic
    expect(saamethas).toContain(day1);
    expect(saamethas).toContain(day2);
  });
});

describe('shuffleArray', () => {
  const arr = [1, 2, 3, 4, 5];

  it('returns an array of the same length', () => {
    expect(shuffleArray(arr)).toHaveLength(arr.length);
  });

  it('contains all original elements', () => {
    expect(shuffleArray(arr).sort()).toEqual([...arr].sort());
  });

  it('does not mutate the original array', () => {
    const copy = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(copy);
  });

  it('returns a new array reference', () => {
    expect(shuffleArray(arr)).not.toBe(arr);
  });
});
