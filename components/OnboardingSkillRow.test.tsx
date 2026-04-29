import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import OnboardingSkillRow from './OnboardingSkillRow';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('OnboardingSkillRow', () => {
  it('renders skill name', () => {
    const { getByText } = render(
      <OnboardingSkillRow skillName="Big Cup" marked={false} onToggle={jest.fn()} />,
      { wrapper: Wrapper }
    );
    expect(getByText('Big Cup')).toBeTruthy();
  });

  it('has accessibilityRole "checkbox"', () => {
    const { getByRole } = render(
      <OnboardingSkillRow skillName="Big Cup" marked={false} onToggle={jest.fn()} />,
      { wrapper: Wrapper }
    );
    expect(getByRole('checkbox')).toBeTruthy();
  });

  it('accessibilityLabel says "not marked" when unmarked', () => {
    const { getByLabelText } = render(
      <OnboardingSkillRow skillName="Big Cup" marked={false} onToggle={jest.fn()} />,
      { wrapper: Wrapper }
    );
    expect(getByLabelText('Big Cup, not marked as mastered')).toBeTruthy();
  });

  it('accessibilityLabel says "marked" when marked', () => {
    const { getByLabelText } = render(
      <OnboardingSkillRow skillName="Lighthouse" marked={true} onToggle={jest.fn()} />,
      { wrapper: Wrapper }
    );
    expect(getByLabelText('Lighthouse, marked as mastered')).toBeTruthy();
  });

  it('accessibilityState.checked is false when unmarked', () => {
    const { getByRole } = render(
      <OnboardingSkillRow skillName="Big Cup" marked={false} onToggle={jest.fn()} />,
      { wrapper: Wrapper }
    );
    expect(getByRole('checkbox').props.accessibilityState.checked).toBe(false);
  });

  it('accessibilityState.checked is true when marked', () => {
    const { getByRole } = render(
      <OnboardingSkillRow skillName="Big Cup" marked={true} onToggle={jest.fn()} />,
      { wrapper: Wrapper }
    );
    expect(getByRole('checkbox').props.accessibilityState.checked).toBe(true);
  });

  it('calls onToggle when row is pressed', () => {
    const onToggle = jest.fn();
    const { getByRole } = render(
      <OnboardingSkillRow skillName="Big Cup" marked={false} onToggle={onToggle} />,
      { wrapper: Wrapper }
    );
    fireEvent.press(getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle when row is pressed while marked', () => {
    const onToggle = jest.fn();
    const { getByRole } = render(
      <OnboardingSkillRow skillName="Big Cup" marked={true} onToggle={onToggle} />,
      { wrapper: Wrapper }
    );
    fireEvent.press(getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
