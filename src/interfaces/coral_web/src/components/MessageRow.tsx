import { usePreviousDistinct } from '@react-hookz/web';
import { forwardRef, useEffect, useState, useRef } from 'react';
import React from 'react';
import { useLongPress } from 'react-aria';

import { Avatar } from '@/components/Avatar';
import IconButton from '@/components/IconButton';
import { LongPressMenu } from '@/components/LongPressMenu';
import { MessageContent } from '@/components/MessageContent';
import {
  Button,
  CopyToClipboardButton,
  CopyToClipboardIconButton,
  Icon,
  Markdown,
  Tooltip,
  Text,
} from '@/components/Shared';
import { ToolEvents } from '@/components/ToolEvents';
import { ReservedClasses } from '@/constants';
import { Breakpoint, useBreakpoint } from '@/hooks/breakpoint';
import { getMessageRowId } from '@/hooks/citations';
import { useCitationsStore } from '@/stores';
import {
  type ChatMessage,
  isAbortedMessage,
  isErroredMessage,
  isFulfilledMessage,
  isFulfilledOrTypingMessage,
  isFulfilledOrTypingMessageWithCitations,
  isUserMessage,
} from '@/types/message';
import { cn } from '@/utils';

import { STYLE_LEVEL_TO_CLASSES } from '@/components/Shared';
import { render } from '@headlessui/react/dist/utils/render';

import { CitationTextHighlighter } from '@/components/Citations/CitationTextHighlighter';
import { DataTable } from '@/components/DataTable';
import { MarkdownImage } from '@/components/MarkdownImage';

type Props = {
  isLast: boolean;
  message: ChatMessage;
  delay?: boolean;
  className?: string;
  onCopy?: VoidFunction;
  onRetry?: VoidFunction;
};

/**
 * Renders a single message row from the user or from our models.
 */
