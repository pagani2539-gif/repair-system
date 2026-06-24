import { describe, it, expect } from 'vitest';
import { formatDateThai, formatDateTimeThai, parseDate } from '../formatDate';

describe('formatDate Utilities', () => {
  describe('parseDate', () => {
    it('should parse SQLite format date strings', () => {
      const dateStr = '2024-05-20 10:30:00';
      const result = parseDate(dateStr);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(4); // May is 4
      expect(result.getDate()).toBe(20);
    });

    it('should return current date for empty input', () => {
      const result = parseDate(null);
      expect(result instanceof Date).toBe(true);
    });
  });

  describe('formatDateThai', () => {
    it('should format date to Thai locale', () => {
      const date = new Date('2024-05-20');
      const result = formatDateThai(date);
      // "20 พ.ค. 2567" (Note: year 2024 + 543 = 2567)
      expect(result).toContain('พ.ค.');
      expect(result).toContain('2567');
    });

    it('should return "-" for null input', () => {
      expect(formatDateThai(null)).toBe('-');
    });
  });

  describe('formatDateTimeThai', () => {
    it('should format date and time to Thai locale', () => {
      const date = new Date('2024-05-20T10:30:00');
      const result = formatDateTimeThai(date);
      expect(result).toContain('พ.ค.');
      expect(result).toContain('2567');
      expect(result).toContain('10:30');
      expect(result).toContain('น.');
    });
  });
});
