import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import EmptyQueueState from './EmptyQueueState';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('EmptyQueueState', () => {
  describe('Standard variant (isFirstCompletion=false)', () => {
    it('renders headline "You\'re all caught up."', () => {
      const { getByText } = render(
        <EmptyQueueState isFirstCompletion={false} onStartNewSkill={jest.fn()} />,
        { wrapper: Wrapper }
      );
      expect(getByText("You're all caught up.")).toBeTruthy();
    });

    it('renders standard subtext', () => {
      const { getByText } = render(
        <EmptyQueueState isFirstCompletion={false} onStartNewSkill={jest.fn()} />,
        { wrapper: Wrapper }
      );
      expect(getByText('Come back tomorrow for your next review.')).toBeTruthy();
    });

    it('does not render first-completion subtext', () => {
      const { queryByText } = render(
        <EmptyQueueState isFirstCompletion={false} onStartNewSkill={jest.fn()} />,
        { wrapper: Wrapper }
      );
      expect(queryByText(/cleared your queue for the first time/)).toBeNull();
    });

    it('renders "Start a new skill →" CTA button', () => {
      const { getByText } = render(
        <EmptyQueueState isFirstCompletion={false} onStartNewSkill={jest.fn()} />,
        { wrapper: Wrapper }
      );
      expect(getByText('Start a new skill →')).toBeTruthy();
    });

    it('calls onStartNewSkill when CTA is pressed', () => {
      const onStartNewSkill = jest.fn();
      const { getByText } = render(
        <EmptyQueueState isFirstCompletion={false} onStartNewSkill={onStartNewSkill} />,
        { wrapper: Wrapper }
      );
      fireEvent.press(getByText('Start a new skill →'));
      expect(onStartNewSkill).toHaveBeenCalledTimes(1);
    });
  });

  describe('First-completion variant (isFirstCompletion=true)', () => {
    it('renders headline "You\'re all caught up."', () => {
      const { getByText } = render(
        <EmptyQueueState isFirstCompletion={true} onStartNewSkill={jest.fn()} />,
        { wrapper: Wrapper }
      );
      expect(getByText("You're all caught up.")).toBeTruthy();
    });

    it('renders first-completion subtext', () => {
      const { getByText } = render(
        <EmptyQueueState isFirstCompletion={true} onStartNewSkill={jest.fn()} />,
        { wrapper: Wrapper }
      );
      expect(getByText("You've cleared your queue for the first time. Come back tomorrow for your next review.")).toBeTruthy();
    });

    it('does not render standard-only subtext', () => {
      const { queryByText } = render(
        <EmptyQueueState isFirstCompletion={true} onStartNewSkill={jest.fn()} />,
        { wrapper: Wrapper }
      );
      // Use anchored regex so the first-completion string (which ends with the same phrase) doesn't match
      expect(queryByText(/^Come back tomorrow for your next review\.$/, { exact: true })).toBeNull();
    });

    it('renders "Start a new skill →" CTA button', () => {
      const { getByText } = render(
        <EmptyQueueState isFirstCompletion={true} onStartNewSkill={jest.fn()} />,
        { wrapper: Wrapper }
      );
      expect(getByText('Start a new skill →')).toBeTruthy();
    });

    it('calls onStartNewSkill when CTA is pressed', () => {
      const onStartNewSkill = jest.fn();
      const { getByText } = render(
        <EmptyQueueState isFirstCompletion={true} onStartNewSkill={onStartNewSkill} />,
        { wrapper: Wrapper }
      );
      fireEvent.press(getByText('Start a new skill →'));
      expect(onStartNewSkill).toHaveBeenCalledTimes(1);
    });
  });
});
