import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StarPicker } from '@/components/ProductReviews';

describe('StarPicker', () => {
  it('renders 5 star buttons', () => {
    render(<StarPicker value={0} onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('calls onChange when a star is clicked', () => {
    let val = 0;
    render(<StarPicker value={0} onChange={(v) => { val = v; }} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);
    expect(val).toBe(3);
  });

  it('highlights selected stars', () => {
    render(<StarPicker value={3} onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[2].querySelector('svg')?.getAttribute('class')).toContain('fill-yellow-400');
  });
});
