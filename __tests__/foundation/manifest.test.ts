import { describe, expect, it } from 'vitest';
import manifest from '@/app/manifest';

describe('manifest', () => {
  it('returns valid PWA manifest', () => {
    const m = manifest();
    expect(m.name).toBe('GoodsFlow');
    expect(m.short_name).toBe('GoodsFlow');
    expect(m.start_url).toBe('/');
    expect(m.display).toBe('standalone');
    expect(m.background_color).toBe('#FDFCF8');
    expect(m.theme_color).toBe('#FDFCF8');
    expect(m.icons).toHaveLength(1);
    expect(m.icons?.[0]?.src).toBe('/icons/icon.svg');
  });
});
