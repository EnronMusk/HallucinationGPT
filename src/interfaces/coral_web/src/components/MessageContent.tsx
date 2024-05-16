import { Transition } from '@headlessui/react';
import { PropsWithChildren } from 'react';

import { CitationTextHighlighter } from '@/components/Citations/CitationTextHighlighter';
import { DataTable } from '@/components/DataTable';
import { MarkdownImage } from '@/components/MarkdownImage';
import { Icon } from '@/components/Shared';
import { Markdown, Text } from '@/components/Shared';
import { UploadedFile } from '@/components/UploadedFile';
import {
  type ChatMessage,
  MessageType,
  isAbortedMessage,
  isErroredMessage,
  isFulfilledOrTypingMessage,
  isLoadingMessage,
  Annotation,
} from '@/types/message';
import { cn } from '@/utils';

import { useState, useRef } from 'react';
import { STYLE_LEVEL_TO_CLASSES } from '@/components/Shared';
import internal from 'stream';

type Props = {
  isLast: boolean;
  message: ChatMessage;
  annotations?: Annotation[];
  onRetry?: VoidFunction;
  onAnnotate?: (start: number, end: number) => void;
};

const BOT_ERROR_MESSAGE = 'Unable to generate a response since an error was encountered. ';

export const MessageContent: React.FC<Props> = ({
  isLast,
  message,
  onRetry,
  annotations = [],
  onAnnotate
}) => {
  const isUser = message.type === MessageType.USER;
  const isLoading = isLoadingMessage(message);
  const isBotError = isErroredMessage(message);
  const isUserError = isUser && message.error;
  const isAborted = isAbortedMessage(message);
  const isTypingOrFulfilledMessage = isFulfilledOrTypingMessage(message);

  const contentRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const range = selection.getRangeAt(0);
      const start = range.startOffset;
      const end = range.endOffset;
  
      // Call the annotation handler passed as props
      if (onAnnotate) {
        onAnnotate(start, end);
      }
    }
  };

  const renderAnnotatedText = (text: string) => {
    if (annotations.length === 0) {
      return <Markdown
      text={text}
      className={cn(STYLE_LEVEL_TO_CLASSES.p)}
      />
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    annotations.forEach(({ start, end, text: annotatedText }, index) => {
      if (start !== -1) {
        parts.push(
          <span key={`part-${index}-${lastIndex}`}>{text.substring(lastIndex, start)}</span>,
          <span key={index} className={cn('bg-yellow-100”, “annotated-text')}>
            {annotatedText}
          </span>
        );
        lastIndex = end;
      }
    });

    if (lastIndex < text.length) {
      parts.push(<span key={`part-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    }

    return parts;
  };

  let content: React.ReactNode = null;

  if (isUserError) {
    content = (
      <>
        <Text>{message.text}</Text>
        <MessageInfo type="error">
          {message.error}
          {isLast && (
            <button className="underline underline-offset-1" type="button" onClick={onRetry}>
              Retry?
            </button>
          )}
        </MessageInfo>
      </>
    );
    // } else if (isUser) {
    //   content = (
    //     <div ref={contentRef} onMouseUp={handleMouseUp}>
    //     {renderAnnotatedText(message.text)}
    //   </div>
    //   );
  } else if (isLoading) {
    const hasLoadingMessage = message.text.length > 0;
    content = (
      <Text className={cn('flex min-w-0 text-volcanic-700')} as="span">
        {hasLoadingMessage && (
          <Transition
            appear={true}
            show={true}
            enterFrom="opacity-0"
            enterTo="opacity-full"
            enter="transition-opacity ease-in-out duration-500"
          >
            {message.text}
          </Transition>
        )}
        {!hasLoadingMessage && (
          <span className="w-max">
            <div className="animate-typing-ellipsis overflow-hidden whitespace-nowrap pr-1">
              ...
            </div>
          </span>
        )}
      </Text>
    );
  } else if (isBotError) {
    content = (
      <>
        {message.text.length > 0 ? (
          <Markdown text={message.text} />
        ) : (
          <Text className={cn('text-volcanic-700')}>{BOT_ERROR_MESSAGE}</Text>
        )}
        <MessageInfo type="error">{message.error}</MessageInfo>
      </>
    );
  } else {
    const hasCitations =
      isTypingOrFulfilledMessage && message.citations && message.citations.length > 0;
    content = (
      <>
        <div ref={contentRef} onMouseUp={handleMouseUp}>
          {renderAnnotatedText(message.text)}
        </div>
        
        {isAborted && (
          <MessageInfo>
            This generation was stopped.{" "}
            {isLast && isAborted && (
              <button className='underline underline-offset-1' type='button' onClick={onRetry}>
                Retry?
              </button>
            )}
          </MessageInfo>
        )}
      </>
    );
  }

  return (
    <div className="flex w-full flex-col justify-center gap-y-1 py-1">
      <Text
        as="div"
        className="flex flex-col gap-y-1 whitespace-pre-wrap [overflow-wrap:anywhere] md:max-w-4xl"
      >
        {content}
      </Text>
    </div>
  );
};

const MessageInfo = ({
  type = 'default',
  children,
}: PropsWithChildren & { type?: 'default' | 'error' }) => (
  <div
    className={cn('flex items-start gap-1', {
      'text-volcanic-700': type === 'default',
      'text-danger-500': type === 'error',
    })}
  >
    <Icon name="warning" size="md" className="flex items-center text-p" />
    <Text as="span">{children}</Text>
  </div>
);
