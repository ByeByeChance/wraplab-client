import { View, Canvas } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect } from 'react';

interface ShareCardData {
  coverUrl: string;
  title: string;
  subtitle: string;
  storeLogoUrl?: string;
  storeName: string;
  qrCodeUrl: string;
}

interface ShareCardCanvasProps {
  cardData: ShareCardData | null;
  visible: boolean;
  onRenderComplete: (tempFilePath: string) => void;
  onRenderError: (error: string) => void;
}

export default function ShareCardCanvas({
  cardData,
  visible,
  onRenderComplete,
  onRenderError,
}: ShareCardCanvasProps) {
  useEffect(() => {
    if (!cardData || !visible) return;

    void drawShareCard();
  }, [cardData, visible]);

  const drawShareCard = async (): Promise<void> => {
    if (!cardData) return;

    try {
      const ctx = Taro.createCanvasContext('share-card-canvas');

      // 1. 白色背景
      ctx.setFillStyle('#FFFFFF');
      ctx.fillRect(0, 0, 750, 1334);

      // 2. 封面图
      let coverPath = '';
      try {
        const coverRes = await Taro.downloadFile({ url: cardData.coverUrl });
        if (coverRes.statusCode === 200) {
          coverPath = coverRes.tempFilePath;
        }
      } catch {
        // 封面下载失败，使用占位
      }

      if (coverPath) {
        ctx.drawImage(coverPath, 0, 0, 750, 400);
      } else {
        // 灰色占位区域
        ctx.setFillStyle('#F5F5F5');
        ctx.fillRect(0, 0, 750, 400);
      }

      // 3. 渐变蒙层
      const gradient = ctx.createLinearGradient(0, 200, 0, 400);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.setFillStyle(gradient);
      ctx.fillRect(0, 200, 750, 200);

      // 4. 标题
      ctx.setFontSize(36);
      ctx.setFillStyle('#FFFFFF');
      ctx.setTextAlign('left');
      const titleLines = wrapText(ctx, cardData.title, 670, 18);
      titleLines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, 40, 290 + i * 48);
      });

      // 5. 副标题
      ctx.setFontSize(24);
      ctx.setFillStyle('rgba(255,255,255,0.85)');
      ctx.fillText(cardData.subtitle, 40, 355);

      // 6. 小程序码
      try {
        const qrRes = await Taro.downloadFile({ url: cardData.qrCodeUrl });
        if (qrRes.statusCode === 200) {
          ctx.drawImage(qrRes.tempFilePath, 510, 1080, 200, 200);
        } else {
          drawQrPlaceholder(ctx);
        }
      } catch {
        drawQrPlaceholder(ctx);
      }

      // 7. 长按识别
      ctx.setFontSize(20);
      ctx.setFillStyle('#BFBFBF');
      ctx.setTextAlign('center');
      ctx.fillText('长按识别查看详情', 610, 1295);

      // 8. 门店 Logo + 名称
      if (cardData.storeLogoUrl) {
        try {
          const logoRes = await Taro.downloadFile({ url: cardData.storeLogoUrl });
          if (logoRes.statusCode === 200) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(80, 1160, 40, 0, 2 * Math.PI);
            ctx.clip();
            ctx.drawImage(logoRes.tempFilePath, 40, 1120, 80, 80);
            ctx.restore();
          }
        } catch {
          // Logo 下载失败，只画文字
        }
      }

      ctx.setFontSize(24);
      ctx.setFillStyle('#595959');
      ctx.setTextAlign('left');
      ctx.fillText(cardData.storeName, 135, 1155);

      // 9. 导出
      ctx.draw(false, () => {
        Taro.canvasToTempFilePath({
          canvasId: 'share-card-canvas',
          success: (res) => {
            onRenderComplete(res.tempFilePath);
          },
          fail: () => {
            onRenderError('Canvas 导出失败');
          },
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Canvas 绘制失败';
      onRenderError(message);
    }
  };

  const drawQrPlaceholder = (
    ctx: Taro.CanvasContext,
  ): void => {
    ctx.setFillStyle('#F5F5F5');
    ctx.fillRect(510, 1080, 200, 200);
    ctx.setFontSize(22);
    ctx.setFillStyle('#8C8C8C');
    ctx.setTextAlign('center');
    ctx.fillText('扫码查看', 610, 1180);
  };

  return (
    <View className='share-card-canvas' style={{ display: visible ? 'block' : 'none' }}>
      <Canvas
        canvasId='share-card-canvas'
        id='share-card-canvas'
        type='2d'
        style={{
          position: 'fixed',
          left: 0,
          width: '750rpx',
          height: '1334rpx',
        }}
      />
    </View>
  );
}

/**
 * 文字换行 (Canvas 不支持自动换行)
 * Uses ctx.measureText() for accurate width-based wrapping, handling CJK/Latin mixed text correctly.
 */
function wrapText(
  ctx: Taro.CanvasContext,
  text: string,
  maxWidth: number,
  _maxCharsPerLine: number,
): string[] {
  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const testLine = current + text[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && current.length > 0) {
      lines.push(current);
      current = text[i];
    } else {
      current = testLine;
    }
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}
