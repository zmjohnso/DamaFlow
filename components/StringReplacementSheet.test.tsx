import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import StringReplacementSheet from './StringReplacementSheet';

// Mock DateTimePicker so tests don't require native modules
jest.mock('@react-native-community/datetimepicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Button } = require('react-native');
  return function MockDateTimePicker({ onChange }: { onChange?: (event: unknown, date?: Date) => void }) {
    return (
      <View testID="datetime-picker">
        <Button
          title="pick-date"
          onPress={() => onChange?.({}, new Date(2026, 4, 15))}
        />
      </View>
    );
  };
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('StringReplacementSheet', () => {
  it('renders title when visible', () => {
    const { getByText } = render(
      <StringReplacementSheet visible onDismiss={() => {}} onSave={() => {}} equipmentId={1} />,
      { wrapper: Wrapper }
    );
    expect(getByText('Log String Replacement')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <StringReplacementSheet visible={false} onDismiss={() => {}} onSave={() => {}} equipmentId={1} />,
      { wrapper: Wrapper }
    );
    expect(queryByText('Log String Replacement')).toBeNull();
  });

  it('shows default date as today', () => {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const { getByText } = render(
      <StringReplacementSheet visible onDismiss={() => {}} onSave={() => {}} equipmentId={1} />,
      { wrapper: Wrapper }
    );
    expect(getByText(today)).toBeTruthy();
  });

  it('opens date picker when date button is pressed', () => {
    const { getByLabelText, getByTestId } = render(
      <StringReplacementSheet visible onDismiss={() => {}} onSave={() => {}} equipmentId={1} />,
      { wrapper: Wrapper }
    );
    fireEvent.press(getByLabelText('Replacement date'));
    expect(getByTestId('datetime-picker')).toBeTruthy();
  });

  it('calls onSave with correct payload when Save is pressed', () => {
    const onSave = jest.fn();
    const { getByLabelText } = render(
      <StringReplacementSheet visible onDismiss={() => {}} onSave={onSave} equipmentId={1} />,
      { wrapper: Wrapper }
    );

    // The default date is today; format it as YYYY-MM-DD using UTC to match component
    const today = new Date();
    const expectedDate = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;

    fireEvent.press(getByLabelText('Save string replacement'));
    expect(onSave).toHaveBeenCalledWith({
      equipment_id: 1,
      replaced_at: expectedDate,
    });
  });

  it('does not call onDismiss when Save is pressed', () => {
    const onDismiss = jest.fn();
    const onSave = jest.fn();
    const { getByLabelText } = render(
      <StringReplacementSheet visible onDismiss={onDismiss} onSave={onSave} equipmentId={1} />,
      { wrapper: Wrapper }
    );
    fireEvent.press(getByLabelText('Save string replacement'));
    expect(onSave).toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('updates date when picker selects a new date', () => {
    const onSave = jest.fn();
    const { getByLabelText, getByText } = render(
      <StringReplacementSheet visible onDismiss={() => {}} onSave={onSave} equipmentId={1} />,
      { wrapper: Wrapper }
    );

    fireEvent.press(getByLabelText('Replacement date'));
    fireEvent.press(getByText('pick-date'));

    fireEvent.press(getByLabelText('Save string replacement'));
    expect(onSave).toHaveBeenCalledWith({
      equipment_id: 1,
      replaced_at: '2026-05-15',
    });
  });
});