const MessageRow = forwardRef<HTMLDivElement, Props>(function MessageRowInternal(
  { message, delay = false, isLast, className = '', onCopy, onRetry },
  ref
) {
  const breakpoint = useBreakpoint();

  const [isShowing, setIsShowing] = useState(false);
  const [isLongPressMenuOpen, setIsLongPressMenuOpen] = useState(false);
  const [isStepsExpanded, setIsStepsExpanded] = useState<boolean>(isLast);
  const {
    citations: { selectedCitation, hoveredGenerationId },
    hoverCitation,
  } = useCitationsStore();
  const hasSteps =
    (isFulfilledOrTypingMessage(message) ||
      isErroredMessage(message) ||
      isAbortedMessage(message)) &&
    !!message.toolEvents &&
    message.toolEvents.length > 0;

  const getMessageText = () => {
    if (isFulfilledMessage(message)) {
      return message.originalText;
    }

    return message.text;
  };

  const enableLongPress =
    (isFulfilledMessage(message) || isUserMessage(message)) && breakpoint === Breakpoint.sm;
  const { longPressProps } = useLongPress({
    onLongPress: () => setIsLongPressMenuOpen(true),
  });

  // Delay the appearance of the message to make it feel more natural.
  useEffect(() => {
    if (delay) {
      setTimeout(() => setIsShowing(true), 300);
    }
  }, []);

  useEffect(() => {
    if (isLast) {
      setIsStepsExpanded(true);
    }
  }, [isLast]);

  const [highlightMessage, setHighlightMessage] = useState(false);
  const prevSelectedCitationGenId = usePreviousDistinct(selectedCitation?.generationId);

  useEffect(() => {
    if (isFulfilledOrTypingMessage(message) && message.citations && message.generationId) {
      if (
        selectedCitation?.generationId === message.generationId &&
        prevSelectedCitationGenId !== message.generationId
      ) {
        setHighlightMessage(true);

        setTimeout(() => {
          setHighlightMessage(false);
        }, 1000);
      }
    }
  }, [selectedCitation?.generationId, prevSelectedCitationGenId]);

  if (delay && !isShowing) return null;

  const handleOnMouseEnter = () => {
    if (isFulfilledOrTypingMessageWithCitations(message)) {
      hoverCitation(message.generationId);
    }
  };

  const handleOnMouseLeave = () => {
    if (isFulfilledOrTypingMessageWithCitations(message)) {
      hoverCitation(null);
    }
  };

  const word = "word"

  //

  // Annotations code for error highlighing in prompts!!!

  //

  type Annotation = {
    text: string;
    annotation: string;
  };

  // State to manage the selected text and annotations
  const [selectedText, setSelectedText] = useState<string>("");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationIndex, setAnnotationIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Function to handle text selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const text = selection.toString();
      setSelectedText(text)
      setAnnotationIndex(selection.anchorOffset);
    }
  };

  // Function to add annotation
  const addAnnotation = (a: string) => {
    setAnnotations(prevAnnotations => [
      ...prevAnnotations,
      { text: selectedText, annotation: a }
  ]);
    setSelectedText("");
    setAnnotationIndex(null);
  };


  const renderAnnotatedText = (text: string) => {
    if (annotationIndex === null || !selectedText) {
      return (
        <Markdown
          text={text}
          className={cn(STYLE_LEVEL_TO_CLASSES.p)}
          customComponents={{
            img: MarkdownImage as any,
            cite: CitationTextHighlighter as any,
            table: DataTable as any,
          }}
          renderLaTex={true}
          highlightedRanges={[{start:210, end:220}]}
        />
      );
    }

    // Split the text while keeping the selected text parts intact
    const parts = text.split(new RegExp((`${selectedText}`), "g"));
    
    let currentCharIndex = 0;
    const annotatedElements = parts.map((part, index) => {
      const isSelectedText = part === selectedText && currentCharIndex === annotationIndex;
      
      if (isSelectedText) {
        currentCharIndex += part.length;
        return (
          <React.Fragment key={index}>
            <span className="bg-yellow-100">{selectedText}</span> 
                <input
                ref={inputRef}
                type='text'
                style={{
                  fontSize: '14px', // Adjust the font size as needed
                  height: '2rem', // Adjust the height as needed
                  width: '200px', // Adjust the width as needed
                  padding: '0.5rem', // Adjust the padding as needed
                  lineHeight: '1.5', // Adjust the line height as needed
                  fontFamily: 'Arial, sans-serif' // Adjust the font family as needed
              }}
                className={cn(
                  'min-h-[1rem] md:min-h-[2rem]',
                  "w-auto",
                  'self-center',
                  'rounded',
                  'px-1 px-2',
                  'border',
                  'bg-danger-50',
                  'text-lg',
              
                  'border-secondary-400',
                  'transition ease-in-out',
                  'focus:border-secondary-700',
                  'focus:outline-none',
      
                  'placeholder-base'
                  
                )}
                  
                  placeholder="Add annotation . . ."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const target = e.target as HTMLInputElement;
                      const index = annotations.findIndex(a => a.text === selectedText);
                      if (index !== -1) {
                          addAnnotation(target.value);
                      }
                      target.value = "";
                    }
                  }}
            />
          </React.Fragment>
        );
      }
      
      currentCharIndex += part.length;
      return part;
    });

    // Join parts back together
    const annotatedText = annotatedElements.reduce((acc, elem) => {
      // Determine if fragment and join back to string
      if (typeof elem === "string") {
        return acc + elem;
      }
      return acc;
    }, '');

    // Return the entire annotated text as a single string
    return (
      <Markdown
        text={text}
        className={cn(STYLE_LEVEL_TO_CLASSES.p)}
        customComponents={{
          img: MarkdownImage as any,
          cite: CitationTextHighlighter as any,
          table: DataTable as any,
        }}
        renderLaTex={true}
        highlightedRanges={[{start:2, end:5},{start:6, end:10}]}
      />
    );
  };


  return (
    <div
      id={
        isFulfilledOrTypingMessage(message) && message.generationId
          ? getMessageRowId(message.generationId)
          : undefined
      }
      className={cn(ReservedClasses.MESSAGE, 'flex', className)}
      onMouseEnter={handleOnMouseEnter}
      onMouseLeave={handleOnMouseLeave}
      onMouseUp={handleMouseUp}
      ref={ref}
    >
      <LongPressMenu
        isOpen={isLongPressMenuOpen}
        close={() => setIsLongPressMenuOpen(false)}
        className="md:hidden"
      >
        <div className={cn('flex flex-col divide-y', 'divide-marble-300')}>
          <div className="flex flex-col gap-y-4 pt-4">
            <CopyToClipboardButton
              value={getMessageText()}
              label="Copy text"
              kind="secondary"
              iconAtStart
              onClick={onCopy}
            />
            {hasSteps && (
              <Button
                label={`${isStepsExpanded ? 'Hide' : 'Show'} steps`}
                startIcon={<Icon name="list" />}
                kind="secondary"
                size="md"
                aria-label={`${isStepsExpanded ? 'Hide' : 'Show'} steps`}
                animate={false}
                onClick={() => setIsStepsExpanded((prevIsExpanded) => !prevIsExpanded)}
              />
            )}
          </div>
        </div>
      </LongPressMenu>
      <div
        className={cn(
          'group flex h-fit w-full flex-col gap-2 rounded-md p-2 text-left md:flex-row',
          'transition-colors ease-in-out',
          'hover:bg-secondary-100',

          {
            'bg-secondary-50':
              isFulfilledOrTypingMessage(message) &&
              message.generationId &&
              hoveredGenerationId === message.generationId,
            'bg-primary-50 hover:bg-primary-50': highlightMessage,
          }
        )}
        {...(enableLongPress && longPressProps)}
      >
        <div className="flex w-full gap-x-2">
          <Avatar message={message} />
          <div className="flex w-full min-w-0 max-w-message flex-1 flex-col items-center gap-x-3 md:flex-row">
            <div className="w-full">
              {hasSteps && <ToolEvents show={isStepsExpanded} events={message.toolEvents} />}

              {//This is where we render the annotated box
              }
              
              <div className="flex w-full flex-col justify-center gap-y-1 py-1">
                <Text        
                  as="div"
                  className="flex flex-col gap-y-1 whitespace-pre-wrap [overflow-wrap:anywhere] md:max-w-4xl">
                  <div>
                    {renderAnnotatedText(message.text)}
                  </div>
                </Text>
              </div>

              {//This was an old rendering pipeline. 
              //<MessageContent isLast={isLast} message={message} onRetry={onRetry} />
              }

              {annotations.map((annotation, index) => (
                <div key={index} className='bg-secondary-50 p-1 my-1'>
                  <span className='font-bold'>{annotation.text}</span>: {annotation.annotation}
                </div>
              ))}
            </div>

            

            <div
              className={cn('flex h-full items-end justify-end self-end', {
                'hidden md:invisible md:flex':
                  !isFulfilledMessage(message) && !isUserMessage(message),
                'hidden md:invisible md:flex md:group-hover:visible': !isLast,
              })}
            >
              {hasSteps && (
                <Tooltip label={`${isStepsExpanded ? 'Hide' : 'Show'} steps`} hover>
                  <IconButton
                    iconName="list"
                    className="rounded hover:bg-secondary-100"
                    iconClassName={cn(
                      'text-volcanic-800 group-hover/icon-button:text-secondary-800',
                      {
                        'hidden md:invisible md:flex': !isFulfilledMessage(message),
                      }
                    )}
                    onClick={() => setIsStepsExpanded((prevIsExpanded) => !prevIsExpanded)}
                  />
                </Tooltip>
              )}
              <CopyToClipboardIconButton value={getMessageText()} onClick={onCopy} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
export default MessageRow;
