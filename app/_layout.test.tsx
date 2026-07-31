import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('@expo/vector-icons/FontAwesome', () => {
  const { View } = require('react-native');
  return function MockFontAwesome() {
    return <View testID="error-icon" />;
  };
});
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
}));
jest.mock('react-native-reanimated', () => ({}));
jest.mock('@react-native/assets-registry/registry', () => ({}), { virtual: true });

jest.mock('expo-router', () => ({
  Redirect: () => null,
  Stack: Object.assign(() => null, { Screen: () => null }),
}));

jest.mock('@/components/useColorScheme', () => ({ useColorScheme: () => 'light' }));

jest.mock('@/lib/db/client', () => ({
  db: {},
  runMigrations: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/lib/db/seed', () => ({ seedSkillCatalog: jest.fn() }));

const mockResetAllData = jest.fn();
jest.mock('@/lib/db/queries', () => ({
  getSetting: jest.fn(() => undefined),
  resetAllData: (...args: unknown[]) => mockResetAllData(...args),
}));

jest.mock('@/store/queueStore', () => ({
  __esModule: true,
  default: { getState: () => ({ loadQueue: jest.fn() }) },
}));
jest.mock('@/store/appStore', () => ({
  __esModule: true,
  default: Object.assign(() => false, { getState: () => ({ setOnboardingComplete: jest.fn(), setThemePreference: jest.fn() }) }),
}));

import { ErrorBoundary } from './_layout';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the generic error message with a Restart button', () => {
    const { getByText } = render(<ErrorBoundary error={new Error('boom')} retry={jest.fn()} />);
    expect(getByText('Something went wrong. Your data is safe.')).toBeTruthy();
    expect(getByText('Restart the app')).toBeTruthy();
  });

  it('calls retry when Restart the app is pressed', () => {
    const retry = jest.fn();
    const { getByText } = render(<ErrorBoundary error={new Error('boom')} retry={retry} />);
    fireEvent.press(getByText('Restart the app'));
    expect(retry).toHaveBeenCalled();
  });

  it('shows a confirmation dialog before resetting app data', () => {
    const { getByText, queryByText } = render(<ErrorBoundary error={new Error('boom')} retry={jest.fn()} />);
    expect(queryByText('Reset App Data?')).toBeNull();
    fireEvent.press(getByText('Reset App Data'));
    expect(getByText('Reset App Data?')).toBeTruthy();
    expect(mockResetAllData).not.toHaveBeenCalled();
  });

  it('cancelling the dialog does not reset data', () => {
    const { getByText, getAllByText } = render(<ErrorBoundary error={new Error('boom')} retry={jest.fn()} />);
    fireEvent.press(getByText('Reset App Data'));
    fireEvent.press(getAllByText('Cancel')[0]);
    expect(mockResetAllData).not.toHaveBeenCalled();
    // Still in the idle state — the reset trigger remains available to try again.
    expect(getByText('Something went wrong. Your data is safe.')).toBeTruthy();
  });

  it('resets app data and shows a success message on confirm', () => {
    const { getByText, getAllByText, queryByText } = render(<ErrorBoundary error={new Error('boom')} retry={jest.fn()} />);
    fireEvent.press(getByText('Reset App Data'));
    fireEvent.press(getAllByText('Reset')[getAllByText('Reset').length - 1]);
    expect(mockResetAllData).toHaveBeenCalledWith({});
    expect(getByText('Your data has been reset. Close and reopen the app to continue.')).toBeTruthy();
    // Once reset succeeds, the no-op "Restart the app" and the reset trigger both disappear.
    expect(queryByText('Restart the app')).toBeNull();
    expect(queryByText('Reset App Data')).toBeNull();
  });

  it('shows a distinct failure message when resetAllData itself throws', () => {
    mockResetAllData.mockImplementationOnce(() => {
      throw new Error('db unreadable');
    });
    const { getByText, getAllByText } = render(<ErrorBoundary error={new Error('boom')} retry={jest.fn()} />);
    fireEvent.press(getByText('Reset App Data'));
    fireEvent.press(getAllByText('Reset')[getAllByText('Reset').length - 1]);
    expect(
      getByText(
        "Something went wrong. Your data is safe, but the reset couldn't complete automatically. Try restarting the app, or clear the app's storage from your device settings.",
      ),
    ).toBeTruthy();
    // Restart is still offered as a fallback when reset itself failed.
    expect(getByText('Restart the app')).toBeTruthy();
  });
});
