import { useState, useEffect, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Image, Button, ScrollView, Input } from '@tarojs/components';
import { useAiStore } from '../../../stores/ai-store';
import LoadingSkeleton from '../../../components/LoadingSkeleton';
import EmptyState from '../../../components/EmptyState';
import ErrorState from '../../../components/ErrorState';
import QueueProgress from '../../../components/QueueProgress/index';
import type { AiStyle } from '../../../stores/ai-store';

export default function AiGeneratePage() {
  const router = useRouter();
  const configId = (router.params.configId as string) || '';

  const {
    styles,
    stylesLoading,
    stylesError,
    currentTask,
    fetchStyles,
    submitGeneration,
    startPolling,
    stopPolling,
    resetTask,
  } = useAiStore();

  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  /** 加载风格列表 */
  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  /** 页面卸载时清理 */
  useEffect(() => {
    return () => {
      stopPolling();
      resetTask();
    };
  }, [stopPolling, resetTask]);

  /** 选择风格 */
  const handleStyleSelect = useCallback((style: AiStyle) => {
    setSelectedStyleId(style.id);
  }, []);

  /** 提交生成任务 */
  const handleGenerate = useCallback(async () => {
    if (!configId) {
      Taro.showToast({ title: '缺少配置参数', icon: 'none' });
      return;
    }
    if (!selectedStyleId) {
      Taro.showToast({ title: '请先选择场景风格', icon: 'none' });
      return;
    }

    setSubmitLoading(true);
    try {
      const generationId = await submitGeneration(configId, {
        styleId: selectedStyleId,
        customPrompt: customPrompt.trim() || undefined,
      });
      startPolling(generationId);
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成请求失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSubmitLoading(false);
    }
  }, [configId, selectedStyleId, customPrompt, submitGeneration, startPolling]);

  /** 保存生成图片 */
  const handleSaveImage = useCallback(async (imageUrl: string) => {
    try {
      // 在小程序中保存图片到相册
      const res = await Taro.downloadFile({ url: imageUrl });
      if (res.statusCode === 200) {
        await Taro.saveImageToPhotosAlbum({ filePath: res.tempFilePath });
        Taro.showToast({ title: '已保存到相册', icon: 'success' });
      }
    } catch {
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  }, []);

  /** 重新生成 */
  const handleRegenerate = useCallback(() => {
    resetTask();
  }, [resetTask]);

  /** 返回上一页 */
  const handleGoBack = useCallback(() => {
    Taro.navigateBack({ delta: 1 });
  }, []);

  // 无 configId
  if (!configId) {
    return (
      <View className='page-container'>
        <EmptyState
          icon='\u{1F3A8}'
          message='请从改色设计方案进入'
          actionText='返回上一页'
          onAction={handleGoBack}
        />
      </View>
    );
  }

  // 风格列表加载中
  if (stylesLoading) {
    return (
      <View className='page-container'>
        <LoadingSkeleton type='rect' count={6} />
      </View>
    );
  }

  // 风格列表加载失败
  if (stylesError) {
    return (
      <View className='page-container'>
        <ErrorState message={stylesError} onRetry={fetchStyles} />
      </View>
    );
  }

  // 风格列表为空
  if (styles.length === 0) {
    return (
      <View className='page-container'>
        <EmptyState message='暂无可用风格' subMessage='敬请期待更多场景风格上线' />
      </View>
    );
  }

  // 按分类分组风格
  const groupedStyles: Record<string, AiStyle[]> = {};
  styles.forEach((style) => {
    const cat = style.category;
    if (!groupedStyles[cat]) {
      groupedStyles[cat] = [];
    }
    groupedStyles[cat].push(style);
  });

  const categoryLabels: Record<string, string> = {
    studio: '影棚',
    outdoor: '户外',
    street: '街拍',
  };

  /** 生成中视图 */
  const renderGenerating = () => {
    const task = currentTask;
    if (!task) return null;

    const progress = task.progress || 0;
    const isCompleted = task.status === 'completed';
    const isFailed = task.status === 'failed';
    const isQueuedOrProcessing = task.status === 'pending' || task.status === 'processing';

    return (
      <View className='ai-generate-result'>
        {/* Queue Progress component (queued/processing states) */}
        {isQueuedOrProcessing && (
          <QueueProgress
            status={task.status === 'pending' ? 'queued' : 'processing'}
            progress={progress}
            onBack={handleGoBack}
          />
        )}

        {/* 生成完成 */}
        {isCompleted && task.resultImageUrl && (
          <View className='ai-generate-completed'>
            <QueueProgress status='completed' progress={100} />
            <Image
              className='ai-generate-result-image'
              src={task.resultImageUrl}
              mode='widthFix'
            />
            <View className='ai-generate-actions'>
              <Button
                className='ai-generate-save-btn'
                onClick={() => handleSaveImage(task.resultImageUrl!)}
              >
                保存到相册
              </Button>
              <Button
                className='ai-generate-again-btn'
                onClick={handleRegenerate}
              >
                重新生成
              </Button>
            </View>
          </View>
        )}

        {/* 生成失败 */}
        {isFailed && (
          <View className='ai-generate-failed'>
            <QueueProgress
              status='failed'
              errorMessage={task.errorMessage || '生成失败，请重试'}
              onRetry={handleRegenerate}
              onBack={handleGoBack}
            />
          </View>
        )}
      </View>
    );
  };

  // 处于生成中/完成/失败状态
  if (currentTask && (currentTask.status === 'pending' || currentTask.status === 'processing' || currentTask.status === 'completed' || currentTask.status === 'failed')) {
    return (
      <View className='page-container ai-generate-page'>
        {renderGenerating()}
      </View>
    );
  }

  // 空闲态：风格选择界面
  return (
    <View className='page-container ai-generate-page'>
      <ScrollView className='page-scroll' scrollY>
        {/* 配置摘要 */}
        <View className='ai-generate-config-summary'>
          <Text className='ai-generate-config-title'>当前方案配置</Text>
          <Text className='ai-generate-config-desc'>
            AI 将为您的当前配色方案生成真实场景效果图
          </Text>
        </View>

        {/* 风格选择区域 */}
        <View className='ai-generate-section'>
          <Text className='ai-generate-section-title'>选择场景风格</Text>
          {Object.entries(groupedStyles).map(([category, categoryStyles]) => (
            <View key={category} className='ai-generate-category'>
              <Text className='ai-generate-category-label'>
                {categoryLabels[category] || category}
              </Text>
              <ScrollView className='ai-generate-style-list' scrollX>
                {categoryStyles.map((style) => (
                  <View
                    key={style.id}
                    className={`ai-generate-style-card ${selectedStyleId === style.id ? 'ai-generate-style-card--selected' : ''}`}
                    onClick={() => handleStyleSelect(style)}
                  >
                    <View className='ai-generate-style-card-thumb'>
                      {style.thumbnail ? (
                        <Image
                          className='ai-generate-style-card-image'
                          src={style.thumbnail}
                          mode='aspectFill'
                        />
                      ) : (
                        <View className='ai-generate-style-card-placeholder'>
                          <Text className='ai-generate-style-card-placeholder-text'>
                            {style.name.charAt(0)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className='ai-generate-style-card-name'>
                      {style.name}
                    </Text>
                    <Text className='ai-generate-style-card-desc' numberOfLines={2}>
                      {style.description}
                    </Text>

                    {/* 选中标记 */}
                    {selectedStyleId === style.id && (
                      <View className='ai-generate-style-card-check'>
                        <Text className='ai-generate-style-card-check-text'>已选</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          ))}
        </View>

        {/* 自定义提示词 */}
        <View className='ai-generate-section'>
          <Text className='ai-generate-section-title'>
            补充描述
            <Text className='ai-generate-section-optional'>（选填）</Text>
          </Text>
          <View className='ai-generate-prompt-wrap'>
            <Input
              className='ai-generate-prompt-input'
              placeholder='例如：黄昏光线、雨天地面湿润...'
              value={customPrompt}
              onInput={(e: { detail: { value: string } }) =>
                setCustomPrompt(e.detail.value)
              }
              maxlength={200}
            />
            <Text className='ai-generate-prompt-count'>
              {customPrompt.length}/200
            </Text>
          </View>
        </View>

        {/* 生成按钮 */}
        <View className='ai-generate-submit-wrap'>
          <Button
            className={`ai-generate-submit-btn ${
              !selectedStyleId || submitLoading
                ? 'ai-generate-submit-btn--disabled'
                : ''
            }`}
            onClick={handleGenerate}
            disabled={!selectedStyleId || submitLoading}
            loading={submitLoading}
          >
            开始生成
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
