import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

describe('Card', () => {
  it('renders Card with children', () => {
    render(
      <Card>
        <p>Card body</p>
      </Card>,
    );
    expect(screen.getByText('Card body')).toBeDefined();
  });

  it('renders CardHeader, CardTitle, CardContent, and CardFooter', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title Here</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Content here</p>
        </CardContent>
        <CardFooter>
          <span>Footer here</span>
        </CardFooter>
      </Card>,
    );
    expect(screen.getByText('Title Here').tagName).toBe('H3');
    expect(screen.getByText('Content here')).toBeDefined();
    expect(screen.getByText('Footer here')).toBeDefined();
  });

  it('applies border and shadow classes to Card', () => {
    const { container } = render(<Card />);
    const card = container.firstChild as HTMLDivElement;
    expect(card.className).toContain('border');
    expect(card.className).toContain('shadow-sm');
  });
});
