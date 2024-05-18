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
  Annotation,
} from '@/types/message';
import { cn } from '@/utils';

import { STYLE_LEVEL_TO_CLASSES } from '@/components/Shared';
import { render } from '@headlessui/react/dist/utils/render';
import { v4 as uuidv4 } from 'uuid';

import { CitationTextHighlighter } from '@/components/Citations/CitationTextHighlighter';
import { DataTable } from '@/components/DataTable';
import { MarkdownImage } from '@/components/MarkdownImage';
import { zIndex } from '@/constants/tailwindConfigValues';

import { Dictionary } from 'lodash';

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

  //Store our annots here!
  const [annotDict, setAnnotDict] = useState<{ [key: string]: Annotation }>({});

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

  //

  // Annotations code for error highlighing in prompts!!!

  //


  // State to manage the selected text and annotations
  const [annotationVisible, setAnnotationVisible] = useState<boolean>(false);
  const [annotationKey, setAnnotationKey] = useState<string>("");  
  const annotationRef = useRef<HTMLDivElement>(null);

  // Function to handle text selection
  const handleMouseUp = () => {
    const selection = window.getSelection();
    console.log('select', selection?.toString())
    console.log("annot", annotationVisible)
    if (selection && selection?.toString()) {
      const range = selection.getRangeAt(0);
      const start = range.startOffset;
      const end = range.endOffset;
      

      console.log("set!")
      console.log("range anchor", selection.anchorOffset)
      console.log("range", selection)
      console.log("range count")
    
      const id = addAnnotation(selection.toString(), "default_annotation", start, end)
      setAnnotationVisible(true);
      setAnnotationKey(id);

  }
  
  };
  
  // Function to add annotation
  const addAnnotation = (s: string, a: string, start: number, end: number) => {

    const id = uuidv4().toString();


    console.log('start', start)
    console.log('end', end)

    const annot: Annotation = {
      text: s,
      annotation: a, 
      start: start,
      end: end
    };

  const dict = annotDict;
  dict[id] = annot;
  setAnnotDict(dict)

  console.log(dict[id])
  console.log("key!!!", id)

  return id

   
  };


  interface RenderAnnotatedTextProps {
    msg: string;
    ad: { [key: string]: Annotation };
  }

  const renderAnnotatedText = ({msg, ad}: {msg: string, ad: { [key: string]: Annotation }}) => {

    const ranges = Object.values(ad).map(({ start, end }) => ({ start, end }));

    console.log("HR",ranges)

      return (
        <Markdown
          text={msg}
          className={cn(STYLE_LEVEL_TO_CLASSES.p)}
          customComponents={{
            img: MarkdownImage as any,
            cite: CitationTextHighlighter as any,
            table: DataTable as any,
          }}
          renderLaTex={true}
          //highlightedRanges={[{start:1,end:5},{start:310, end:320},{start:310, end:340}]}
          highlightedRanges={ranges}
        />
      )
    };

  const msg = message.text;

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

              {annotationVisible && (
                    console.log("annot visisble!"),
                    <div style={{
                    position: "absolute"
                    //zIndex: 9999
                  }}
                    > 
                              <input
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

                                    const dict = annotDict;

                                    console.log(annotationKey)
                                    console.log(dict)
                                    console.log("TEXT",message.text)

                                    dict[annotationKey].annotation = target.value;
                                    setAnnotDict(dict)
                                    
                                    setAnnotationVisible(false);
                                    setAnnotationKey("")
                                    target.value = "";
                                  }
                                }}
                          />
                      </div>
                      )}
              
              <div className="flex w-full flex-col justify-center gap-y-1 py-1">
                <Text        
                  as="div"
                  className="flex flex-col gap-y-1 whitespace-pre-wrap [overflow-wrap:anywhere] md:max-w-4xl">
                  <div>
                    {renderAnnotatedText({msg:msg, ad:annotDict})}
                  </div>
                </Text>
              </div>

              {//This was an old rendering pipeline. 
              //<MessageContent isLast={isLast} message={message} onRetry={onRetry} />
              }

              {/* {annotations.map((annotation, index) => (
                <div key={index} className='bg-secondary-50 p-1 my-1'>
                  <span className='font-bold'>{annotation.text}</span>: {annotation.annotation}
                </div>
              ))} */}
           

            {Object.values(annotDict).map((annotation, index) => (
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
