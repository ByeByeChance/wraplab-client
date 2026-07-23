import { View, Text, Button, Input } from '@tarojs/components';

interface SmsCodeInputProps {
  phone: string;
  codeType: 'login' | 'appointment_verify';
  countdown: number;
  sending: boolean;
  verifying?: boolean;
  code: string;
  onCodeChange: (code: string) => void;
  onSendCode: () => void;
  errorMessage?: string | null;
  verified?: boolean;
}

export default function SmsCodeInput({
  phone,
  countdown,
  sending,
  code,
  onCodeChange,
  onSendCode,
  errorMessage,
  verified = false,
}: SmsCodeInputProps) {
  const isCounting = countdown > 0;
  const isPhoneValid = /^1\d{10}$/.test(phone);
  const canSend = isPhoneValid && !sending && !isCounting;

  const getButtonText = (): string => {
    if (sending) return '发送中';
    if (isCounting) return `${countdown}s 后重新获取`;
    return '获取验证码';
  };

  const handleInput = (e: { detail: { value: string } }): void => {
    const val = e.detail.value.replace(/\D/g, '').slice(0, 6);
    onCodeChange(val);
  };

  return (
    <View className='sms-code-input'>
      <View className='sms-code-row'>
        {/* 6 位验证码方框 */}
        <View className='sms-code-boxes'>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              className={`sms-code-box ${
                code.length === i ? 'active' : ''
              } ${code.length > i ? 'filled' : ''} ${errorMessage ? 'error' : ''}`}
            >
              <Text className='sms-code-digit'>{code[i] || ''}</Text>
            </View>
          ))}
        </View>

        {/* 发送按钮 */}
        <Button
          className={`sms-send-btn ${
            canSend ? 'active' : ''
          } ${sending ? 'sending' : ''} ${isCounting ? 'counting' : ''} ${!isPhoneValid ? 'disabled' : ''}`}
          onClick={onSendCode}
          disabled={!canSend}
          loading={sending}
        >
          {getButtonText()}
        </Button>
      </View>

      {/* 隐藏 Input 捕获输入 */}
      <Input
        className='sms-hidden-input'
        type='number'
        maxlength={6}
        value={code}
        onInput={handleInput}
        focus
        adjustPosition={false}
      />

      {/* 错误提示 */}
      {errorMessage && (
        <Text className='sms-error-text'>⚠ {errorMessage}</Text>
      )}

      {/* 验证通过 */}
      {verified && (
        <View className='sms-verified'>
          <Text className='sms-verified-icon'>✓</Text>
          <Text className='sms-verified-text'>验证通过</Text>
        </View>
      )}
    </View>
  );
}
