import {
  isValidPhone,
  validatePhone,
  validatePassword,
  isValidHex,
  validateName,
  validateCustomerPhone,
  isPhoneDigit,
  isHexChar,
} from '../validator';

describe('validator', () => {
  describe('isValidPhone', () => {
    it('returns true for valid phone numbers', () => {
      expect(isValidPhone('13800138000')).toBe(true);
      expect(isValidPhone('15912345678')).toBe(true);
      expect(isValidPhone('18888888888')).toBe(true);
    });

    it('returns false for invalid phone numbers', () => {
      expect(isValidPhone('12345678901')).toBe(false); // wrong prefix
      expect(isValidPhone('1380013800')).toBe(false); // too short
      expect(isValidPhone('138001380000')).toBe(false); // too long
      expect(isValidPhone('')).toBe(false);
      expect(isValidPhone('abcdefghijk')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('returns null for valid phone', () => {
      expect(validatePhone('13800138000')).toBeNull();
    });

    it('returns error message for empty phone', () => {
      expect(validatePhone('')).toBe('请输入手机号');
      expect(validatePhone('   ')).toBe('请输入手机号');
    });

    it('returns error message for invalid format', () => {
      expect(validatePhone('12345678901')).toBe('请输入正确的 11 位手机号');
    });
  });

  describe('validatePassword', () => {
    it('returns null for valid password', () => {
      expect(validatePassword('123456')).toBeNull();
      expect(validatePassword('password123')).toBeNull();
    });

    it('returns error for empty password', () => {
      expect(validatePassword('')).toBe('请输入密码');
    });

    it('returns error for short password', () => {
      expect(validatePassword('12345')).toBe('密码不能少于 6 位');
    });
  });

  describe('isValidHex', () => {
    it('returns true for valid 6-digit hex', () => {
      expect(isValidHex('FF6B35')).toBe(true);
      expect(isValidHex('0066CC')).toBe(true);
      expect(isValidHex('abcdef')).toBe(true);
      expect(isValidHex('123456')).toBe(true);
    });

    it('returns false for invalid hex', () => {
      expect(isValidHex('FF6B3')).toBe(false); // 5 chars
      expect(isValidHex('FF6B355')).toBe(false); // 7 chars
      expect(isValidHex('GGGGGG')).toBe(false); // invalid chars
      expect(isValidHex('#FF6B35')).toBe(false); // includes #
      expect(isValidHex('')).toBe(false);
    });
  });

  describe('validateName', () => {
    it('returns null for valid names', () => {
      expect(validateName('张三')).toBeNull();
      expect(validateName('John Smith')).toBeNull();
      expect(validateName('李明')).toBeNull();
    });

    it('returns error for empty name', () => {
      expect(validateName('')).toBe('请输入客户姓名');
    });

    it('returns error for too short name', () => {
      expect(validateName('张')).toBe('请输入 2-20 位中文或英文姓名');
    });
  });

  describe('validateCustomerPhone', () => {
    it('returns null for valid phone', () => {
      expect(validateCustomerPhone('13800138000')).toBeNull();
    });

    it('returns error for empty', () => {
      expect(validateCustomerPhone('')).toBe('请输入手机号码');
    });

    it('returns error for invalid', () => {
      expect(validateCustomerPhone('12345')).toBe('请输入正确的 11 位手机号');
    });
  });

  describe('isPhoneDigit', () => {
    it('returns true for digits', () => {
      expect(isPhoneDigit('0')).toBe(true);
      expect(isPhoneDigit('9')).toBe(true);
    });

    it('returns false for non-digits', () => {
      expect(isPhoneDigit('a')).toBe(false);
      expect(isPhoneDigit('-')).toBe(false);
      expect(isPhoneDigit(' ')).toBe(false);
    });
  });

  describe('isHexChar', () => {
    it('returns true for valid hex chars', () => {
      expect(isHexChar('0')).toBe(true);
      expect(isHexChar('9')).toBe(true);
      expect(isHexChar('A')).toBe(true);
      expect(isHexChar('f')).toBe(true);
    });

    it('returns false for invalid chars', () => {
      expect(isHexChar('G')).toBe(false);
      expect(isHexChar('z')).toBe(false);
      expect(isHexChar('-')).toBe(false);
    });
  });
});
