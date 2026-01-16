import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const NextThemesProviderMock = vi.fn(({ children }) => <div data-testid="provider">{children}</div>);

vi.mock('next-themes', () => ({
  ThemeProvider: (props: any) => NextThemesProviderMock(props),
}));

describe('ThemeProvider', () => {
  it('renders children and passes props', async () => {
    const { ThemeProvider } = await import('@/components/providers/theme-provider');

    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <div>test content</div>
      </ThemeProvider>
    );

    expect(screen.getByText('test content')).toBeInTheDocument();
    expect(NextThemesProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        attribute: 'class',
        defaultTheme: 'system',
      })
    );
  });
});
