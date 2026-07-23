/**
 * 校验函数集合
 */

/** 手机号正则：1 开头，第二位 3/4/5/6/7/8/9，后接 9 位数字 */
const PHONE_REGEX = /^1[3-9]\d{9}$/;

/** HEX 颜色正则：6 位十六进制 */
const HEX_REGEX = /^[0-9A-Fa-f]{6}$/;

/** 姓名正则：2-20 位中文/英文/空格 */
const NAME_REGEX = /^[一-龥a-zA-Z\s]{2,20}$/;

/** 校验手机号 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

/** 校验手机号，返回错误文案 (校验通过返回 null) */
export function validatePhone(phone: string): string | null {
  if (!phone || phone.trim() === '') {
    return '请输入手机号';
  }
  if (!PHONE_REGEX.test(phone)) {
    return '请输入正确的 11 位手机号';
  }
  return null;
}

/** 校验密码 */
export function validatePassword(password: string): string | null {
  if (!password || password.trim() === '') {
    return '请输入密码';
  }
  if (password.length < 6) {
    return '密码不能少于 6 位';
  }
  return null;
}

/** 校验 HEX 颜色 (6 位十六进制，不含 #) */
export function isValidHex(hex: string): boolean {
  return HEX_REGEX.test(hex);
}

/** 校验姓名 */
export function validateName(name: string): string | null {
  if (!name || name.trim() === '') {
    return '请输入客户姓名';
  }
  if (!NAME_REGEX.test(name)) {
    return '请输入 2-20 位中文或英文姓名';
  }
  return null;
}

/** 校验客户手机号 */
export function validateCustomerPhone(phone: string): string | null {
  if (!phone || phone.trim() === '') {
    return '请输入手机号码';
  }
  if (!PHONE_REGEX.test(phone)) {
    return '请输入正确的 11 位手机号';
  }
  return null;
}

/** 判断是否为有效手机号数字字符 (用于输入过滤) */
export function isPhoneDigit(char: string): boolean {
  return /^\d$/.test(char);
}

/** 判断是否为有效 HEX 字符 (用于输入过滤) */
export function isHexChar(char: string): boolean {
  return /^[0-9A-Fa-f]$/.test(char);
}
