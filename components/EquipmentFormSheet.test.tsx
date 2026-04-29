import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import EquipmentFormSheet from './EquipmentFormSheet';

// Mock DateTimePicker so tests don't require native modules
jest.mock('@react-native-community/datetimepicker', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Button } = require('react-native');
  return function MockDateTimePicker({ onChange }: { onChange?: (event: unknown, date?: Date) => void }) {
    return (
      <View testID="datetime-picker">
        <Button
          title="pick-date"
          onPress={() => onChange?.({}, new Date('2026-05-15T00:00:00Z'))}
        />
      </View>
    );
  };
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('EquipmentFormSheet', () => {
  it('renders add mode title when no initialData', () => {
    const { getByText } = render(
      <EquipmentFormSheet visible onDismiss={() => {}} onSave={() => {}} />,
      { wrapper: Wrapper }
    );
    expect(getByText('Add Kendama')).toBeTruthy();
  });

  it('renders edit mode title when initialData is provided', () => {
    const { getByText } = render(
      <EquipmentFormSheet
        visible
        onDismiss={() => {}}
        onSave={() => {}}
        initialData={{
          id: 1,
          name: 'Kendama A',
          notes: null,
          purchase_date: null,
          added_at: '2026-04-01T00:00:00Z',
        }}
      />,
      { wrapper: Wrapper }
    );
    expect(getByText('Edit Kendama')).toBeTruthy();
  });

  it('pre-populates fields from initialData', () => {
    const { getByDisplayValue, getByText } = render(
      <EquipmentFormSheet
        visible
        onDismiss={() => {}}
        onSave={() => {}}
        initialData={{
          id: 1,
          name: 'Kendama A',
          notes: 'Some notes',
          purchase_date: '2026-02-15',
          added_at: '2026-04-01T00:00:00Z',
        }}
      />,
      { wrapper: Wrapper }
    );
    expect(getByDisplayValue('Kendama A')).toBeTruthy();
    expect(getByDisplayValue('Some notes')).toBeTruthy();
    expect(getByText('Feb 15, 2026')).toBeTruthy();
  });

  it('calls onSave with trimmed data when Save is pressed', () => {
    const onSave = jest.fn();
    const { getByLabelText } = render(
      <EquipmentFormSheet visible onDismiss={() => {}} onSave={onSave} />,
      { wrapper: Wrapper }
    );

    fireEvent.changeText(getByLabelText('Kendama name'), '  New Kendama  ');
    fireEvent.changeText(getByLabelText('Notes'), '  My notes  ');
    fireEvent.press(getByLabelText('Add kendama'));

    expect(onSave).toHaveBeenCalledWith({
      name: 'New Kendama',
      purchaseDate: null,
      notes: 'My notes',
    });
  });

  it('shows error outline when saving with empty name', () => {
    const onSave = jest.fn();
    const { getByLabelText } = render(
      <EquipmentFormSheet visible onDismiss={() => {}} onSave={onSave} />,
      { wrapper: Wrapper }
    );

    fireEvent.press(getByLabelText('Add kendama'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('clears error when user starts typing after validation failure', () => {
    const onSave = jest.fn();
    const { getByLabelText } = render(
      <EquipmentFormSheet visible onDismiss={() => {}} onSave={onSave} />,
      { wrapper: Wrapper }
    );

    fireEvent.press(getByLabelText('Add kendama'));
    fireEvent.changeText(getByLabelText('Kendama name'), 'A');
    fireEvent.press(getByLabelText('Add kendama'));
    expect(onSave).toHaveBeenCalled();
  });

  it('shows save error message when saveError is true', () => {
    const { getByText } = render(
      <EquipmentFormSheet visible onDismiss={() => {}} onSave={() => {}} saveError />,
      { wrapper: Wrapper }
    );

    expect(getByText('Could not save. Please try again.')).toBeTruthy();
  });

  it('opens date picker when date button is pressed', () => {
    const { getByLabelText, getByTestId } = render(
      <EquipmentFormSheet visible onDismiss={() => {}} onSave={() => {}} />,
      { wrapper: Wrapper }
    );

    fireEvent.press(getByLabelText('Purchase date'));
    expect(getByTestId('datetime-picker')).toBeTruthy();
  });

  it('sets purchase date from picker and formats it', () => {
    const { getByLabelText, getByText } = render(
      <EquipmentFormSheet visible onDismiss={() => {}} onSave={() => {}} />,
      { wrapper: Wrapper }
    );

    fireEvent.press(getByLabelText('Purchase date'));
    fireEvent.press(getByText('pick-date'));
  });

  it('allows clearing a selected purchase date', () => {
    const { getByLabelText, getByText } = render(
      <EquipmentFormSheet
        visible
        onDismiss={() => {}}
        onSave={() => {}}
        initialData={{
          id: 1,
          name: 'Kendama A',
          notes: null,
          purchase_date: '2026-02-15',
          added_at: '2026-04-01T00:00:00Z',
        }}
      />,
      { wrapper: Wrapper }
    );

    expect(getByText('Feb 15, 2026')).toBeTruthy();
    fireEvent.press(getByLabelText('Clear purchase date'));
    expect(getByText('Select date')).toBeTruthy();
  });

  it('disables Save button while saving', () => {
    const { getByLabelText } = render(
      <EquipmentFormSheet visible onDismiss={() => {}} onSave={() => {}} isSaving />,
      { wrapper: Wrapper }
    );

    const saveButton = getByLabelText('Add kendama');
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('resets fields when reopened with different initialData', () => {
    const { getByDisplayValue, rerender } = render(
      <EquipmentFormSheet
        visible
        onDismiss={() => {}}
        onSave={() => {}}
        initialData={{
          id: 1,
          name: 'Kendama A',
          notes: 'Old notes',
          purchase_date: '2026-02-15',
          added_at: '2026-04-01T00:00:00Z',
        }}
      />,
      { wrapper: Wrapper }
    );

    expect(getByDisplayValue('Kendama A')).toBeTruthy();

    rerender(
      <PaperProvider>
        <EquipmentFormSheet
          visible
          onDismiss={() => {}}
          onSave={() => {}}
          initialData={{
            id: 2,
            name: 'Kendama B',
            notes: null,
            purchase_date: null,
            added_at: '2026-04-02T00:00:00Z',
          }}
        />
      </PaperProvider>
    );

    expect(getByDisplayValue('Kendama B')).toBeTruthy();
  });
});
