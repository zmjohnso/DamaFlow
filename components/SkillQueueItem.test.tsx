import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import SkillQueueItem from './SkillQueueItem';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('SkillQueueItem', () => {
  describe('Overdue variant', () => {
    it('renders "Xd ago" tag text', () => {
      const { getByText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="overdue" daysOverdue={3} onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByText('3d ago')).toBeTruthy();
    });

    it('renders "Due X days ago" in metadata', () => {
      const { getByText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="overdue" daysOverdue={3} onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByText('Due 3 days ago')).toBeTruthy();
    });

    it('includes TierBadge (tier label visible)', () => {
      const { getByText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="overdue" daysOverdue={3} onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByText('Beginner')).toBeTruthy();
    });

    it('has correct accessible label for overdue', () => {
      const { getByLabelText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="overdue" daysOverdue={3} onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByLabelText('Big Cup, Beginner, overdue 3 days ago')).toBeTruthy();
    });
  });

  describe('Review variant', () => {
    it('renders "›" chevron', () => {
      const { getByText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="review" onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByText('›')).toBeTruthy();
    });

    it('renders "· Review" in metadata', () => {
      const { getByText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="review" onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByText('· Review')).toBeTruthy();
    });

    it('includes TierBadge (tier label visible)', () => {
      const { getByText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="review" onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByText('Beginner')).toBeTruthy();
    });

    it('has correct accessible label for review', () => {
      const { getByLabelText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="review" onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByLabelText('Big Cup, Beginner, review')).toBeTruthy();
    });
  });

  describe('New variant', () => {
    it('renders "New" right-indicator tag', () => {
      const { getByText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="new" onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByText('New')).toBeTruthy();
    });

    it('renders "· New" in metadata', () => {
      const { getByText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="new" onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByText('· New')).toBeTruthy();
    });

    it('includes TierBadge (tier label visible)', () => {
      const { getByText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="new" onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByText('Beginner')).toBeTruthy();
    });

    it('has correct accessible label for new', () => {
      const { getByLabelText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="new" onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByLabelText('Big Cup, Beginner, new skill')).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('onPress fires when row is tapped', () => {
      const onPress = jest.fn();
      const { getByLabelText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="review" onPress={onPress} />,
        { wrapper: Wrapper }
      );
      fireEvent.press(getByLabelText('Big Cup, Beginner, review'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('row has accessibilityRole "button"', () => {
      const { getByLabelText } = render(
        <SkillQueueItem skillName="Big Cup" tier="beginner" variant="review" onPress={() => {}} />,
        { wrapper: Wrapper }
      );
      expect(getByLabelText('Big Cup, Beginner, review').props.accessibilityRole).toBe('button');
    });
  });
});
