import { renderHook, waitFor } from '@testing-library/react-native';
import { Linking, Alert } from 'react-native';

jest.mock('../../src/services/pendingSubmissionService', () => ({
  checkForPendingSubmission: jest.fn(() => Promise.resolve(null)),
  clearPendingSubmission: jest.fn(() => Promise.resolve()),
}));

import { usePendingSubmissionRecovery } from '../../src/hooks/usePendingSubmissionRecovery';
import {
  checkForPendingSubmission,
  clearPendingSubmission,
} from '../../src/services/pendingSubmissionService';

describe('usePendingSubmissionRecovery', () => {
  beforeEach(() => {
    (Linking.getInitialURL as jest.Mock) = jest.fn(() => Promise.resolve(null));
    jest.spyOn(Alert, 'alert').mockImplementation();
  });

  it('checks for pending submission when no deep link', async () => {
    renderHook(() => usePendingSubmissionRecovery());

    await waitFor(() => {
      expect(checkForPendingSubmission).toHaveBeenCalled();
    });
  });

  it('skips check when deep link is being processed', async () => {
    (Linking.getInitialURL as jest.Mock).mockResolvedValue('exp://auth/callback');

    renderHook(() => usePendingSubmissionRecovery());

    await waitFor(() => {
      expect(Linking.getInitialURL).toHaveBeenCalled();
    });

    expect(checkForPendingSubmission).not.toHaveBeenCalled();
  });

  it('shows recovery prompt when pending submission exists', async () => {
    (checkForPendingSubmission as jest.Mock).mockResolvedValue({
      status: 'pending',
      email: 'test@example.com',
    });

    renderHook(() => usePendingSubmissionRecovery());

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Continue Sign Up?',
        expect.stringContaining('test@example.com'),
        expect.any(Array)
      );
    });
  });

  it('does not show prompt when no pending submission', async () => {
    (checkForPendingSubmission as jest.Mock).mockResolvedValue(null);

    renderHook(() => usePendingSubmissionRecovery());

    await waitFor(() => {
      expect(checkForPendingSubmission).toHaveBeenCalled();
    });

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('does not show prompt when submission status is not pending', async () => {
    (checkForPendingSubmission as jest.Mock).mockResolvedValue({
      status: 'completed',
      email: 'test@example.com',
    });

    renderHook(() => usePendingSubmissionRecovery());

    await waitFor(() => {
      expect(checkForPendingSubmission).toHaveBeenCalled();
    });

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('dismiss button clears the pending submission', async () => {
    (checkForPendingSubmission as jest.Mock).mockResolvedValue({
      status: 'pending',
      email: 'test@example.com',
    });

    renderHook(() => usePendingSubmissionRecovery());

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Get the dismiss button handler
    const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
    const buttons = alertArgs[2];
    const dismissButton = buttons.find((b: any) => b.text === 'Dismiss');

    dismissButton.onPress();

    expect(clearPendingSubmission).toHaveBeenCalled();
  });

  it('handles check failure gracefully', async () => {
    (checkForPendingSubmission as jest.Mock).mockRejectedValue(
      new Error('Storage error')
    );
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    renderHook(() => usePendingSubmissionRecovery());

    await waitFor(() => {
      expect(checkForPendingSubmission).toHaveBeenCalled();
    });

    // Should not throw, should log warning
    warnSpy.mockRestore();
  });
});
