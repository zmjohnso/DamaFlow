import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import TierBadge from './TierBadge';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('TierBadge', () => {
  it('renders "Beginner" for beginner tier', () => {
    const { getByText } = render(<TierBadge tier="beginner" />, { wrapper: Wrapper });
    expect(getByText('Beginner')).toBeTruthy();
  });

  it('renders "Intermediate" for intermediate tier', () => {
    const { getByText } = render(<TierBadge tier="intermediate" />, { wrapper: Wrapper });
    expect(getByText('Intermediate')).toBeTruthy();
  });

  it('renders "Advanced" for advanced tier', () => {
    const { getByText } = render(<TierBadge tier="advanced" />, { wrapper: Wrapper });
    expect(getByText('Advanced')).toBeTruthy();
  });

  it('has correct accessibilityLabel for beginner', () => {
    const { getByLabelText } = render(<TierBadge tier="beginner" />, { wrapper: Wrapper });
    expect(getByLabelText('Beginner')).toBeTruthy();
  });

  it('has correct accessibilityLabel for intermediate', () => {
    const { getByLabelText } = render(<TierBadge tier="intermediate" />, { wrapper: Wrapper });
    expect(getByLabelText('Intermediate')).toBeTruthy();
  });

  it('has correct accessibilityLabel for advanced', () => {
    const { getByLabelText } = render(<TierBadge tier="advanced" />, { wrapper: Wrapper });
    expect(getByLabelText('Advanced')).toBeTruthy();
  });

  it('has accessibilityRole of "text"', () => {
    const { getByLabelText } = render(<TierBadge tier="beginner" />, { wrapper: Wrapper });
    expect(getByLabelText('Beginner').props.accessibilityRole).toBe('text');
  });
});
