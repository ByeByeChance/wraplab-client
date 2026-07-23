import { useState, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import { useConfigStore } from '../../../stores/config-store';
import { useColorStore } from '../../../stores/color-store';
import { validateName, validateCustomerPhone, isPhoneDigit } from '../../../utils/validator';
import EmptyState from '../../../components/EmptyState';
import type { Quote } from '../../../types';
import './index.less';

export default function QuotePage() {
  const router = useRouter();
  const { modelId, swatchId, materialId } = router.params;

  const configStore = useConfigStore();
  const { currentModel, quoteData, quoteLoading, quoteError, saveConfiguration, generateQuote } = configStore;
  const { selectedSwatch, selectedMaterial, getActiveHex } = useColorStore();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [remark, setRemark] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [savedQuote, setSavedQuote] = useState<Quote | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const activeHex = getActiveHex();
  const modelName = currentModel?.name || '';
  const swatchName = selectedSwatch?.name || '自定义';
  const materialName = selectedMaterial?.name || '';

  /** 姓名输入 */
  const handleNameInput = useCallback((e: { detail: { value: string } }) => {
    const value = e.detail.value;
    setCustomerName(value);
    if (nameError) setNameError(null);
  }, [nameError]);

  /** 手机号输入 */
  const handlePhoneInput = useCallback((e: { detail: { value: string } }) => {
    const value = e.detail.value
      .split('')
      .filter((c: string) => isPhoneDigit(c))
      .join('')
      .slice(0, 11);
    setCustomerPhone(value);
    if (phoneError) setPhoneError(null);
  }, [phoneError]);

  /** 备注输入 */
  const handleRemarkInput = useCallback((e: { detail: { value: string } }) => {
    const value = e.detail.value;
    if (value.length > 200) {
      Taro.showToast({ title: '备注最多200字', icon: 'none' });
      setRemark(value.slice(0, 200));
      return;
    }
    setRemark(value);
  }, []);

  /** 校验表单 */
  const validateForm = useCallback((): boolean => {
    const nameErr = validateName(customerName);
    const phoneErr = validateCustomerPhone(customerPhone);
    setNameError(nameErr);
    setPhoneError(phoneErr);
    return !nameErr && !phoneErr;
  }, [customerName, customerPhone]);

  /** 提交报价 */
  const handleSubmit = useCallback(async () => {
    if (!validateForm() || !modelId) return;

    setSubmitting(true);
    setPageError(null);

    try {
      const configId = await saveConfiguration({
        modelId,
        swatchId: swatchId,
        materialId: materialId,
        hex: activeHex || undefined,
      });

      const quote = await generateQuote(configId, {
        name: customerName,
        phone: customerPhone,
        remark: remark || undefined,
      });

      setSavedQuote(quote);
      setSubmitSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : '提交失败，请重试';
      setPageError(message);
      Taro.showToast({ title: message, icon: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [modelId, swatchId, materialId, activeHex, customerName, customerPhone, remark, validateForm, saveConfiguration, generateQuote]);

  /** 联系客服 */
  const handleContactService = useCallback(() => {
    // Phase 1: store phone number not yet configured, show placeholder
    Taro.showToast({ title: '客服功能开发中，敬请期待', icon: 'none' });
  }, []);

  // 如果没有必要参数，展示空状态
  if (!modelId) {
    return (
      <View className='page-container'>
        <EmptyState
          message='缺少车型参数'
          subMessage='请从改色工作台重新进入'
        />
      </View>
    );
  }

  // 提交成功页
  if (submitSuccess && savedQuote) {
    return (
      <View className='page-container'>
        <ScrollView className='page-scroll'>
          <View className='quote-success'>
            <View className='quote-success-icon'>&#10003;</View>
            <Text className='quote-success-title'>报价单已生成！</Text>
            <Text className='quote-success-id'>报价编号：{savedQuote.id}</Text>

            <View className='card quote-summary-card'>
              <View className='quote-summary-row'>
                <Text className='quote-summary-label'>车型</Text>
                <Text className='quote-summary-value'>{modelName}</Text>
              </View>
              <View className='quote-summary-row'>
                <Text className='quote-summary-label'>颜色</Text>
                <View className='quote-summary-color'>
                  {activeHex && (
                    <View className='quote-summary-color-block' style={{ backgroundColor: activeHex }} />
                  )}
                  <Text className='quote-summary-value'>{swatchName}</Text>
                </View>
              </View>
              <View className='quote-summary-row'>
                <Text className='quote-summary-label'>材质</Text>
                <Text className='quote-summary-value'>{materialName}</Text>
              </View>
              <View className='quote-summary-total'>
                <Text className='quote-summary-total-label'>预估总价</Text>
                <Text className='quote-summary-total-price'>
                  {(Number(savedQuote.totalPrice)).toLocaleString()}
                </Text>
              </View>
            </View>

            <View className='quote-success-actions'>
              <Button className='btn-primary' onClick={() => Taro.switchTab({ url: '/pages/profile/index' })}>
                查看我的方案
              </Button>
              <Button className='btn-secondary' style={{ marginTop: '16rpx' }} onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
                继续设计
              </Button>
              <Button
                className='btn-secondary'
                style={{ marginTop: '16rpx' }}
                onClick={handleContactService}
              >
                联系客服
              </Button>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className='page-container'>
      <ScrollView className='page-scroll'>
        <View className='quote-content'>
          {/* 方案摘要 */}
          <View className='card quote-summary-card'>
            <Text className='quote-section-title'>方案摘要</Text>
            <View className='quote-summary-row'>
              <Text className='quote-summary-label'>车型</Text>
              <Text className='quote-summary-value'>{modelName}</Text>
            </View>
            <View className='quote-summary-row'>
              <Text className='quote-summary-label'>颜色</Text>
              <View className='quote-summary-color'>
                {activeHex && (
                  <View className='quote-summary-color-block' style={{ backgroundColor: activeHex }} />
                )}
                <Text className='quote-summary-value'>{swatchName}</Text>
              </View>
            </View>
            <View className='quote-summary-row'>
              <Text className='quote-summary-label'>材质</Text>
              <Text className='quote-summary-value'>{materialName}</Text>
            </View>
          </View>

          {/* 价格明细 */}
          {quoteData ? (
            <View className='card quote-price-card'>
              <Text className='quote-section-title'>价格明细</Text>
              <View className='quote-price-row'>
                <Text className='quote-price-label'>材料费</Text>
                <Text className='quote-price-value'>{Number(quoteData.materialCost).toLocaleString()}</Text>
              </View>
              <View className='quote-price-row'>
                <Text className='quote-price-label'>工时费</Text>
                <Text className='quote-price-value'>{Number(quoteData.laborCost).toLocaleString()}</Text>
              </View>
              <View className='quote-price-divider' />
              <View className='quote-price-row quote-price-row--total'>
                <Text className='quote-price-label'>预估总价</Text>
                <Text className='quote-price-total'>{Number(quoteData.totalPrice).toLocaleString()}</Text>
              </View>
              <Text className='quote-price-disclaimer'>
                以上为预估价格，实际以到店为准
              </Text>
            </View>
          ) : quoteLoading ? (
            <View className='card quote-price-card'>
              <Text className='quote-section-title'>价格明细</Text>
              <Text className='quote-price-loading'>正在计算价格...</Text>
            </View>
          ) : quoteError ? (
            <View className='card quote-price-card'>
              <Text className='quote-section-title'>价格明细</Text>
              <Text className='quote-price-error'>{quoteError}</Text>
              <Button
                className='btn-secondary'
                style={{ marginTop: '16rpx' }}
                onClick={() => Taro.navigateBack()}
              >
                返回改色工作台
              </Button>
            </View>
          ) : null}

          {/* 客户信息 */}
          <View className='card quote-form-card'>
            <Text className='quote-section-title'>客户信息</Text>

            <View className='quote-form-group'>
              <Text className='quote-form-label'>
                客户姓名 <Text className='quote-form-required'>*</Text>
              </Text>
              <Input
                className={`quote-form-input ${nameError ? 'quote-form-input--error' : ''}`}
                placeholder='请输入客户姓名'
                placeholderClass='quote-form-placeholder'
                value={customerName}
                onInput={handleNameInput}
                maxlength={20}
              />
              {nameError && <Text className='quote-form-error'>{nameError}</Text>}
            </View>

            <View className='quote-form-group'>
              <Text className='quote-form-label'>
                手机号码 <Text className='quote-form-required'>*</Text>
              </Text>
              <Input
                className={`quote-form-input ${phoneError ? 'quote-form-input--error' : ''}`}
                type='number'
                placeholder='请输入手机号码'
                placeholderClass='quote-form-placeholder'
                value={customerPhone}
                onInput={handlePhoneInput}
                maxlength={11}
              />
              {phoneError && <Text className='quote-form-error'>{phoneError}</Text>}
            </View>

            <View className='quote-form-group'>
              <Text className='quote-form-label'>备注 (选填)</Text>
              <Input
                className='quote-form-input quote-form-input--textarea'
                placeholder='可填写客户特殊需求'
                placeholderClass='quote-form-placeholder'
                value={remark}
                onInput={handleRemarkInput}
                maxlength={200}
              />
              <Text className='quote-form-char-count'>{remark.length}/200</Text>
            </View>
          </View>

          {/* 全局错误 */}
          {pageError && (
            <View className='quote-page-error'>
              <Text className='quote-page-error-text'>{pageError}</Text>
            </View>
          )}

          {/* 按钮 */}
          <View className='quote-actions'>
            <Button
              className={`btn-primary ${submitting ? 'btn-primary--disabled' : ''}`}
              onClick={handleSubmit}
              disabled={submitting}
              loading={submitting}
            >
              {submitting ? '提交中...' : '提交生成报价单'}
            </Button>
            <Button className='btn-secondary' style={{ marginTop: '16rpx' }} onClick={handleContactService}>
              联系客服
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
