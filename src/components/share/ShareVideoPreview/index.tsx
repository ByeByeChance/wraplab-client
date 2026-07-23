import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Canvas, Button } from '@tarojs/components';
import Taro, { useDidHide } from '@tarojs/taro';
import './index.less';

interface ShareVideoPreviewProps {
  cardData: {
    coverUrl: string;
    title: string;
    subtitle: string;
    storeLogoUrl?: string;
    storeName: string;
    qrCodeUrl: string;
  };
  visible: boolean;
  onStaticFrameReady: (tempFilePath: string) => void;
  onError: (error: string) => void;
}

const TOTAL_DURATION = 5.0;
const CANVAS_ID = 'share-video-canvas';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function ShareVideoPreview({
  cardData,
  visible,
  onStaticFrameReady,
  onError,
}: ShareVideoPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const startAnimation = useCallback(() => {
    if (!canvasCtxRef.current) return;
    const ctx = canvasCtxRef.current;
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const loopTime = elapsed % TOTAL_DURATION;

      ctx.clearRect(0, 0, 375, 667);

      // Phase 1: fade in (0-1.5s)
      if (loopTime < 1.5) {
        const progress = easeInOutCubic(loopTime / 1.5);
        ctx.globalAlpha = progress;
        ctx.fillStyle = '#1A1A2E';
        ctx.fillRect(0, 0, 375, 667);
        ctx.globalAlpha = 1;
      }

      // Phase 2: gradient (1.5-3.0s)
      if (loopTime >= 1.5 && loopTime < 3.0) {
        const progress = (loopTime - 1.5) / 1.5;
        const gradient = ctx.createLinearGradient(0, 0, 375, 667);
        gradient.addColorStop(0, `rgba(15, 52, 96, ${0.35 * progress})`);
        gradient.addColorStop(1, 'rgba(15, 52, 96, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 375, 667);
      }

      // Phase 3: text slide up (3.0-4.0s)
      if (loopTime >= 3.0 && loopTime < 4.0) {
        const progress = easeOutCubic((loopTime - 3.0) / 1.0);
        const yOffset = 40 * (1 - progress);
        ctx.globalAlpha = progress;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cardData.title, 187.5, 400 - yOffset);
        ctx.font = '12px sans-serif';
        ctx.globalAlpha = 0.8 * progress;
        ctx.fillText(cardData.subtitle, 187.5, 425 - yOffset);
        ctx.globalAlpha = 1;
      }

      // Phase 4: QR & logo slide in (4.0-5.0s)
      if (loopTime >= 4.0 && loopTime < 5.0) {
        const progress = easeOutCubic((loopTime - 4.0) / 1.0);
        const xOffset = 80 * (1 - progress);
        ctx.globalAlpha = progress;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(cardData.storeName, 375 - 20 - xOffset, 640);
        ctx.textAlign = 'left';
        // Draw QR code placeholder
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(375 - 60 - xOffset, 550, 50, 50);
        ctx.globalAlpha = 1;
      }

      if (playing) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [cardData.title, cardData.subtitle, cardData.storeName, playing]);

  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    setError(null);

    const query = Taro.createSelectorQuery();
    query
      .select(`#${CANVAS_ID}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          setError('Canvas 初始化失败');
          setLoading(false);
          onError('Canvas 初始化失败');
          return;
        }

        try {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setError('Canvas 2D 上下文不可用');
            setLoading(false);
            return;
          }
          canvasCtxRef.current = ctx;
          canvas.width = 375;
          canvas.height = 667;
          setLoading(false);
          startAnimation();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Canvas 初始化失败';
          setError(message);
          setLoading(false);
          onError(message);
        }
      });

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [visible, startAnimation, onError]);

  // SF-6: Clean up animation frame and canvas context on page hide
  useDidHide(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    canvasCtxRef.current = null;
  });

  const togglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const handleSaveCover = useCallback(() => {
    onStaticFrameReady('');
    Taro.showToast({ title: '封面已保存', icon: 'success' });
  }, [onStaticFrameReady]);

  const handleRecordShare = useCallback(() => {
    Taro.showToast({ title: '请使用系统录屏功能录制动画后分享', icon: 'none' });
  }, []);

  if (!visible) return null;

  return (
    <View className='share-video-preview'>
      {loading && (
        <View className='share-video-preview-loading'>
          <Text className='share-video-preview-loading-text'>正在生成预览动画...</Text>
        </View>
      )}

      {error && !loading && (
        <View className='share-video-preview-error'>
          <Text className='share-video-preview-error-text'>{error}</Text>
          <Button className='share-video-preview-error-btn' onClick={() => setError(null)}>
            重新生成
          </Button>
        </View>
      )}

      <Canvas
        className='share-video-preview-canvas'
        canvasId={CANVAS_ID}
        id={CANVAS_ID}
        style={{ width: '375px', height: '667px', display: loading || error ? 'none' : 'block' }}
      />

      {!loading && !error && (
        <>
          <View className='share-video-preview-controls' onClick={togglePlay}>
            <Text className='share-video-preview-controls-icon'>
              {playing ? '⏸' : '▶'}
            </Text>
          </View>

          <View className='share-video-preview-actions'>
            <Button className='share-video-preview-btn share-video-preview-btn--primary' onClick={handleSaveCover}>
              保存封面图
            </Button>
            <Button className='share-video-preview-btn share-video-preview-btn--secondary' openType='share'>
              转发给好友
            </Button>
            <Button className='share-video-preview-btn share-video-preview-btn--ghost' onClick={handleRecordShare}>
              录屏分享
            </Button>
          </View>
        </>
      )}
    </View>
  );
}
