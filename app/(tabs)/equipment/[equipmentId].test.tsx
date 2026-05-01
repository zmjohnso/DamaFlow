import React from 'react';
import { NativeModules } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import EquipmentDetailScreen from './[equipmentId]';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: {
    push: (...args: any[]) => mockPush(...args),
    back: () => mockBack(),
  },
}));

jest.mock('@shopify/flash-list', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});

jest.mock('@/lib/db/client', () => ({ db: {} }));

const mockGetEquipmentById = jest.fn();
const mockGetStringReplacementsForEquipment = jest.fn();
const mockInsertStringReplacement = jest.fn();
const mockDeleteEquipment = jest.fn();

jest.mock('@/lib/db/queries', () => ({
  getEquipmentById: (...args: any[]) => mockGetEquipmentById(...args),
  getStringReplacementsForEquipment: (...args: any[]) => mockGetStringReplacementsForEquipment(...args),
  insertStringReplacement: (...args: any[]) => mockInsertStringReplacement(...args),
  deleteEquipment: (...args: any[]) => mockDeleteEquipment(...args),
}));

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
  return <PaperProvider theme={{ animation: { scale: 0 } }}>{children}</PaperProvider>;
}

describe('EquipmentDetailScreen', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockGetEquipmentById.mockReset();
    mockGetStringReplacementsForEquipment.mockReset();
    mockInsertStringReplacement.mockReset();
    mockDeleteEquipment.mockReset();

    const { useLocalSearchParams } = require('expo-router');
    useLocalSearchParams.mockReturnValue({ equipmentId: '1' });

    jest.spyOn(NativeModules.NativeAnimatedModule, 'startAnimatingNode')
      .mockImplementation((_animationId, _nodeTag, _config, endCallback) => {
        endCallback({ finished: true });
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders not found when equipment does not exist', async () => {
    mockGetEquipmentById.mockReturnValue(undefined);
    mockGetStringReplacementsForEquipment.mockReturnValue([]);

    const { getByText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    expect(getByText('Kendama not found.')).toBeTruthy();
  });

  it('renders equipment name as header', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([]);

    const { getAllByText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    expect(getAllByText('Kendama A').length).toBeGreaterThanOrEqual(1);
  });

  it('renders purchase date when available', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: '2026-03-15',
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([]);

    const { getByText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    expect(getByText('Purchased: Mar 15, 2026')).toBeTruthy();
  });

  it('renders notes when available', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: 'Red tama, ash ken',
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([]);

    const { getByText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    expect(getByText('Red tama, ash ken')).toBeTruthy();
  });

  it('renders empty state when no replacements exist', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([]);

    const { getByText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    expect(getByText('No string replacements logged yet.')).toBeTruthy();
  });

  it('renders string replacement list with formatted dates', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([
      { id: 1, equipment_id: 1, replaced_at: '2026-04-10', notes: null },
      { id: 2, equipment_id: 1, replaced_at: '2026-04-05', notes: null },
    ]);

    const { getByText, getByLabelText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    expect(getByText('Apr 10, 2026')).toBeTruthy();
    expect(getByText('Apr 5, 2026')).toBeTruthy();
    expect(getByLabelText('String replacement on Apr 10, 2026')).toBeTruthy();
  });

  it('opens string replacement sheet when button is pressed', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([]);

    const { getByLabelText, getAllByText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    fireEvent.press(getByLabelText('Log string replacement'));
    expect(getAllByText('Log String Replacement').length).toBeGreaterThanOrEqual(1);
  });

  it('saves string replacement and reloads list', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment
      .mockReturnValueOnce([])
      .mockReturnValueOnce([{ id: 1, equipment_id: 1, replaced_at: '2026-05-15', notes: null }]);

    const { getByLabelText, getByText, queryByText, getAllByText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    fireEvent.press(getByLabelText('Log string replacement'));
    fireEvent.press(getByLabelText('Replacement date'));
    fireEvent.press(getByText('pick-date'));
    fireEvent.press(getByLabelText('Save string replacement'));

    expect(mockInsertStringReplacement).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ equipment_id: 1, replaced_at: '2026-05-15' })
    );
    expect(queryByText('No string replacements logged yet.')).toBeNull();
    expect(getAllByText('May 15, 2026').length).toBeGreaterThanOrEqual(1);
  });

  it('navigates back when back button is pressed', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([]);

    const { getByLabelText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    fireEvent.press(getByLabelText('Go back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders accessible labels on replacement rows', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([
      { id: 1, equipment_id: 1, replaced_at: '2026-04-03', notes: null },
    ]);

    const { getByLabelText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    expect(getByLabelText('String replacement on Apr 3, 2026')).toBeTruthy();
  });

  // Story 6.5: Delete Kendama

  it('renders Delete Kendama button on detail screen', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([]);

    const { getByLabelText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    expect(getByLabelText('Delete kendama')).toBeTruthy();
  });

  it('opens delete confirmation dialog with correct title and body', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([]);

    const { getByLabelText, getByText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    fireEvent.press(getByLabelText('Delete kendama'));

    expect(getByText('Delete Kendama A?')).toBeTruthy();
    expect(getByLabelText('This will remove the kendama and its string replacement history. Sessions logged with this kendama will remain in your practice history.')).toBeTruthy();
  });

  it('calls deleteEquipment and navigates back on confirm', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([]);

    const { getByLabelText, queryByLabelText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    fireEvent.press(getByLabelText('Delete kendama'));
    fireEvent.press(getByLabelText('Confirm delete'));

    expect(mockDeleteEquipment).toHaveBeenCalledWith({}, 1);
    expect(mockBack).toHaveBeenCalled();
    await waitFor(() => {
      expect(queryByLabelText('Confirm delete')).toBeNull();
    });
  });

  it('dismisses dialog without calling deleteEquipment on cancel', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([]);

    const { getByLabelText, queryByLabelText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    fireEvent.press(getByLabelText('Delete kendama'));
    fireEvent.press(getByLabelText('Cancel delete'));

    expect(mockDeleteEquipment).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(queryByLabelText('Cancel delete')).toBeNull();
    });
  });

  it('shows snackbar and does not navigate back when deleteEquipment throws', async () => {
    mockGetEquipmentById.mockReturnValue({
      id: 1,
      name: 'Kendama A',
      notes: null,
      purchase_date: null,
      added_at: '2026-04-01T00:00:00.000Z',
    });
    mockGetStringReplacementsForEquipment.mockReturnValue([]);
    mockDeleteEquipment.mockImplementation(() => {
      throw new Error('DB error');
    });

    const { getByLabelText, getByText, queryByLabelText } = render(<EquipmentDetailScreen />, { wrapper: Wrapper });
    await act(async () => {});

    fireEvent.press(getByLabelText('Delete kendama'));
    fireEvent.press(getByLabelText('Confirm delete'));

    expect(mockDeleteEquipment).toHaveBeenCalledWith({}, 1);
    expect(mockBack).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(queryByLabelText('Confirm delete')).toBeNull();
    });
    expect(getByText('Could not delete kendama')).toBeTruthy();
  });
});
