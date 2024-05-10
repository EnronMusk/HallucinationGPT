import cx from 'classnames';

interface LogoProps {
  includeBrandName?: boolean;
  style?: 'default' | 'grayscale' | 'coral';
  className?: string;
  darkModeEnabled?: boolean;
}

export const Logo: React.FC<{
  className?: string;
}> = ({ className }) => (
  <span className={className}>ChatGPT Hallucination Leaderboard</span>
);
