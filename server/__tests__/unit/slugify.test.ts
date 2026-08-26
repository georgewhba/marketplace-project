import { describe, it, expect } from 'vitest';
import { slugify, uniqueSlug } from '../../utils/slugify.js';

describe('slugify', () => {
  it('converts Arabic text to a valid slug', () => {
    expect(slugify('سماعات بلوتوث لاسلكية')).toBe('سماعات-بلوتوث-لاسلكية');
  });

  it('converts Latin text to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('handles mixed Arabic and Latin text', () => {
    expect(slugify('لابتوب Dell Inspiron')).toBe('لابتوب-dell-inspiron');
  });

  it('removes special characters (@, #, !, etc.)', () => {
    expect(slugify('منتج @خاص #جديد!')).toBe('منتج-خاص-جديد');
  });

  it('collapses multiple spaces into a single dash', () => {
    expect(slugify('كلمة    كلمتين     ثلاثة')).toBe('كلمة-كلمتين-ثلاثة');
  });

  it('collapses multiple dashes into one', () => {
    expect(slugify('أول---ثاني')).toBe('أول-ثاني');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify(' - منتج - ')).toBe('منتج');
  });

  it('trims leading and trailing whitespace', () => {
    expect(slugify('  مسافات  ')).toBe('مسافات');
  });

  it('returns a fallback string for input with only special chars', () => {
    expect(slugify('!@#$%^&*()')).not.toBe('');
  });

  it('handles numbers correctly', () => {
    expect(slugify('منتج 123')).toBe('منتج-123');
  });
});

describe('uniqueSlug', () => {
  it('starts with the slugified base text', () => {
    const result = uniqueSlug('سماعات بلوتوث');
    expect(result.startsWith('سماعات-بلوتوث-')).toBe(true);
  });

  it('appends a random suffix after the base slug', () => {
    const result = uniqueSlug('منتج');
    const parts = result.split('-');
    // Last part is the random suffix
    expect(parts.length).toBeGreaterThanOrEqual(2);
    const suffix = parts[parts.length - 1]!;
    expect(suffix.length).toBe(5);
  });

  it('generates different slugs on successive calls', () => {
    const a = uniqueSlug('تست');
    const b = uniqueSlug('تست');
    expect(a).not.toBe(b);
  });
});
