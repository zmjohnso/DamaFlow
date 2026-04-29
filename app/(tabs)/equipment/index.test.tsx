import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import GearScreen from './index';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (cb: () => void) => { require('react').useEffect(cb, []); },
}));

jest.mock('@shopify/flash-list', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});

jest.mock('@/lib/db/client', () => ({ db: {} }));

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

const mockGetAllEquipmentWithReplacementCount = jest.fn();
const mockInsertEquipment = jest.fn();
const mockUpdateEquipment = jest.fn();

jest.mock('@/lib/db/queries', () => ({
  getAllEquipmentWithReplacementCount: (...args: any[]) => mockGetAllEquipmentWithReplacementCount(...args),
  insertEquipment: (...args: any[]) => mockInsertEquipment(...args),
  updateEquipment: (...args: any[]) => mockUpdateEquipment(...args),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <PaperProvider>{children}</PaperProvider>;
}

describe('GearScreen', () => {
  beforeEach(() => {
    mockGetAllEquipmentWithReplacementCount.mockReset();
    mockInsertEquipment.mockReset();
    mockUpdateEquipment.mockReset();
  });

  it('renders empty state when no equipment exists', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([]);
    const { getByText, getAllByText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('No gear yet.')).toBeTruthy();
    expect(getByText('Track your kendamas and string replacements.')).toBeTruthy();
    expect(getAllByText('Add Kendama').length).toBeGreaterThanOrEqual(1);
  });

  it('renders gear list when equipment exists', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([
      { id: 1, name: 'Kendama A', notes: null, purchase_date: null, added_at: '2026-04-03T00:00:00.000Z', replacementCount: 0 },
      { id: 2, name: 'Kendama B', notes: null, purchase_date: '2026-02-15T00:00:00.000Z', added_at: '2026-03-01T00:00:00.000Z', replacementCount: 0 },
    ]);
    const { getByText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('Kendama A')).toBeTruthy();
    expect(getByText('Kendama B')).toBeTruthy();
  });

  it('shows purchase date when available', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([
      { id: 2, name: 'Kendama B', notes: null, purchase_date: '2026-02-15T00:00:00.000Z', added_at: '2026-03-01T00:00:00.000Z', replacementCount: 0 },
    ]);
    const { getByText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('Feb 15, 2026')).toBeTruthy();
  });

  it('falls back to added_at when purchase_date is null', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([
      { id: 1, name: 'Kendama A', notes: null, purchase_date: null, added_at: '2026-04-03T00:00:00.000Z', replacementCount: 0 },
    ]);
    const { getByText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('Apr 3, 2026')).toBeTruthy();
  });

  it('renders string replacement count badge', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([
      { id: 1, name: 'Kendama A', notes: null, purchase_date: null, added_at: '2026-04-03T00:00:00.000Z', replacementCount: 3 },
    ]);
    const { getByText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('3')).toBeTruthy();
  });

  it('renders accessible labels with correct pluralization', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([
      { id: 1, name: 'Kendama A', notes: null, purchase_date: null, added_at: '2026-04-03T00:00:00.000Z', replacementCount: 1 },
    ]);
    const { getByLabelText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByLabelText('Kendama A, 1 string replacement')).toBeTruthy();
  });

  it('shows Add Kendama button in header even when list is populated', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([
      { id: 1, name: 'Kendama A', notes: null, purchase_date: null, added_at: '2026-04-03T00:00:00.000Z', replacementCount: 0 },
    ]);
    const { getAllByText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getAllByText('Add Kendama')).toHaveLength(1);
  });

  it('shows error state when query throws', async () => {
    mockGetAllEquipmentWithReplacementCount.mockImplementation(() => {
      throw new Error('db error');
    });
    const { getByText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    expect(getByText('Could not load gear.')).toBeTruthy();
  });

  // Story 6.2: Add and Edit Kendama

  it('opens add modal from header button', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([
      { id: 1, name: 'Kendama A', notes: null, purchase_date: null, added_at: '2026-04-03T00:00:00.000Z', replacementCount: 0 },
    ]);
    const { getAllByText, getByLabelText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getAllByText('Add Kendama')[0]);
    expect(getByLabelText('Kendama name')).toBeTruthy();
  });

  it('opens add modal from empty state button', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([]);
    const { getAllByText, getByLabelText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getAllByText('Add Kendama')[0]);
    expect(getByLabelText('Kendama name')).toBeTruthy();
  });

  it('saving new kendama inserts and updates list', async () => {
    mockGetAllEquipmentWithReplacementCount
      .mockReturnValueOnce([])
      .mockReturnValueOnce([
        { id: 1, name: 'New Kendama', notes: null, purchase_date: null, added_at: '2026-04-24T00:00:00.000Z', replacementCount: 0 },
      ])
      .mockReturnValue([
        { id: 1, name: 'New Kendama', notes: null, purchase_date: null, added_at: '2026-04-24T00:00:00.000Z', replacementCount: 0 },
      ]);

    const { getAllByText, getByLabelText, queryByText, getByText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getAllByText('Add Kendama')[0]);
    fireEvent.changeText(getByLabelText('Kendama name'), 'New Kendama');
    fireEvent.press(getByLabelText('Add kendama'));

    expect(mockInsertEquipment).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ name: 'New Kendama' })
    );
    expect(queryByText('No gear yet.')).toBeNull();
    expect(getByText('New Kendama')).toBeTruthy();
  });

  it('empty name validation highlights field without saving', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([]);
    const { getAllByText, getByLabelText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getAllByText('Add Kendama')[0]);
    fireEvent.press(getByLabelText('Add kendama'));

    expect(mockInsertEquipment).not.toHaveBeenCalled();
  });

  it('dismiss without saving does not mutate list', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([
      { id: 1, name: 'Kendama A', notes: null, purchase_date: null, added_at: '2026-04-03T00:00:00.000Z', replacementCount: 0 },
    ]);
    const { getAllByText, getByText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getAllByText('Add Kendama')[0]);
    // Modal is open but no save action taken — just verify list unchanged
    expect(mockInsertEquipment).not.toHaveBeenCalled();
    expect(getByText('Kendama A')).toBeTruthy();
  });

  it('navigates to detail screen on row tap', async () => {
    const { router } = require('expo-router');
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([
      { id: 1, name: 'Kendama A', notes: null, purchase_date: null, added_at: '2026-04-03T00:00:00.000Z', replacementCount: 0 },
    ]);
    const { getByLabelText } = render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});
    fireEvent.press(getByLabelText('Kendama A, 0 string replacements'));

    expect(router.push).toHaveBeenCalledWith('/equipment/1');
  });

  // Story 6.5: Delete Kendama — list reload on focus

  it('reloads equipment list on focus effect', async () => {
    mockGetAllEquipmentWithReplacementCount.mockReturnValue([
      { id: 1, name: 'Kendama A', notes: null, purchase_date: null, added_at: '2026-04-03T00:00:00.000Z', replacementCount: 0 },
    ]);
    render(<GearScreen />, { wrapper: Wrapper });
    await act(async () => {});

    expect(mockGetAllEquipmentWithReplacementCount).toHaveBeenCalledTimes(1); // useFocusEffect only
  });
});
