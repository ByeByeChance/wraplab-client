import { useState, useCallback } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import { isHexChar } from '../../utils/validator';

interface CustomColorPickerProps {
  /** 是否显示 */
  visible: boolean;
  /** 确认回调 (返回带 # 前缀的 HEX) */
  onConfirm: (hex: string) => void;
  /** 取消回调 */
  onCancel: () => void;
}

export default function CustomColorPicker({
  visible,
  onConfirm,
  onCancel,
}: CustomColorPickerProps) {
  const [hexInput, setHexInput] = useState('');
  const isValid = hexInput.length === 6;

  /** HEX 输入处理：仅接受 0-9 A-F a-f，最多 6 位 */
  const handleHexInput = useCallback((e: { detail?: { value?: string } }) => {
    const rawValue = e?.detail?.value || '';
    // 过滤非法字符并限制 6 位
    const filtered = rawValue
      .split('')
      .filter((char: string) => isHexChar(char))
      .slice(0, 6)
      .join('')
      .toUpperCase();
    setHexInput(filtered);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!isValid) return;
    onConfirm(`#${hexInput}`);
  }, [isValid, hexInput, onConfirm]);

  const handleCancel = useCallback(() => {
    setHexInput('');
    onCancel();
  }, [onCancel]);

  if (!visible) return null;

  return (
    <View className='custom-color-overlay' onClick={handleCancel}>
      <View className='custom-color-sheet' onClick={(e) => e.stopPropagation()}>
        {/* 拖拽指示条 */}
        <View className='custom-color-indicator' />

        <Text className='custom-color-title'>自定义颜色</Text>

        {/* HEX 输入 */}
        <View className='custom-color-input-group'>
          <Text className='custom-color-label'>输入 HEX 色值</Text>
          <View className='custom-color-hex-input'>
            <Text className='custom-color-hex-prefix'>#</Text>
            <Input
              className='custom-color-hex-field'
              type='text'
              placeholder='000000'
              placeholderClass='custom-color-placeholder'
              value={hexInput}
              onInput={handleHexInput}
              maxlength={6}
              focus
            />
          </View>
        </View>

        {/* 预览 */}
        <View className='custom-color-preview-group'>
          <Text className='custom-color-label'>预览</Text>
          <View className='custom-color-preview-row'>
            <View
              className='custom-color-preview-block'
              style={{ backgroundColor: isValid ? `#${hexInput}` : '#F5F5F5' }}
            />
            <Text className='custom-color-preview-hex'>
              {isValid ? `#${hexInput}` : '--'}
            </Text>
          </View>
        </View>

        {/* 按钮 */}
        <View className='custom-color-actions'>
          <Button className='custom-color-btn custom-color-btn--cancel' onClick={handleCancel}>
            取消
          </Button>
          <Button
            className={`custom-color-btn custom-color-btn--confirm ${!isValid ? 'custom-color-btn--disabled' : ''}`}
            onClick={handleConfirm}
            disabled={!isValid}
          >
            确认使用
          </Button>
        </View>
      </View>
    </View>
  );
}
