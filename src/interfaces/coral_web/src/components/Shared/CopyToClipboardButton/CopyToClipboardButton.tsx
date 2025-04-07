'use client';

import { MouseEvent, forwardRef, useImperativeHandle, useState } from 'react';

import { Button, Icon, IconName, Tooltip } from '@/components/Shared';
import { cn } from '@/utils';

type CopyToClipboardButtonProps = {
  value: string;
  label?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  kind?: 'primary' | 'secondary';
  animate?: boolean;
  disabled?: boolean;
  className?: string;
  iconAtStart?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLElement>;
};

type CopyToClipboardButtonHandle = {
  triggerCopy: (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => void;
};

/**
 * Displays a button where, when clicked, copies text to your clipboard
 */
export const CopyToClipboardButton = forwardRef<
  CopyToClipboardButtonHandle,
  CopyToClipboardButtonProps
>(function CopyButton(
  {
    label,
    value,
    disabled = false,
    className = '',
    size = 'md',
    kind = 'primary',
    iconAtStart = false,
    onClick,
    onTouchEnd,
    animate = true,
  },
  ref
) {
  const [copied, setCopied] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await window?.navigator?.clipboard.writeText(value ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
      onClick?.(e);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTouch = async (e: React.TouchEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await window?.navigator?.clipboard.writeText(value ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
      onTouchEnd?.(e);
    } catch (e) {
      console.error(e);
    }
  };

  useImperativeHandle(ref, () => ({
    triggerCopy(e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) {
      handleClick(e as React.MouseEvent<HTMLElement>);
      handleTouch(e as React.TouchEvent<HTMLElement>);
    },
  }));

  const icon =
    kind === 'secondary' ? (
      <Icon name="copy" kind="outline" className="leading-normal" />
    ) : undefined;

  return (
    <Button
      kind={kind}
      size={size}
      onClick={handleClick}
      onTouchEnd={handleTouch}
      label={copied ? 'Copied!' : label}
      animate={animate}
      {...(kind === 'primary' ? { splitIcon: 'copy' } : {})}
      startIcon={iconAtStart ? icon : undefined}
      endIcon={!iconAtStart ? icon : undefined}
      className={className}
      disabled={disabled}
      aria-label={copied ? 'copied' : 'copy'}
    />
  );
});

type CopyToClipboardIconButtonProps = {
  iconName?: IconName;
  value: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
  onTouchEnd?: React.TouchEventHandler<HTMLElement>;
  disabled?: boolean;
  iconClassName?: string;
  buttonClassName?: string;
};

export const CopyToClipboardIconButton: React.FC<CopyToClipboardIconButtonProps> = ({
  iconName = 'copy',
  value,
  onClick,
  onTouchEnd,
  disabled,
  iconClassName,
  buttonClassName,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent<HTMLElement>) => {
    try {
      await window?.navigator?.clipboard.writeText(value ?? '');
      setIsCopied(true);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
      onClick?.(e);
    }
  };

  const handleCopyTouch = async (e: React.TouchEvent<HTMLElement>) => {
    try {
      await window?.navigator?.clipboard.writeText(value ?? '');
      setIsCopied(true);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        setIsCopied(false);
      }, 1000);
      onTouchEnd?.(e);
    }
  };

  return (
    <div>
      <Tooltip
        label={isCopied ? 'Copied!' : 'Copy'}
        duration={1000}
        showOutline={false}
        hover
        className="-translate-x-[40%]"
        buttonClassName={buttonClassName}
        icon={
          <Icon
            aria-disabled={disabled}
            className={cn(
              'flex rounded p-2',
              'transition ease-in-out',
              'text-volcanic-300 hover:bg-mushroom-900 hover:text-mushroom-300',
              iconClassName
            )}
            name={iconName}
            kind="outline"
            onClick={handleCopy}
            onTouchEnd={handleCopyTouch}
          />
        }
      />
    </div>
  );
};
