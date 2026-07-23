/**
 * 手机号脱敏: 138****8000
 */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}
