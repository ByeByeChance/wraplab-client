import { useEffect, useState, useCallback } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Image, Button } from '@tarojs/components';
import { getShareCardData, ShareCardData } from '../../../../services/share-card.service';
import ShareCardCanvas from '../../../../components/ShareCardCanvas/index';
import ShareVideoPreview from '../../../../components/share/ShareVideoPreview';
import LoadingSkeleton from '../../../../components/LoadingSkeleton/index';
import ErrorState from '../../../../components/ErrorState/index';

type PreviewMode = 'static' | 'video';

export default function ShareCardPage() {
  const router = useRouter();
  const caseId = router.params.caseId as string;

  const [cardData, setCardData] = useState<ShareCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [tempFilePath, setTempFilePath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Phase 5: Video preview mode
  const [previewMode, setPreviewMode] = useState<PreviewMode>('static');

  // Fetch card data
  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    getShareCardData(caseId)
      .then((data) => {
        setCardData(data);
        setLoading(false);
        setCanvasReady(true);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : '分享卡片数据加载失败';
        setError(message);
        setLoading(false);
      });
  }, [caseId]);

  const handleRenderComplete = useCallback((path: string) => {
    setTempFilePath(path);
    setCanvasReady(false);
  }, []);

  const handleRenderError = useCallback((err: string) => {
    setError(err);
    setCanvasReady(false);
  }, []);

  const handleRetry = useCallback(() => {
    if (cardData) {
      setError(null);
      setCanvasReady(true);
    } else if (caseId) {
      setLoading(true);
      setError(null);
      getShareCardData(caseId)
        .then((data) => {
          setCardData(data);
          setLoading(false);
          setCanvasReady(true);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : '加载失败');
          setLoading(false);
        });
    }
  }, [cardData, caseId]);

  const handleSaveImage = useCallback(async () => {
    if (!tempFilePath || saving) return;
    setSaving(true);
    try {
      const setting = await Taro.getSetting();
      if (setting.authSetting['scope.writePhotosAlbum'] === false) {
        // 用户之前拒绝了
        const modalRes = await Taro.showModal({
          title: '需要相册权限',
          content: '需要相册权限才能保存图片，是否前往设置？',
          confirmText: '去设置',
          cancelText: '取消',
        });
        if (modalRes.confirm) {
          await Taro.openSetting();
        }
        setSaving(false);
        return;
      }
      await Taro.saveImageToPhotosAlbum({ filePath: tempFilePath });
      setSaved(true);
      Taro.showToast({ title: '已保存到相册', icon: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '保存失败';
      Taro.showToast({ title: message, icon: 'none' });
    } finally {
      setSaving(false);
    }
  }, [tempFilePath, saving]);

  const handleShare = useCallback(async () => {
    Taro.showToast({ title: '请使用右上角转发按钮', icon: 'none' });
  }, []);

  const handleGoBack = useCallback(() => {
    Taro.navigateBack({ delta: 1 });
  }, []);

  // Loading state
  if (loading) {
    return (
      <View className='page-container share-card-page'>
        <View className='share-card-preview-skeleton'>
          <LoadingSkeleton type='rect' height='900rpx' />
        </View>
        <Text className='share-card-loading-text'>正在生成分享卡片...</Text>
      </View>
    );
  }

  // Error state
  if (error && !tempFilePath) {
    return (
      <View className='page-container share-card-page'>
        <ErrorState message={error} onRetry={handleRetry} />
        <View className='share-card-error-actions'>
          <Button className='share-card-btn secondary' onClick={handleGoBack}>
            返回案例详情
          </Button>
        </View>
      </View>
    );
  }

  // Success state
  return (
    <View className='page-container share-card-page'>
      {/* Phase 5: Mode toggle tabs */}
      <View className='share-card-mode-tabs'>
        <View
          className={`share-card-mode-tab ${previewMode === 'static' ? 'share-card-mode-tab--active' : ''}`}
          onClick={() => setPreviewMode('static')}
        >
          <Text className='share-card-mode-tab-text'>静态卡片</Text>
        </View>
        <View
          className={`share-card-mode-tab ${previewMode === 'video' ? 'share-card-mode-tab--active' : ''}`}
          onClick={() => setPreviewMode('video')}
        >
          <Text className='share-card-mode-tab-text'>视频预览</Text>
        </View>
      </View>

      {/* Static mode */}
      {previewMode === 'static' && (
        <>
          {/* Canvas hidden drawer */}
          {cardData && (
            <ShareCardCanvas
              cardData={cardData}
              visible={canvasReady}
              onRenderComplete={handleRenderComplete}
              onRenderError={handleRenderError}
            />
          )}

          {/* Preview */}
          <View className='share-card-preview'>
            {tempFilePath ? (
              <Image
                className='share-card-preview-image'
                src={tempFilePath}
                mode='widthFix'
              />
            ) : (
              <View className='share-card-preview-skeleton'>
                <LoadingSkeleton type='rect' height='900rpx' />
              </View>
            )}
          </View>

          {/* Actions */}
          <View className='share-card-actions'>
            <Button
              className={`share-card-btn primary ${saved ? 'saved' : ''}`}
              onClick={handleSaveImage}
              disabled={!tempFilePath || saved}
              loading={saving}
            >
              {saved ? '已保存' : '保存图片'}
            </Button>
            <Button
              className='share-card-btn secondary'
              onClick={handleShare}
              openType='share'
            >
              转发给好友
            </Button>
          </View>
        </>
      )}

      {/* Phase 5: Video preview mode */}
      {previewMode === 'video' && cardData && (
        <ShareVideoPreview
          cardData={cardData}
          visible
          onStaticFrameReady={(path: string) => {
            if (path) setTempFilePath(path);
          }}
          onError={(msg: string) => {
            Taro.showToast({ title: msg, icon: 'none' });
          }}
        />
      )}
    </View>
  );
}
