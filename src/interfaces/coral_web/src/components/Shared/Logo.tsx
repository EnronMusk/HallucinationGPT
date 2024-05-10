import cx from 'classnames';
import { Icon, IconProps } from './Icon';

interface LogoProps {
  includeBrandName?: boolean;
  style?: 'default' | 'grayscale' | 'coral';
  className?: string;
  darkModeEnabled?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className }) => (
  <span className={cx('flex items-center', className)}>
    <Icon name="globe-stand" className="mr-2" /> {}
    <span className="font-bold">ChatGPT Hallucination Leaderboard</span>
  </span>
);
