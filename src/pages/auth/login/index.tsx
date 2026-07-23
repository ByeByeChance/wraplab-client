import { useState, useCallback } from 'react';
import Taro, { useDidShow, useReady } from '@tarojs/taro';
import { View, Text, Input, Button } from '@tarojs/components';
import { useAuthStore } from '../../../stores/auth-store';
import { validatePhone, validatePassword } from '../../../utils/validator';
import { getStorageSync, STORAGE_KEYS } from '../../../utils/storage';
import { useCooldown } from '../../../utils/sms-cooldown';
import { smsService } from '../../../services';
import { SMS_ERROR_MAP, SMS_COOLDOWN_MS } from '../../../utils/constants';
import SmsCodeInput from '../../../components/SmsCodeInput/index';
import './index.less';

type LoginTab = 'password' | 'sms';

export default function LoginPage() {
  const authStore = useAuthStore();
  const [activeTab, setActiveTab] = useState<LoginTab>('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setRememberPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // SMS state
  const [smsCode, setSmsCode] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [smsVerifying, setSmsVerifying] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false);
  const { cooldownLeft: smsCountdown, startCooldown: startSmsCooldown } =
    useCooldown(SMS_COOLDOWN_MS, 'login_sms_cooldown');

  // 已登录则跳转首页
  useDidShow(() => {
    if (authStore.isLoggedIn) {
      Taro.switchTab({ url: '/pages/home/index' });
    }
  });

  // 读取记住的密码
  useReady(() => {
    const savedPhone = getStorageSync<string>(STORAGE_KEYS.REMEMBERED_PHONE);
    const savedPassword = getStorageSync<string>(STORAGE_KEYS.REMEMBERED_PASSWORD);
    if (savedPhone) setPhone(savedPhone);
    if (savedPassword) {
      setPassword(savedPassword);
      setRememberPassword(true);
    }
  });

  const handlePhoneInput = useCallback((e: { detail: { value: string } }) => {
    const value = e.detail.value.replace(/\D/g, '').slice(0, 11);
    setPhone(value);
    setPhoneError(null);
    setError(null);
    setSmsError(null);
  }, []);

  const handlePasswordInput = useCallback((e: { detail: { value: string } }) => {
    setPassword(e.detail.value);
    setPasswordError(null);
    setError(null);
  }, []);

  const handleTabSwitch = useCallback((tab: LoginTab) => {
    setActiveTab(tab);
    setError(null);
    setSmsError(null);
    setSmsCode('');
  }, []);

  /** 发送短信验证码 */
  const handleSendSmsCode = useCallback(async () => {
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      return;
    }

    setSmsSending(true);
    setSmsError(null);
    try {
      await smsService.sendCode({ phone, type: 'login' });
      startSmsCooldown();
      Taro.showToast({ title: '验证码已发送', icon: 'success' });
    } catch (err) {
      const code = (err as { code?: number }).code;
      const message = code && SMS_ERROR_MAP[code]
        ? SMS_ERROR_MAP[code]
        : (err instanceof Error ? err.message : '发送失败');
      setSmsError(message);
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSmsSending(false);
    }
  }, [phone, startSmsCooldown]);

  /** 验证码登录 */
  const handleSmsLogin = useCallback(async () => {
    if (smsCode.length !== 6) return;
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setPhoneError(phoneErr);
      return;
    }

    setSmsVerifying(true);
    setSmsError(null);
    try {
      const result = await authStore.smsLogin(phone, smsCode);
      setSmsVerified(true);
      if (result.needSetPassword) {
        Taro.showToast({ title: '建议设置密码', icon: 'none' });
      } else {
        Taro.showToast({ title: '登录成功', icon: 'success' });
      }
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/home/index' });
      }, 300);
    } catch (err) {
      const code = (err as { code?: number }).code;
      const message = code && SMS_ERROR_MAP[code]
        ? SMS_ERROR_MAP[code]
        : (err instanceof Error ? err.message : '登录失败');
      setSmsError(message);
      setSmsCode('');
      Taro.showToast({ title: message, icon: 'error' });
    } finally {
      setSmsVerifying(false);
    }
  }, [phone, smsCode, authStore]);

  /** 密码登录 */
  const handleLogin = useCallback(async () => {
    const phoneErr = validatePhone(phone);
    const passwordErr = validatePassword(password);
    setPhoneError(phoneErr);
    setPasswordError(passwordErr);
    if (phoneErr || passwordErr) return;

    setLoading(true);
    setError(null);

    try {
      await authStore.login(phone, password);
      Taro.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/home/index' });
      }, 300);
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      setError(message);
      Taro.showToast({ title: message, icon: 'error' });
    } finally {
      setLoading(false);
    }
  }, [phone, password, authStore]);

  // 6 位验证码填满自动触发登录
  const handleSmsCodeChange = useCallback((code: string) => {
    setSmsCode(code);
    setSmsError(null);
    if (code.length === 6) {
      void handleSmsLogin();
    }
  }, [handleSmsLogin]);

  return (
    <View className='login-page'>
      <View className='login-container'>
        {/* Logo */}
        <View className='login-logo'>
          <View className='login-logo-icon'>W</View>
          <Text className='login-logo-text'>WrapLab</Text>
          <Text className='login-logo-sub'>车衣实验室</Text>
        </View>

        {/* 登录方式切换 Tab */}
        <View className='login-tab-row'>
          <View
            className={`login-tab-item ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('password')}
          >
            <Text className='login-tab-text'>密码登录</Text>
          </View>
          <View
            className={`login-tab-item ${activeTab === 'sms' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('sms')}
          >
            <Text className='login-tab-text'>验证码登录</Text>
          </View>
        </View>

        {/* 表单卡片 */}
        <View className='login-card'>
          {/* 手机号输入 (两个 Tab 共享) */}
          <View className='login-input-group'>
            <View className={`login-input-wrap ${phoneError ? 'login-input-wrap--error' : ''}`}>
              <Text className='login-input-icon'>📱</Text>
              <Input
                className='login-input'
                type='number'
                placeholder='请输入手机号'
                placeholderClass='login-placeholder'
                value={phone}
                onInput={handlePhoneInput}
                maxlength={11}
                disabled={loading || smsVerifying}
              />
            </View>
            {phoneError && <Text className='login-error-text'>{phoneError}</Text>}
          </View>

          {/* 密码登录表单 */}
          {activeTab === 'password' && (
            <>
              <View className='login-input-group'>
                <View className={`login-input-wrap ${passwordError ? 'login-input-wrap--error' : ''}`}>
                  <Text className='login-input-icon'>🔒</Text>
                  <Input
                    className='login-input'
                    type={(showPassword ? 'text' : 'password') as 'text'}
                    placeholder='请输入密码'
                    placeholderClass='login-placeholder'
                    value={password}
                    onInput={handlePasswordInput}
                    maxlength={20}
                  />
                  <Text
                    className='login-password-toggle'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </Text>
                </View>
                {passwordError && <Text className='login-error-text'>{passwordError}</Text>}
              </View>

              {error && (
                <View className='login-general-error'>
                  <Text className='login-general-error-text'>{error}</Text>
                </View>
              )}

              <Button
                className={`btn-primary ${loading ? 'btn-primary--disabled' : ''}`}
                onClick={handleLogin}
                disabled={loading}
                loading={loading}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </>
          )}

          {/* 验证码登录表单 */}
          {activeTab === 'sms' && (
            <>
              <View className='login-sms-section'>
                <SmsCodeInput
                  phone={phone}
                  codeType='login'
                  countdown={smsCountdown}
                  sending={smsSending}
                  verifying={smsVerifying}
                  code={smsCode}
                  onCodeChange={handleSmsCodeChange}
                  onSendCode={handleSendSmsCode}
                  errorMessage={smsError}
                  verified={smsVerified}
                />
              </View>

              {error && (
                <View className='login-general-error'>
                  <Text className='login-general-error-text'>{error}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* 底部品牌标识 */}
        <View className='login-footer'>
          <Text className='login-footer-text'>WrapLab 车衣实验室 (c) 2026</Text>
        </View>
      </View>
    </View>
  );
}
