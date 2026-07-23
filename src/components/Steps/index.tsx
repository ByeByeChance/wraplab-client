import { View, Text } from '@tarojs/components';

interface StepsProps {
  steps: Array<{ title: string }>;
  current: number; // 0-indexed
  onStepTap?: (stepIndex: number) => void;
}

const Steps: React.FC<StepsProps> = ({ steps, current, onStepTap }) => {
  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: '100rpx',
        padding: '0 32rpx',
        backgroundColor: '#FFFFFF',
      }}
    >
      {steps.map((step, index) => {
        const isCompleted = index < current;
        const isCurrent = index === current;
        const isClickable = isCompleted && onStepTap;

        let circleBg: string;
        let circleBorder: string;
        let textColor: string;
        let fontWeight: number;
        let innerContent: React.ReactNode;

        if (isCompleted) {
          circleBg = '#52C41A';
          circleBorder = '#52C41A';
          textColor = '#1A1A2E';
          fontWeight = 700;
          innerContent = (
            <Text style={{ color: '#FFF', fontSize: '22rpx' }}>✓</Text>
          );
        } else if (isCurrent) {
          circleBg = '#0F3460';
          circleBorder = '#0F3460';
          textColor = '#1A1A2E';
          fontWeight = 700;
          innerContent = (
            <Text style={{ color: '#FFF', fontSize: '22rpx' }}>
              {index + 1}
            </Text>
          );
        } else {
          circleBg = '#FFF';
          circleBorder = '#D9D9D9';
          textColor = '#BFBFBF';
          fontWeight = 400;
          innerContent = (
            <Text style={{ color: '#BFBFBF', fontSize: '22rpx' }}>
              {index + 1}
            </Text>
          );
        }

        return (
          <View
            key={index}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              flex: index < steps.length - 1 ? 1 : 0,
            }}
          >
            <View
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              onClick={() => {
                if (isClickable) onStepTap?.(index);
              }}
            >
              <View
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: circleBg,
                  border: `2px solid ${circleBorder}`,
                }}
              >
                {innerContent}
              </View>
              <Text
                style={{
                  fontSize: '22rpx',
                  color: textColor,
                  fontWeight,
                  marginTop: '8rpx',
                }}
              >
                {step.title}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: isCompleted ? '#52C41A' : '#E8E8E8',
                  marginBottom: '20rpx',
                  marginLeft: '4rpx',
                  marginRight: '4rpx',
                }}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

export default Steps;
