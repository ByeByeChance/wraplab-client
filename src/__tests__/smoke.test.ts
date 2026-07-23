import Taro from '@tarojs/taro';

describe('Client smoke tests', () => {
  beforeEach(() => {
    (Taro as unknown as Record<string, () => void>).__clearStorage();
  });

  it('should have all service modules importable', () => {
    // Verify barrel export works
    const services = require('../services');
    expect(services.authService).toBeDefined();
    expect(services.vehicleService).toBeDefined();
    expect(services.caseService).toBeDefined();
    expect(services.storeService).toBeDefined();
    expect(services.waitlistService).toBeDefined();
    expect(services.offlineService).toBeDefined();
    expect(services.recommendationService).toBeDefined();
    expect(services.tagService).toBeDefined();
    expect(services.quoteService).toBeDefined();
    expect(services.appointmentService).toBeDefined();
  });

  it('should have all store modules creatable', () => {
    const { useAuthStore } = require('../stores/auth-store');
    const { useWaitlistStore } = require('../stores/waitlist-store');
    const { useOfflineStore } = require('../stores/offline-store');

    const authState = useAuthStore.getState();
    expect(authState).toBeDefined();
    expect(authState.isLoggedIn).toBe(false);

    const waitlistState = useWaitlistStore.getState();
    expect(waitlistState).toBeDefined();
    expect(waitlistState.waitlist).toEqual([]);

    const offlineState = useOfflineStore.getState();
    expect(offlineState).toBeDefined();
    expect(offlineState.isOffline).toBe(false);
  });

  it('should have storage util functions importable', () => {
    const { setStorageSync, getStorageSync } = require('../utils/storage');
    expect(typeof setStorageSync).toBe('function');
    expect(typeof getStorageSync).toBe('function');
  });

  it('should have validator functions working', () => {
    const { isValidPhone, validatePhone, validatePassword } = require('../utils/validator');
    expect(isValidPhone('13800138000')).toBe(true);
    expect(validatePhone('13800138000')).toBeNull();
    expect(validatePassword('123456')).toBeNull();
  });

  it('should have constants defined with expected values', () => {
    const { API_BASE_URL, API_PREFIX, REQUEST_TIMEOUT, MAX_TOKEN_REFRESH_RETRIES } = require('../utils/constants');
    expect(API_BASE_URL).toBeDefined();
    expect(API_PREFIX).toBe('/api/v1');
    expect(REQUEST_TIMEOUT).toBeGreaterThan(0);
    expect(MAX_TOKEN_REFRESH_RETRIES).toBeGreaterThanOrEqual(1);
  });
});
