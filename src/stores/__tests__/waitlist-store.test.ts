import { useWaitlistStore } from '../waitlist-store';
import * as waitlistService from '../../services/waitlist.service';

jest.mock('../../services/waitlist.service', () => ({
  joinWaitlist: jest.fn(),
  getWaitlistStatus: jest.fn(),
  cancelWaitlist: jest.fn(),
}));

describe('useWaitlistStore', () => {
  beforeEach(() => {
    useWaitlistStore.setState({
      waitlist: [],
      submitting: false,
      submitError: null,
      loading: false,
      error: null,
      refreshing: false,
      currentSlotStatus: null,
      slotStatusLoading: false,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct initial values', () => {
      const state = useWaitlistStore.getState();
      expect(state.waitlist).toEqual([]);
      expect(state.submitting).toBe(false);
      expect(state.submitError).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.refreshing).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      useWaitlistStore.setState({
        waitlist: [{ waitlistId: '1', position: 1, date: '', timeSlot: '', status: 'waiting', customerPhone: '', customerName: '', storeName: '', vehicleInfo: '', createdAt: '' }],
        submitting: true,
        submitError: 'some error',
      });

      useWaitlistStore.getState().reset();

      const state = useWaitlistStore.getState();
      expect(state.waitlist).toEqual([]);
      expect(state.submitting).toBe(false);
      expect(state.submitError).toBeNull();
    });
  });

  describe('joinWaitlist', () => {
    it('sets submitting true while joining', async () => {
      const mockResult = { waitlistId: 'wl-1', position: 3, queueLength: 5, estimatedDays: 2 };
      (waitlistService.joinWaitlist as jest.Mock).mockResolvedValue(mockResult);

      const promise = useWaitlistStore.getState().joinWaitlist({
        date: '2026-07-25',
        timeSlotId: 'slot-1',
        storeId: 'store-1',
        customerName: '张三',
        customerPhone: '13800138000',
        vehicleInfo: 'Tesla Model 3',
        serviceType: 'full_wrap',
      });

      expect(useWaitlistStore.getState().submitting).toBe(true);

      const result = await promise;
      expect(result).toEqual(mockResult);
      expect(useWaitlistStore.getState().submitting).toBe(false);
      expect(useWaitlistStore.getState().submitError).toBeNull();
    });

    it('sets submitError on failure', async () => {
      (waitlistService.joinWaitlist as jest.Mock).mockRejectedValue(new Error('Server error'));

      await expect(
        useWaitlistStore.getState().joinWaitlist({
          date: '2026-07-25',
          timeSlotId: 'slot-1',
          storeId: 'store-1',
          customerName: '张三',
          customerPhone: '13800138000',
          vehicleInfo: 'Tesla Model 3',
          serviceType: 'full_wrap',
        }),
      ).rejects.toThrow('Server error');

      expect(useWaitlistStore.getState().submitting).toBe(false);
      expect(useWaitlistStore.getState().submitError).toBe('Server error');
    });
  });

  describe('fetchMyWaitlist', () => {
    it('loads waitlist entries', async () => {
      const mockEntries = [
        { waitlistId: '1', position: 1, date: '2026-07-25', timeSlot: '09:00', status: 'waiting' as const, customerPhone: '13800138000', customerName: '张三', storeName: '旗舰店', vehicleInfo: 'Model 3', createdAt: '2026-07-25T00:00:00Z' },
      ];
      (waitlistService.getWaitlistStatus as jest.Mock).mockResolvedValue(mockEntries);

      await useWaitlistStore.getState().fetchMyWaitlist('13800138000');

      const state = useWaitlistStore.getState();
      expect(state.waitlist).toEqual(mockEntries);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on failure', async () => {
      (waitlistService.getWaitlistStatus as jest.Mock).mockRejectedValue(new Error('Network error'));

      await useWaitlistStore.getState().fetchMyWaitlist('13800138000');

      const state = useWaitlistStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('leaveWaitlist', () => {
    it('removes entry from local list after cancel', async () => {
      (waitlistService.cancelWaitlist as jest.Mock).mockResolvedValue(undefined);
      const entry1 = { waitlistId: '1', position: 1, date: '2026-07-25', timeSlot: '09:00', status: 'waiting' as const, customerPhone: '13800138000', customerName: '张三', storeName: '旗舰店', vehicleInfo: 'Model 3', createdAt: '2026-07-25' };
      const entry2 = { waitlistId: '2', position: 2, date: '2026-07-25', timeSlot: '10:00', status: 'waiting' as const, customerPhone: '13800138000', customerName: '李四', storeName: '旗舰店', vehicleInfo: 'Model Y', createdAt: '2026-07-25' };
      useWaitlistStore.setState({
        waitlist: [entry1, entry2],
      });

      await useWaitlistStore.getState().leaveWaitlist('1');

      const state = useWaitlistStore.getState();
      expect(state.waitlist).toHaveLength(1);
      expect(state.waitlist[0].waitlistId).toBe('2');
    });

    it('rethrows error on failure', async () => {
      (waitlistService.cancelWaitlist as jest.Mock).mockRejectedValue(new Error('Cancel failed'));

      await expect(
        useWaitlistStore.getState().leaveWaitlist('1'),
      ).rejects.toThrow('Cancel failed');
    });
  });

  describe('refresh', () => {
    it('refreshes waitlist entries', async () => {
      const mockEntries = [
        { waitlistId: '1', position: 1, date: '2026-07-25', timeSlot: '09:00', status: 'waiting' as const, customerPhone: '13800138000', customerName: '张三', storeName: '旗舰店', vehicleInfo: 'Model 3', createdAt: '2026-07-25' },
      ];
      (waitlistService.getWaitlistStatus as jest.Mock).mockResolvedValue(mockEntries);

      await useWaitlistStore.getState().refresh('13800138000');

      const state = useWaitlistStore.getState();
      expect(state.waitlist).toEqual(mockEntries);
      expect(state.refreshing).toBe(false);
    });

    it('handles refresh error silently', async () => {
      (waitlistService.getWaitlistStatus as jest.Mock).mockRejectedValue(new Error('Network error'));

      await useWaitlistStore.getState().refresh('13800138000');

      expect(useWaitlistStore.getState().refreshing).toBe(false);
    });
  });

  describe('fetchSlotStatus', () => {
    it('computes slot status from waitlist data', async () => {
      const mockEntries = [
        { waitlistId: '1', position: 1, date: '2026-07-25', timeSlot: '09:00', status: 'waiting' as const, customerPhone: '13800138000', customerName: '张三', storeName: '旗舰店', vehicleInfo: 'Model 3', createdAt: '2026-07-25' },
        { waitlistId: '2', position: 2, date: '2026-07-25', timeSlot: '09:00', status: 'waiting' as const, customerPhone: '13900139000', customerName: '李四', storeName: '旗舰店', vehicleInfo: 'Model Y', createdAt: '2026-07-25' },
      ];
      (waitlistService.getWaitlistStatus as jest.Mock).mockResolvedValue(mockEntries);

      await useWaitlistStore.getState().fetchSlotStatus('13800138000', '2026-07-25', '09:00');

      const state = useWaitlistStore.getState();
      expect(state.currentSlotStatus).toEqual({
        isFull: false,
        queueLength: 2,
        userInQueue: true,
        userPosition: 1,
      });
      expect(state.slotStatusLoading).toBe(false);
    });

    it('shows user not in queue when looking at different slot', async () => {
      const mockEntries = [
        { waitlistId: '1', position: 1, date: '2026-07-25', timeSlot: '10:00', status: 'waiting' as const, customerPhone: '13900139000', customerName: '李四', storeName: '旗舰店', vehicleInfo: 'Model Y', createdAt: '2026-07-25' },
      ];
      (waitlistService.getWaitlistStatus as jest.Mock).mockResolvedValue(mockEntries);

      await useWaitlistStore.getState().fetchSlotStatus('13800138000', '2026-07-25', '09:00');

      const state = useWaitlistStore.getState();
      expect(state.currentSlotStatus?.userInQueue).toBe(false);
      expect(state.currentSlotStatus?.queueLength).toBe(1);
    });
  });
});
