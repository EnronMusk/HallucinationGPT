'use client';

import { usePreviousDistinct } from '@react-hookz/web';
import { MouseEvent, forwardRef, useEffect, useState, useRef, useImperativeHandle, useMemo, memo, useContext, createContext } from 'react';
import React from 'react';
import { useLongPress } from 'react-aria';

import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/IconButton';
import { LongPressMenu } from '@/components/LongPressMenu';
import { MessageContent } from '@/components/MessageContent';
import {
  Button,
  CopyToClipboardButton,
  CopyToClipboardIconButton,
  Icon,
  Tooltip,
} from '@/components/Shared';
import { ToolEvents } from '@/components/ToolEvents';
import { ReservedClasses } from '@/constants';
import { Breakpoint, useBreakpoint } from '@/hooks/breakpoint';
import { getMessageRowId } from '@/hooks/citations';
import {
  type ChatMessage,
  isAbortedMessage,
  isErroredMessage,
  isFulfilledMessage,
  isFulfilledOrTypingMessage,
  isUserMessage,
  Annotation,
  MessageType,
} from '@/types/message';
import { cn } from '@/utils';

import { useCitationsStore } from '@/stores';
import { useConversationStore } from '@/stores';

import { v4 as uuidv4 } from 'uuid';

import { CHAT_COMPOSER_TEXTAREA_ID } from '@/constants';
import { CohereClient } from '@/cohere-client';

type Props = {
  isLast: boolean;
  is2ndLast: boolean;
  message: ChatMessage;
  isStreamingToolEvents: boolean;
  delay?: boolean;
  className?: string;
  order?: number;
  onCopy?: VoidFunction;
  onRetry?: VoidFunction;
  client?: CohereClient;
  showFeedback?: boolean;
};

/**
 * Renders a single message row from the user or from our models.
 */
const MessageRow = React.memo(forwardRef<HTMLDivElement, Props>(function MessageRowInternal(
  { message, delay = false, isLast, isStreamingToolEvents, is2ndLast, className = '', order, onCopy, onRetry, client, showFeedback },
  ref
) {
  console.log('MESSAGE ROW KEY!!!@**', message.message_id)
  const breakpoint = useBreakpoint();

  const isReadOnly = client === null;
  const [isShowing, setIsShowing] = useState(false);
  const [isLongPressMenuOpen, setIsLongPressMenuOpen] = useState(false);
  const [isStepsExpanded, setIsStepsExpanded] = useState<boolean>(true);
  
  //   // Get the new method
  // const { updateMessageAnnotations } = useConversationStore();
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

    message.text = message.text.replaceAll("\n---", "");

  const getMessageText = () => {
    if (isFulfilledMessage(message) || isUserMessage(message)) {
      // First replace the citations with their decoded text
      const decodedText = message.text?.replace(
        /:cite\[([^\]]*)\](?:{[^}]*})?/g,  // Updated regex pattern
        (match, p1) => {
          try {
            return decodeURIComponent(p1);
          } catch (e) {
            return p1; // Fallback if decoding fails
          }
        }
      );
      console.log('Original:', message.text); // Debug
      console.log('Decoded:', decodedText);   // Debug
      return decodedText || '';
    }
    return '';
  };

  const clean_msg = getMessageText();

  const enableLongPress =
    (isFulfilledMessage(message) || isUserMessage(message)) && breakpoint === Breakpoint.sm;
  const { longPressProps } = useLongPress({
    onLongPress: () => setIsLongPressMenuOpen(false), //dsiable due to annoation interference on mobile
  });

  // Add conversation ID to component state
  // const conversationId = message.conversationId;
  
  // useEffect(() => {
    
  //   // Reset component state when conversation changes
  //   setAnnotationVisible(null);
  //   setAnnotationKey("");
  //   setAnnotDict({});
  //   setAddedAnnots(new Set());
    
  //   if (delay) {
  //     setTimeout(() => setIsShowing(true), 300);
  //   }
  //   setPreprocessedMessage(message.text);
  // }, [conversationId]);
  
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

  // const handleOnMouseEnter = () => {
  //   if (isFulfilledOrTypingMessageWithCitations(message)) {
  //     hoverCitation(message.generationId);
  //   }
  // };

  // const handleOnMouseLeave = () => {
  //   if (isFulfilledOrTypingMessageWithCitations(message)) {
  //     hoverCitation(null);
  //   }
  // };

  //FOr annotation linking
  const handleClick = (id:string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  //

  //

  //

  //

  // Annotations code for error highlighing in prompts!!!

  //

  //

  //

  const sortAnnotDict = (annotDict: AnnotDict): AnnotDict => {
    // Create an array of entries (key-value pairs) from the annotDict
    const entries = Object.entries(annotDict);
  
    // Sort the entries based on the start property
    entries.sort(([, annotationA], [, annotationB]) => annotationA.start - annotationB.start);
  
    // Convert the sorted entries back into an object
    const sortedAnnotDict: AnnotDict = Object.fromEntries(entries);
  
    return sortedAnnotDict;
  };

  interface AnnotDict {
    [key: string]: Annotation;
  }

  interface AnnotRange {
    start: number,
    end: number,
  }

  let annotations: Annotation[] = [];


  //converts a list of annotations into a annotdict
  const convertToAnnotDict = (annotations: Annotation[]): AnnotDict => {
    return annotations.reduce((acc: AnnotDict, annotation: Annotation) => {
      acc[annotation.id||""] = annotation;
      return acc;
    }, {});
  };

  console.log('okay? we we ran this message row component!!!!')
  if(isFulfilledMessage(message)){
    annotations = message.annotations || []
  }
  if(message.type===MessageType.BOT){
    console.log('state',message.state)
    console.log("x")
  }
  console.log('annots')
  console.log(annotations)

  // State to manage the selected text and annotations
  const [annotationVisible, setAnnotationVisible] = useState<boolean | null>(null);
  const [annotationKey, setAnnotationKey] = useState<string>("");  
  //Store our annots here!
  const [annotDict, setAnnotDict] = useState<AnnotDict>(() => {const initialDict = convertToAnnotDict(annotations);
    return initialDict});

  const [addedAnnots, setAddedAnnots] = useState<Set<string>>(new Set()); //Checks for added annots to the prompt.

  const [preprocessedMessage, setPreprocessedMessage] = useState<string>(message.text); //default is normal message.text it is updated with higlights.
  const [annotSortDict, setSortAnnotDict] = useState<AnnotDict>({});
  
  console.log("annotDict after annots", annotDict)
  // Checks if two annotation ranges overlap (this is for the storage issue)

  const annotDictLength = useMemo(() => {
    return Object.keys(annotDict).length;
  }, [annotDict]);

  //automatically updates the sorted annotdict when needed.
  useEffect(() => {
    const sorted = sortAnnotDict(annotDict);
    setSortAnnotDict(sorted);
    setPreprocessedMessage(insertHighlightMarkers(message.text, sorted))
  }, [annotDict]);

  useEffect(() => { 
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && annotationVisible) {
        // Logic to close the annotation box and clean up
        eraseAnnotation();
      }
    };
  
    // Attach the event listener
    window.addEventListener('keydown', handleEscape);
  
    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [annotationKey, annotSortDict]);

  // Add state to store selected text
  const [selectedText, setSelectedText] = useState<string>("");

  // Modify addAnnotation to store the selected text
  const addAnnotation = (s: string, a: string, start: number, end: number, ad: AnnotDict) => {
    if (!isLast) {
      return "";
    }

    // Store the selected text before deselecting
    setSelectedText(s);

    //First check if ranges overlap...
    const newRange: AnnotRange = {start, end};

    if (isNewRangeOverlapping(ad, newRange) || end < start) {
      setAnnotationVisible(false)
      setSelectedText(""); // Clear stored text
      return "";
    }

    console.log("start", start)
    console.log("end", end)
    console.log("Selected text (no adj):", message.text.substring(start, end));

    //Ranges dont overlap, we are good to proceed creating annotation
    // setAnnotationVisible(true)
    const id = uuidv4().toString();

    const annot: Annotation = { htext:s, annotation:a, start, end };
    const newAnnotDict = {...ad}
    newAnnotDict[id] = annot;
    const newDictSorted = sortAnnotDict(newAnnotDict)
    setAnnotDict(newAnnotDict);
    setSortAnnotDict(newDictSorted)

    setPreprocessedMessage(insertHighlightMarkers(message.text, newDictSorted)) //Set the preprocessed message with higlights
    setAnnotationVisible(true)

  console.log("key!!!", newDictSorted)

  return id

    
  };

  // Function to remove annotation
  const removeAnnotation = (key: string, ad: AnnotDict) => {

    //remove visibility
    setAnnotationVisible(false)
    //removal
    setAnnotDict(prevDict => {
      const { [key]: _, ...newDict } = prevDict;
      return newDict;
    });

    const { [key]: _, ...newDictSorted } = ad; //remove the key

    console.log(ad)

    setPreprocessedMessage(insertHighlightMarkers(message.text, newDictSorted)) //Set the preprocessed message with higlights
  console.log("key (removed)!!!", newDictSorted)

    
  };

    ///

    /// For highlight placements!


    ///

    // Function to insert highlight markers into text based on ranges
    const insertHighlightMarkers = (text: string, annots: AnnotDict): string => {
      let highlightedText = '';
      let currentIndex = 0;

      console.log(annots)

      Object.keys(annots).forEach((key) => {
        const annotation = annots[key]
        let start = annotation.start;
        let end = annotation.end;
        const annotText = annotation.annotation;

        //Add the annotation length and fill it to 3 characters with secret parase key.
        const annotationSection = "@&^s$x+" + annotText.length.toString().padStart(3, '0') + annotText;

        highlightedText += text.substring(currentIndex, start);
        highlightedText += '[H]';
        highlightedText += '+x$s^&@' + key;
        highlightedText += annotationSection;

        let highlightedSelection = text.substring(start, end);

        // Rest of your existing replacements
        highlightedSelection = highlightedSelection.replaceAll("```", "[$$$%g%%$$$]");
        highlightedSelection = highlightedSelection.replaceAll("**", "[@@@%ga%^$]");
        highlightedSelection.replaceAll("\n-", "[%s%^$]");
        highlightedSelection = highlightedSelection.replaceAll("*", "[/H]*[H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll("#", "[/H]#[H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll("_", "[/H]_[H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll("[@@@%ga%^$]", "[/H]**[H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll("<", "[/H][H]<[/H][H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll(">", "[/H][H]>[/H][H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll("`", "[/H]`[H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll("[$$$%g%%$$$]", "```");
        highlightedSelection = highlightedSelection.replaceAll(" - ", "[/H] - [H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll("\n\n  - ", "[/H]\n\n  - [H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll("\n  - ", "[/H]\n  - [H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll("\n- ", "[/H]\n- [H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll("\n   - ", "[/H]\n   - [H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll(/\n(\d{1,2})\. /g, '[/H]\n$1. [H]' + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll(/\n\n(\d{1,2})\. /g, '[/H]\n\n$1. [H]' + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll("\n\n", "[/H]\n\n[H]" + annotationSection);
        highlightedSelection = highlightedSelection.replaceAll(
          /:cite\[([^\]]*)\]({[^}]*})/g,  // Capture both citation text and full attributes
          (match, p1, p2) => {
            try {
              const decodedText = decodeURIComponent(p1);
              return `[/H]:cite[UUULLL${decodedText}UUULLL]${p2}[H]${annotationSection}`;
            } catch (e) {
              console.warn('Failed to decode citation text:', p1);
              return `[/H]:cite[${p1}]${p2}[H]${annotationSection}`;
            }
          }
        );
        highlightedText += highlightedSelection;
        highlightedText += '[/H]';
        currentIndex = end;
      });

      highlightedText += text.substring(currentIndex);

      console.log("highlightedText", highlightedText)
      return highlightedText;
    };

    /// for checking if highlight ranges overlap (we dont want that)
    function doRangesOverlap(range1: AnnotRange, range2:AnnotRange) {
      return range1.start < range2.end && range2.start < range1.end;
  }
  
  function isNewRangeOverlapping(ad: AnnotDict, newRange: AnnotRange) {

    for (const annotation of Object.values(ad)) {
        const range: AnnotRange = {start:annotation.start, end:annotation.end}

        if(doRangesOverlap(range, newRange)){
          return true;
        }

      }
      return false; //no overlap was found
  }

    ///

    ///

    ///
  
  //ad: { [key: string]: Annotation }}
  

  const renderAnnotatedText = ({ p_msg }: { p_msg: string }) => {
    const memoizedContent = useMemo(() => {
      if (p_msg === '') {
        p_msg = message.text;
        console.log(message);
      }
      console.log("render row ", p_msg.charAt(0));
      
      return (
        <MessageContent 
          isLast={isLast}
          message={message}
          onRetry={onRetry}
          overrideText={p_msg}
        />
      );
    }, [p_msg, message]); // Add all dependencies here
  
    return memoizedContent;
  };

const normalize = (text : string) => {
  return text.replace(/\n(\d{1,2})\./g, "").replace(/[\s-_#`\n\r\t]/g, "")//.replace(/[\x00-\x1F\x7F\s]/g, '');
  .replace(/\*\*/g, "").replace(/\*/g, "")

  //.replace(/\\n\./g,"")
};

//For normalizing annotations ONLY.
const normalizeAnnotation = (text : string) => {
  return text.replace(/\n(\d{1,2})\./g, "").replace(/[-_`#\n\<\>\r\t]/g, "")//.replace(/[\x00-\x1F\x7F\s]/g, '');
  .replace(/\*/g, "")

  //.replace(/\\n\./g,"")
};


const backNormalize = (text: string): string => {

  // Strings/characters to remove from the end (length 1-4)
  const substrsToRemove = new Set([' ', '-', '\n', '\r', '\t', '`', '**', '*', '_']);

  for (let i = 1; i <= 50; i++) {
    let pair = "\n" + i + '.'; // i + ". "
    substrsToRemove.add(pair)
  }

  // Function to trim substrings from the end
  const trimEnd = (str: string, substrs: Set<string>): string => {
    // Function to check if the end of the string matches any of the substrings to remove
    const endsWithSubstr = (s: string): string | null => {
      for (const substr of substrs) {
        if (s.endsWith(substr)) {
          return substr;
        }
      }
      return null;
    };
// Remove substrings from the end as long as they match substrings in the set
let result = str;
let substr;
while (result.length > 0 && (substr = endsWithSubstr(result))) {
  result = result.slice(0, result.length - substr.length);
}

return result;
};

return trimEnd(text, substrsToRemove);
};

const theMapper = (text:string) => {
  const C_I = [...text].map((c, i) => [Number(i), String(c)]);
  return C_I;
};

const filteredMapping = (text:string) => {
  const mappedCharacters = theMapper(text);
  const normalizedText = normalize(text);

  // Find exact same strings to remove
  const exactStringsToRemove = new Set();

  for (let i = 0; i < mappedCharacters.length; i++) {
    const charIndex = mappedCharacters[i][0];
    const char1 = mappedCharacters[i][1].toString();

    if (normalizedText.indexOf(char1) === -1) {
        exactStringsToRemove.add(char1);
    }
  } 
  console.log(filteredMapping);
  console.log("LOOK HERE ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
  console.log(exactStringsToRemove)
  return mappedCharacters.filter(([index, char]) => !exactStringsToRemove.has(char));
}

const eraseAnnotation = () => {
  setAnnotationVisible(false)
  setAnnotationKey('')
  removeAnnotation(annotationKey, annotSortDict);
}

const filteredMappingV2 = (text:string) => {
    text += "   " //For some reason end values have trouble. No clue why but these are removed because of the break statement.
    const mappedCharacters = theMapper(text);
    const normalizedText = normalize(text);

    let pairsToRemove = ['**']
    let tripletsToRemove = ['']
    let singlesToRemove = ['`', '-', '\n', '\r', ' ', '*', '_', '#']

    for (let i = 1; i <= 9; i++) {
      let pair = "\n" + i + '.'; // i + ". "
      tripletsToRemove.push(pair)
    }

    for (let i = 10; i <= 50; i++) {
      let pair = i + '.';
      tripletsToRemove.push(pair)
    }

    let filteredArray = []

    for (let i = 0; i<=mappedCharacters.length-3; i++){
      let trip = mappedCharacters[i][1].toString() + mappedCharacters[i+1][1] + mappedCharacters[i+2][1]
      let double = mappedCharacters[i][1].toString() + mappedCharacters[i+1][1]
      let single = mappedCharacters[i][1].toString()


      if (i === mappedCharacters.length-3){
        break;
      }
      
      if ((tripletsToRemove.includes(trip))){
        i+=2;
        continue;

      } else if (pairsToRemove.includes(double)){
        i+=1;
        continue;

      } else if (singlesToRemove.includes(single)){
        continue;

      }

      filteredArray.push(mappedCharacters[i])
        
        
        
      
    
  }

    return filteredArray
  }

  //Used for annotation box
  function isAlphaNumericOrSymbol(char:string) {
    if (char.length > 1){
      return false
    }
    const regex = /^[a-zA-Z0-9 &@(#&$]+$/;
    return regex.test(char);
  }

  const submitAnnotation = (target: HTMLInputElement, inputBox: HTMLInputElement, targetElement: HTMLElement|null) => {

      console.log(annotationKey);
      console.log('text', message.text);

      let final_annot = normalizeAnnotation(target.value) //remove unwatned chars.

      if (final_annot.length === 0){
        eraseAnnotation();
        return;
      }

      setAnnotDict(prevDict => ({
        ...prevDict,
        [annotationKey]: { ...prevDict[annotationKey], annotation: final_annot}
      }));

      // Temporary dict for this single render.
      let ad = {...annotDict};
      let annotation_inst = ad[annotationKey]
      ad[annotationKey].annotation = final_annot;
      ad = sortAnnotDict(ad);

      setSortAnnotDict(ad);


      //add annotation to db!

      const annotationRequest = { //make the request here.
        message_id : message.message_id||"",
        htext : annotation_inst.htext,
        annotation : annotation_inst.annotation,
        start : annotation_inst.start,
        end : annotation_inst.end
    
      }
      console.log("MID", message.message_id)
      console.log("CID", message.conversation_id)
      if (message.message_id && client){
        console.log("SENT TO DB")
        client.annotate(annotationKey, annotationRequest) //add it to DB
      }

      

      // inputBox.textContent = "";
      //if (tooltip){tooltip!.textContent = "";}
      targetElement?.removeChild(inputBox)
      let tooltip = document.getElementById('tool' + annotationKey)
      //tooltip?.focus()
      //tooltip!.textContent = "";
      const ml = new Event('mouseleave')
      tooltip?.dispatchEvent(ml)

      //Fixes stupid textContent in tooltip visiblity bug.
      if (tooltip) {
        
        tooltip!.textContent = "";
        console.log("tt tc",tooltip.textContent);
      }
      //setPreprocessedMessage(insertHighlightMarkers(message.text, ad)) //Set the preprocessed message with higlights
      setAnnotationVisible(false);
      //setAnnotationKey('');
      console.log(targetElement?.childNodes)
      console.log('REMOVED', inputBox)
      console.log(targetElement?.childNodes)
    } 
  
      




  //targetElement?.appendChild(inputBox)
  // Optional clean up








  useEffect(() => {
    const targetElement = document.getElementById(annotationKey);

    console.log("VISIBILITY CHANGE @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@", annotationVisible)

    let inputBox = document.createElement('input')
    if (annotationVisible){
      // Add click outside handler
      
      inputBox.type = 'text';
      inputBox.contentEditable = 'true';
      inputBox.style.userSelect = 'text';
      inputBox.style.webkitUserSelect = 'text';
      inputBox.style.touchAction = 'manipulation';
      inputBox.style.cursor = 'text';
      inputBox.style.caretColor = 'auto';
      inputBox.autocomplete = 'off';
      inputBox.autocapitalize = 'off';
      inputBox.spellcheck = false;
      
      // Handle touch events for mobile
      inputBox.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        inputBox.blur();
        inputBox.focus();
      });
      
      inputBox.addEventListener('focus', () => {
        // Ensure keyboard shows up
        setTimeout(() => {
          inputBox.click();
        }, 100);
      });
      
      // Applying inline styles
      inputBox.style.fontSize = "14px";
      inputBox.style.height = "2rem";
      inputBox.style.width = "max-content";
      inputBox.style.padding = "0.5rem";
      inputBox.style.lineHeight = "150%";
      inputBox.style.fontFamily = "Arial, sans-serif";
      inputBox.style.minHeight = "1.6rem";
      inputBox.style.maxHeight = "3.2rem";
      inputBox.style.textOverflow = "ellipsis";
      inputBox.style.position = "absolute";
      inputBox.style.marginRight= '5px';
      inputBox.style.top = '50%'
      inputBox.style.transform = 'translateY(-50%)'
      inputBox.style.zIndex = '2';

      // Applying class names
      inputBox.className = [
        'w-auto',
        "self-center",
        "rounded",
        "border",
        "bg-danger-50",
        "text-lg",
        "w-full",
        "border-secondary-400",
        "transition ease-in-out",
        "focus:border-secondary-700",
        "focus:outline-none",
        "placeholder-base",
        "font-family-Arial"
      ].join(" ")

      inputBox.ariaHidden = 'true'
      inputBox.placeholder = 'Add annotation . . .';
      inputBox.maxLength = 100;

      // FOR MOBILE DONE SUBMISSION
      inputBox.addEventListener('blur', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.value) { // Only submit if there's content
          submitAnnotation(target, inputBox, targetElement)
        } 
      });
      
      // Handle key events
      inputBox.onkeydown = (e) => {
        const target = e.target as HTMLInputElement;
        
        if (e.key === 'Backspace' && target.value === '') {
          eraseAnnotation();
          return;
        }

        if (e.key === 'Enter' || e.key === 'Done') {
          submitAnnotation(target, inputBox, targetElement);
        } else {
          let tooltip = document.getElementById('tool' + annotationKey);
          
          if (e.key === ' ' || e.keyCode === 32) {
            // Prevent default for space
            e.preventDefault();
            
            // Add space to input value
            const currentValue = inputBox.value;
            const cursorPos = inputBox.selectionStart || currentValue.length;
            inputBox.value = currentValue.substring(0, cursorPos) + ' ' + currentValue.substring(cursorPos);
            
            // Update tooltip
            if (tooltip) {
              tooltip.textContent = inputBox.value;
            }
          } else {
            // Normal key behavior
            const n_key = isAlphaNumericOrSymbol(e.key) ? e.key : "";
            if (tooltip) {
              tooltip.textContent = target.value + n_key;
            }
          }
        }
      };

      console.log("ADDED", inputBox);
      targetElement?.appendChild(inputBox);
      inputBox.focus();

      // Optional clean up
      return () => {
        console.log("RETURN REMOVAL")
        if (targetElement && targetElement.contains(inputBox)) {
          targetElement.removeChild(inputBox);
        }
        
        let tooltip = document.getElementById('tool' + annotationKey);
        if (tooltip) {
          tooltip.textContent = "";
        }
      };
    }
  }, [annotationVisible, annotationKey]);


// // Usage
// const originalText = "Your original text here";
// const { normalizedText, mappings } = normalizeShellWithMapping(originalText);
// const normalizedIndices = [5, 10]; // Example indices in normalized text
// const originalIndices = mapIndicesBack(normalizedIndices, mappings);

// console.log(`Original indices for normalized indices ${normalizedIndices} are ${originalIndices}`);

const calculateContainerEnder= (sc: Node): string => {
  let currentNode: Node | null = sc.previousSibling; //We want everything before starter container/
  let text = "";

  while (true){
    if (currentNode === null){
      break;
    }
    console.log(currentNode.textContent)
    text = currentNode.textContent + text; //prepend the text
    currentNode = currentNode.previousSibling;
  }

  return normalize(text)
}

const calculateContainerStarter = (sc: Node): string => {
  let currentNode: Node | null = sc.previousSibling; //We want everything before starter container/
  let text = "";

  while (true){
    if (currentNode === null){
      break;
    }
    console.log('NODE TEXT', currentNode.textContent)
    text = currentNode.textContent + text; //prepend the text
    currentNode = currentNode.previousSibling;
  }

  return normalize(text)
}

const calculateStartOffset = (sc:Node, startOffset:number): number => {
  let text = sc.textContent||"";
  text = text.substring(0, startOffset) //only account for text before the selected text
  let n_text = normalize(text);
  console.log("text")
  console.log(text)
  console.log(n_text)
  console.log(startOffset)

  return startOffset - (text.length - n_text.length)
}

const calculateStartAndEnd = (sc: Node, startOffset:number, st:string, n_msg:string, ec: Node): {start:number, end:number} => {
  let text = calculateContainerStarter(sc);
  let trueOffset = calculateStartOffset(sc, startOffset)
  let p_text = normalize(sc.parentElement?.textContent||"");
  st = normalize(st);

  console.log('p_tex_org', p_text)

  const types = ['CODE', 'EM', 'STRONG']

  //For tricky starting points as code.
  if (types.includes(sc.parentElement?.nodeName||"") && ec.parentElement?.nodeName === 'P'){ 
    console.log('override with ender')
    p_text = calculateContainerEnder(ec)+normalize(ec.textContent||"")
    trueOffset += p_text.lastIndexOf(normalize(sc.textContent||""))
  }sc.parentElement?.nodeName === 'CODE'

  console.log("p_text", p_text)
  console.log("s_text", text)
  console.log("n_msg", n_msg)
  console.log('st', st)
  console.log('et', calculateContainerEnder(ec))
  console.log('pEC', ec.textContent)
  console.log('comb', calculateContainerEnder(ec)+normalize(ec.textContent||""))
  console.log(sc.parentElement?.nodeName)
  console.log(n_msg.length)

  let p_idx = n_msg.indexOf(p_text); //n_msg.indexOf(ca_text)
  let c_idx = p_text.indexOf(text) //ca_text.indexOf(text)
  console.log(p_idx)
  console.log(c_idx)

  //if selected text is long enough, have it override.
  console.log("ST LENGTH", st.length)
  if (st.length >= 60){
    console.log('st override')
    p_idx = n_msg.indexOf(st)
    console.log("st p_idx", p_idx)
    c_idx = 0;
    trueOffset = 0;
    text = ""
  }


  return {start: (p_idx + c_idx + text.length + trueOffset), end: (p_idx + c_idx + text.length + trueOffset + st.length)}
}

function showHiddenCharacters(str:string) {
  return Array.from(str).map(c => {
    if (c === " ") return "[space]";
    if (c === "\t") return "[tab]";
    if (c === "\n") return "[newline]";
    if (c === "\r") return "[carriage return]";
    return c;
  }).join("");
}

//Handles the deletion of an annotation after a click
const handleAnnotationDelete = (key: string) => {
  // Only allow deletion if this is the most recent message
  if (!isLast) {
    return;
  }
  
  setAnnotationVisible(false);
  removeAnnotation(key, annotSortDict);
  handleRemovePromptAnnotation(key) //remove it if added to prompt
  if (client) {
    client.deleteAnnotation(key) //remove it from db
  }
}

//Handles the addition and removal of annotations uuid from 'add to prompt' list
const handleAddPromptAnnotation = (key: string) => {
  if(annotationVisible === true){ //you cant add unfinished annotations.
    return
  }
  setAddedAnnots((prevAnnots) => new Set(prevAnnots).add(key))
}

//Handles the addition and removal of annotations uuid from 'add to prompt' list
const handleRemovePromptAnnotation = (key: string) => {
  setAddedAnnots((prevAnnots) => {
    const newAnnots = new Set(prevAnnots);
    if(newAnnots.has(key)){
      newAnnots.delete(key);
    }
    return newAnnots;
  });
}

///



/// ANNOTATION prompt assembly code here




///

// | Header 1 | Header 2 |
// |----------|----------|
// | Cell 1   | Cell 2   |
// | Cell 3   | Cell 4   |

function constructHeaders(): string {
  let l1 = '| Annotated Text | Row, Column | Annotation |\n'
  let l2 = '|----------------|-----|------------|\n'
  return l1 + l2
}

//Builds the prompt for annotations to be passed to the model
function constructAnnotationPromptCore(annots: AnnotDict, keys: Set<string>): string {
  let core = ""

  //Creates a single line for the prompt
  function createAnnotationLine(a: Annotation, index: number): string {
    // Get text up to this annotation
    const textUpToAnnotation = clean_msg.substring(0, a.start);
    
    // Split into lines to get row number and last line content
    const lines = textUpToAnnotation.split('\n');
    const row = lines.length;
    
    // Get the content of the last line before annotation
    const lastLine = lines[lines.length - 1];
    // Column is the length of the last line + 1 (1-based indexing)
    const column = lastLine.length + 1;

    console.log('Annotation:', {
      text: a.htext,
      start: a.start,
      row: row,
      column: column,
      lastLine: lastLine
    });

    let line = "| " + 
               (a.htext).trim().replaceAll('\n',"").replaceAll('\t',"").replaceAll(/\s{2,}/g, "").replaceAll('\r',"") + 
               " | " + row + ", " + column + 
               " | *" + (a.annotation).trim() + "* |\n"

    return line
  }

  let index = 1;
  Object.entries(annots).forEach(([key, annotation]) => {
    if(keys.has(key)){  
      core += createAnnotationLine(annotation, index);
      index++;
    }
  })

  return core
}

///THIS HANDLES THE CONSTRUCTION OF ANNOTATION PROMPTS
useEffect(() => {

  let parent = document.getElementById(CHAT_COMPOSER_TEXTAREA_ID) as HTMLTextAreaElement;
  if(parent){
    
    console.log("is 2nd or not?", is2ndLast)
    if(is2ndLast){
      console.log("is2nd")
      let start = "Can you address these annotations? Answer by modifying your previous output. I have provided annotations for my prompt first, then your output in the order they appeared in our conversation.\n\n## Prompt Annotations:\n" + constructHeaders()
      let sCore = constructAnnotationPromptCore(annotSortDict, addedAnnots)
      let h2 = parent.getAttribute('data-model')

      //If no user prompts
      if(sCore === ""){
        start = ""
        
      }

      //if no model prompts
      if(h2 === "" && sCore !== ""){
        start = "Can you address these annotations? Answer by modifying your previous output. I have provided annotations regarding your output in the order they appeared in the output with the position row, column, and annotation.\n\n## Prompt Annotations:\n" + constructHeaders()
        sCore += '\n'
      }
      let h1 = start + sCore

      parent.setAttribute('data-user', h1)

      let new_val = h1 + h2
      parent.value = new_val === "" ? "" : new_val


    } else if(isLast){
      let start = '\n\n## Output Annotations:\n'
      let eCore = constructAnnotationPromptCore(annotSortDict, addedAnnots)
      let h1 = parent.getAttribute('data-user')

      //If no output annotations
      if(eCore === ""){
        start = ""
      }

      if(h1 === "" && eCore !== ""){
        start = "Can you address these annotations? Answer by modifying your previous output. I have provided annotations regarding your output in the order they appeared in the output with the position row, column, and annotation.\n\n## Prompt Annotations:\n" + constructHeaders()
      }

      let h2 = start + eCore
      console.log('realh2',h2)
      console.log('start', start)
      parent.setAttribute('data-model', h2)

      //Assign the prompt
      let new_val = h1 + h2
      parent.value = new_val === "" ? "" : new_val
    }

    parent.focus();
    console.log('PARENT VALUE', parent.value)
    //parent.blur();

    //this will force the output box to readjust.
      parent.style.height = 'auto';
      parent.style.height = `${parent.scrollHeight}px`;

      // if the content overflows the max height, show the scrollbar
      if (parent.scrollHeight > parent.clientHeight + 2) {
        parent.style.overflowY = 'scroll';
      } else {
        parent.style.overflowY = 'hidden';
      }
    
  }

}, [addedAnnots]);

//checks if an annot is in the prompt.
function isAnnotAdded(key: string, ad: Set<string>): boolean {
  if(ad.has(key)){
    return true
  }
  return false
}

///Custom copier because the cohere  1 is too annoying to use wtihout breaking other stuff

const handleMessageCopy = async (textToCopy?: string) => {
  let textToActuallyCopy;
  
  if (textToCopy) {
    textToActuallyCopy = textToCopy;
  } else {
    textToActuallyCopy = getMessageText();
  }

  console.log('textToActuallyCopy', textToActuallyCopy)
  
  
  try {
    // Always use the passed text if it exists
    if (window?.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(String(textToActuallyCopy));
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = String(textToActuallyCopy);
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

  } catch (e) {
    console.error('Failed to copy text:', e);
  }
};



// Add this interface to track citation locations
interface CitationLocation {
  start: number;
  end: number;
  text: string;
  fullMatch: string;
}

interface TextPosition {
  cleanIndex: number;
  rawIndex: number;
}

const createCleanToRawMapping = (text: string) => {
  const citationRegex = /:cite\[([^\]]*)\](?:{[^}]*})?/g;
  let cleanToRaw: {[cleanPos: number]: number} = {};
  let cleanPos = 0;
  let lastEnd = 0;
  
  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    // Add mappings for text before citation
    for (let i = lastEnd; i < match.index; i++) {
      cleanToRaw[cleanPos] = i;
      cleanPos++;
    }
    
    // Add mappings for citation text
    const citationText = decodeURIComponent(match[1]);
    for (let i = 0; i < citationText.length; i++) {
      cleanToRaw[cleanPos] = match.index + ':cite['.length + i;
      cleanPos++;
    }
    
    lastEnd = match.index + match[0].length;
  }
  
  // Add mappings for remaining text
  for (let i = lastEnd; i < text.length; i++) {
    cleanToRaw[cleanPos] = i;
    cleanPos++;
  }
  
  console.log("Clean to raw mapping:", cleanToRaw);
  return cleanToRaw;
};

const reconstructTextFromCleanText = (cleanText: string, text: string) => {
  const cleanToRaw = createCleanToRawMapping(text);
  let reconstructed = new Array(text.length).fill('X'); // Initialize with placeholder chars
  
  // Place each clean text character in its raw position
  for (let cleanPos = 0; cleanPos < cleanText.length; cleanPos++) {
    const rawPos = cleanToRaw[cleanPos];
    if (rawPos !== undefined) {
      reconstructed[rawPos] = cleanText[cleanPos];
    }
  }
  
  console.log("Original length:", text.length);
  console.log("Reconstructed length:", reconstructed.length);
  console.log("Clean text:", cleanText);
  console.log("Reconstructed:", reconstructed.join(''));
  
  return reconstructed.join('');
};

const processCitationsAndText = (text: string): { 
  cleanText: string, 
  citations: CitationLocation[],
  offsetMap: number[],
  positionMap: TextPosition[]
} => {
  const citations: CitationLocation[] = [];
  const citationRegex = /:cite\[([^\]]*)\](?:{[^}]*})?/g;
  let cleanText = text;
  const offsetMap: number[] = new Array(text.length).fill(0);
  const positionMap: TextPosition[] = [];
  
  // First pass: collect citations
  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const citation = {
      start: match.index,
      end: match.index + match[0].length,
      text: decodeURIComponent(match[1]),
      fullMatch: match[0]
    };
    citations.push(citation);
    
    // Calculate offset based on citation markup vs actual text
    const markupLength = ':cite['.length + ']'.length; // Basic citation markup
    const extraMarkup = citation.fullMatch.length - (citation.text.length + markupLength);
    const diff = markupLength + extraMarkup; // Total markup length to offset
    
    // Update offset map from citation start to next citation or end
    const nextCitation = text.indexOf(':cite[', citation.end);
    const endPoint = nextCitation > -1 ? nextCitation : text.length;
    
    for (let i = citation.start + citation.text.length; i < endPoint; i++) {
      offsetMap[i] += diff;
    }
  }

  // Second pass: build position mapping
  let cleanIndex = 0;
  let rawIndex = 0;
  
  while (rawIndex < text.length) {
    const citation = citations.find(c => c.start === rawIndex);
    if (citation) {
      // Map the citation text positions directly
      for (let i = 0; i < citation.text.length; i++) {
        positionMap.push({ 
          cleanIndex: cleanIndex + i, 
          rawIndex: rawIndex + ':cite['.length + i 
        });
      }
      cleanIndex += citation.text.length;
      rawIndex += citation.fullMatch.length;
    } else {
      positionMap.push({ cleanIndex, rawIndex });
      cleanIndex++;
      rawIndex++;
    }
  }
  
  return { cleanText, citations, offsetMap, positionMap };
};
  

  
const offsetMap = processCitationsAndText(message.text).offsetMap;
reconstructTextFromCleanText(clean_msg, message.text)
const cleanToRaw = createCleanToRawMapping(message.text);

const findExactIndices = (messageText:string, startOffset:number, endOffset:number, st:string, range: Range) => {

  const sc = range.startContainer;
  const ec = range.endContainer;

  
  console.log(showHiddenCharacters(clean_msg))
  const filter = filteredMappingV2(messageText)
  const filteredCharacters = filter.map(item => item[1]).join('');
  console.log("FILTERED CHARSSSSS")
  console.log(filteredCharacters)
  // Normalize the original message text
  const normalizedMessage = normalize(messageText); // use the cleaned rtext
  let normalizedSelectedText = normalize(st)

  console.log("7777777777777777777777777777777777777777778787878787878787")
  const d = calculateStartAndEnd(sc, startOffset, st, filteredCharacters, ec) //replace nrom message  
  console.log(normalizedMessage)
  console.log(normalizedMessage.length)
  console.log(filteredCharacters)
  console.log(filteredCharacters.length)
  console.log(normalizedMessage.substring(d.start, d.end))
  console.log(normalizedSelectedText)
  console.log(d.start)
  console.log(d.end)
  console.log("STARTER is back!", calculateContainerStarter(sc)+sc.textContent?.substring(0, startOffset))
  console.log("ENDER is back!",ec.textContent?.substring(0, startOffset)+calculateContainerEnder(ec))
  console.log(ec.parentElement?.textContent)
  console.log("98798136781263876128361827638712536751278361273691273987128937891273987777777777777777777777777777777777777777778787878787878787")

  const fil = filteredMappingV2(clean_msg)
  console.log(fil)
  let f_start = 0;
  let f_end = 0;

  ///

  //Weird undefined bug for ending and starting character, handled here.

  ///

  let couldntFind = false;
  if (d.start === -1 || d.end === -1){
    couldntFind = true;
  }

  if (fil[d.start] !== undefined){
    f_start = Number(fil[d.start][0])
  } else {f_start=0}
  if (fil[d.end] !== undefined){
    f_end=Number(fil[d.end][0])
  } else {f_end=messageText.length;}
  return { start: f_start, end: f_end, couldntFind: couldntFind};
};

const localRef = useRef<HTMLDivElement|null>(null);

// Combine forwarded ref with localRef
useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  //Complicated function for determining annotaiton highlights by the user.
  const handleMouseUp = (e : React.MouseEvent | React.TouchEvent) => {
    if (e.type === 'touchend') {
      e.preventDefault();
    }
    const selection = window.getSelection();
    if (!(selection && selection.toString() && !annotationVisible && selection.anchorNode)) { 
      return;
    }

    if (selection.toString() === "\n" || selection.toString() === " "){
      return;
    }

    //No annoations on annotation requests! (breaks the model every time)
    if(message.type === MessageType.USER){
      if(message.is_annotation_response === true){
        return;
      }
    }

    if (!isLast){
      return;
    }

    //Cannot annotate while streaming or if read only
    if(!isFulfilledMessage(message) || isReadOnly){
      return;
    }


    const selectedText = selection.toString();
    const lenst = selectedText.length;
    const range = selection.getRangeAt(0);
    
    //This highlight spans multiple rows.
    if (range.commonAncestorContainer.parentElement?.id === 'message-list'){
      return;
    }
    
  
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    if (startContainer.parentElement?.id === "annots" || endContainer.parentElement?.id === "annots"){
      console.log("annotaitons")
      return;
    }
  
    const startOffset = range.startOffset;
    
    const endOffset = range.endOffset;
    //console.log("Start Container: ", startContainer, startOffset);
    //console.log("End Container: ", endContainer, endOffset);
  
    // Helper function to retrieve the text content of an entire node and its children
    const getTextContent = (node: Node): string => 
      true === true ? 
      (node.textContent ?? "") : 
      Array.from(node.childNodes).map(getTextContent).join("");
      
    // Retrieve the full text content of the start and end containers
    const startContainerText = getTextContent(startContainer);
    const endContainerText = getTextContent(endContainer);
  
    console.log("Start Container Text: ", startContainerText);
    console.log("End Container Text: ", endContainerText);

    const u = findExactIndices(clean_msg, startOffset, endOffset, selectedText, range) // use cleaned message
    console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
    console.log(clean_msg.substring(Number(u.start), Number(u.end)))
    console.log(u.start)
    console.log(u.end)
    console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")

    let start = Number(u.start)
    let end = Number(u.end)

    console.log(selectedText.charAt(lenst))
    console.log(backNormalize(clean_msg.substring(start,end)))

    const newFinalMessage = backNormalize(clean_msg.substring(start,end)) //Remove any final junk with backNroamlize.
    const fLen = newFinalMessage.length;
    end = start + fLen;

    if (u.couldntFind){
      return
    }


  


    //console.log("SUBSTRING", message.text.substring(startIdxInMessage, endIdxInMessage))
    //user messages are weird so we handle them with special care (copied line breaks cause issues)
    if (clean_msg.indexOf(startContainerText) === -1 || clean_msg.indexOf(endContainerText) === -1){ //User selected from multiple chat rows.
      console.log("multiple!!!!")
      //return;
    }

    const startIdxInMessage = clean_msg.indexOf(startContainerText) + startOffset;
    const endIdxInMessage = clean_msg.indexOf(endContainerText) + endOffset;

    console.log("CLEAN MSG START", clean_msg.substring(start, end))
    console.log("CLEAN MSG START IDX", clean_msg.substring(startIdxInMessage, endIdxInMessage))
    console.log("SELECTED TEXT", selectedText)

    let st = selectedText;

    if (clean_msg.substring(start, end).includes('```')||clean_msg.substring(startIdxInMessage, endIdxInMessage).includes('```') && (range?.commonAncestorContainer?.textContent||"").includes('```') && clean_msg.indexOf(endContainerText) !== end){ //The user is trying to make a stupid highlight.
      console.log("code detection")
      if (!clean_msg.substring(end-1, end).includes("#")){
        return;
      }
      console.log("st", st)
      st = st.substring(0, st.length-6)
      end = end - 9
      console.log("st", st)
      console.log("end", end)
    }

    console.log("st", selectedText)

    //cannot annotate a space 
    if(selectedText === ""){
      return;
    }


    // start += offsetMap[start]
    // end += offsetMap[end]
    const {start: newStart, end: newEnd} = adjustCitationBoundaries(start, end);
    console.log("newStart", newStart)
    console.log("newEnd", newEnd)
    console.log("NEW MSG", message.text.substring(newStart, newEnd))
    let end_inc =  newEnd - end;
    let start_inc = newStart - start;
    let offset = 0;

    if (start_inc !== 0) { //starts in a citation
      start += start_inc;
      offset = 6;
      // st = message.text.substring(start + start_inc, end + end_inc);
    }

    if (end_inc !== 0) { //ends in a citation
      end += end_inc;
    }
    st = clean_msg.substring(start, end);
    console.log("st", st)
    // console.log("other msgs", message.text.substring(cleanToRaw[start + start_inc] - 6, cleanToRaw[end + end_inc]))
    const rawStart = cleanToRaw[start];
    const rawEnd = cleanToRaw[end];
    if (message.text.substring(rawStart - 6, rawStart) === ':cite['){
      offset=6
    }
    start = rawStart - offset; //for citation prefix
    end = rawEnd;
    console.log("Final positions:");
    console.log("Raw start/end:", rawStart, rawEnd);
    console.log("Clean text selection:", clean_msg.substring(start, end));
    console.log("Raw text selection:", message.text.substring(rawStart, rawEnd));

    if (rawEnd === undefined){
      end = message.text.length;
    }
  


    console.log("Before adjustment - selected:", clean_msg.substring(start, end));
    console.log("After adjustment - selected:", message.text.substring(start, end));
  
    const ida = addAnnotation(st, "Add Annotation...", start, end, annotDict);
    // //setAnnotationVisible(true);
    setAnnotationKey(ida);
    


    

  };

  const adjustCitationBoundaries = (start: number, end: number) => {
    if (!isFulfilledMessage(message)) return { start, end };
    if (!message.citations) return { start, end };
    
    message.citations.forEach(citation => {
      // If selection overlaps with citation, adjust boundaries
      if ((start > citation.start && start < citation.end) || 
          (end > citation.start && end < citation.end)) {
        start = Math.min(start, citation.start);
        end = Math.max(end, citation.end);
      }
    });
    
    return { start, end };
  };

  const handleAddAllAnnotations = () => {
    if (isFulfilledMessage(message)) {
      // Convert all annotations to a prompt format
      // const annotDict = convertToAnnotDict(message.annotations || []);
      const allAnnotKeys = new Set(Object.keys(annotDict)); // Create set of all annotation keys
      setAddedAnnots(allAnnotKeys); // Set all annotation keys as added
      
      let parent = document.getElementById(CHAT_COMPOSER_TEXTAREA_ID) as HTMLTextAreaElement;
      if (parent) {
        if (is2ndLast) {
          let start = "Can you address these annotations? Answer by modifying your previous output. I have provided annotations for my prompt first, then your output in the order they appeared in our conversation.\n\n## Prompt Annotations:\n" + constructHeaders();
          let sCore = constructAnnotationPromptCore(annotDict, allAnnotKeys);
          let h2 = parent.getAttribute('data-model') || '';

          // If no user prompts
          if (sCore === "") {
            start = "";
          }

          // if no model prompts
          if (h2 === "" && sCore !== "") {
            start = "Can you address these annotations? Answer by modifying your previous output. I have provided annotations regarding my prompt in the order they appeared in the prompt.\n\n## Prompt Annotations:\n" + constructHeaders();
            sCore += '\n';
          }
          let h1 = start + sCore;

          parent.setAttribute('data-user', h1);
          parent.value = h1 + h2;
        } else if (isLast) {
          let start = '\n\n## Output Annotations:\n';
          let eCore = constructAnnotationPromptCore(annotDict, allAnnotKeys);
          let h1 = parent.getAttribute('data-user') || '';

          // If no output annotations
          if (eCore === "") {
            start = "";
          }

          if (h1 === "" && eCore !== "") {
            start = "Can you address these annotations? Answer by modifying your previous output. I have provided annotations for your output in the order they appeared in your message.\n\n## Output Annotations:\n" + constructHeaders();
          }

          let h2 = start + eCore;
          parent.setAttribute('data-model', h2);
          parent.value = h1 + h2;
        }

        // Focus and adjust height
        parent.focus();
        if (isMobile()) {
          parent.blur();
        }
        parent.style.height = 'auto';
        parent.style.height = `${parent.scrollHeight}px`;
        if (parent.scrollHeight > parent.clientHeight + 2) {
          parent.style.overflowY = 'scroll';
        } else {
          parent.style.overflowY = 'hidden';
        }

        // Automatically send the prompt
        // const enterEvent = new KeyboardEvent('keydown', {
        //   key: 'Enter',
        //   code: 'Enter',
        //   keyCode: 13,
        //   which: 13,
        //   bubbles: true,
        //   cancelable: true
        // });
        // parent.dispatchEvent(enterEvent);
      }
    }
  };

  // Add this function near your other handlers
  const handleAnnotationCopy = async (text: string) => {
    console.log('Attempting to copy annotation:', text);
    
    try {
      // Try modern clipboard API first
      if (window?.navigator?.clipboard) {
        await window.navigator.clipboard.writeText(text);
      } else {
        // Fallback to textarea method
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      console.log('Successfully copied annotation');
    } catch (e) {
      console.error('Failed to copy annotation:', e);
    }
  };

  // Add event listener for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        if (annotationVisible && selectedText) {
          // Copy the stored selected text
          handleMessageCopy(selectedText);
          
          // Clear annotation UI
          eraseAnnotation();
          setSelectedText("");
          
          // Prevent default copy behavior
          event.preventDefault();
        }
      }
    };

    // Add and remove event listener
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [annotationVisible, selectedText]);

  // Add handleClickOutside at component level
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const inputElement = document.querySelector('input[type="text"]'); // Find the annotation input box
    
    if (
      annotationVisible && 
      target !== inputElement && 
      !target.id?.startsWith('tool')
    ) {
      setAnnotationVisible(false);
      let tooltip = document.getElementById('tool' + annotationKey);
      if (tooltip) {
        tooltip.textContent = "";
      }
      window.getSelection()?.removeAllRanges();
    }
  };

  useEffect(() => {
    if (annotationVisible) {
      const handleClickOutside = (e: Event) => {
        const target = e.target as HTMLElement;
        const annotBox = document.getElementById(annotationKey);
        const tooltip = document.getElementById('tool' + annotationKey);
        
        // If click is outside annotation box and its tooltip
        if (!annotBox?.contains(target) && !tooltip?.contains(target)) {
          eraseAnnotation();
          window.getSelection()?.removeAllRanges();
        } else{
          e.preventDefault();
          e.stopPropagation();
          setTimeout(() => { // Delay focus to ensure it happens after touch events
            annotBox?.focus();
            target.focus();
          }, 0);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchend', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchend', handleClickOutside);
      };
    }
  }, [annotationVisible, annotationKey]);

  // Add state at the top with other states
  const [debugStatus, setDebugStatus] = useState<string>('');

  // Add the touch handlers
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    const text = selection?.toString();
    
    if (text) {
      setDebugStatus(`Selected: "${text.substring(0, 20)}..."`);
    } else {
      setDebugStatus('No text selected');
    }

    // Continue with existing selection logic
    if (!(selection && selection.toString() && !annotationVisible && selection.anchorNode)) { 
      return;
    }
    // ... rest of your existing handleMouseUp logic ...
  };

  console.log("message.feedback &&&&&&&&&&&", message.feedback);
  console.log("message.SHOW FEED &&&&&&&&&&&", showFeedback);

  // Add a helper function to detect mobile
  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

    // Finds and removes any annotations that overlap with the given range
    const removeOverlappingAnnotations = (ad: AnnotDict) => {
      // Only allow deletion if this is the most recent message
      if (!isLast) {
        return;
      }
  
      const overlappingPairs: [string, string][] = [];
  
      // Find all pairs of overlapping annotations within the dictionary
      const entries = Object.entries(ad);
      
      // Compare each annotation with every other annotation
      for (let i = 0; i < entries.length; i++) {
        const [keyA, annotA] = entries[i];
        const rangeA = {
          start: annotA.start,
          end: annotA.end
        };
        
        for (let j = i + 1; j < entries.length; j++) {
          const [keyB, annotB] = entries[j];
          const rangeB = {
            start: annotB.start,
            end: annotB.end
          };
          
          if (doRangesOverlap(rangeA, rangeB)) {
            overlappingPairs.push([keyA, keyB]);
          }
        }
      }
  
      // Remove the newer annotation from each overlapping pair
      overlappingPairs.forEach(([keyA, keyB]) => {
        // Determine which annotation was added more recently
        // (You might need a different logic here depending on how you track creation time)
        const annotToRemove = keyB; // Assuming keyB is the newer one
        handleAnnotationDelete(annotToRemove);
      });
    };
  
    removeOverlappingAnnotations(annotDict) //manual fix for conversation store bug.

  // Add these state variables near your other state declarations
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Function to add debug information
  const addDebugInfo = (info: string) => {
    setDebugInfo(prev => {
      const newInfo = [info, ...prev];
      return newInfo.slice(0, 5); // Keep only the 5 most recent messages
    });
  };

  // Add state for feedback submission
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);

  // Handle feedback submission
  const handleFeedbackSubmit = async (value: string) => {
    if (!message.message_id || !client) {
      console.error("Cannot submit feedback: message_id or client is missing");
      return;
    }
    
    try {
      setIsFeedbackSubmitting(true);
      
      // Use the client method we just added
      await client.submitFeedback(message.message_id, value);
      
      // Update the local state
      message.feedback = value;
      setIsFeedbackSubmitting(false);
      
      // Force re-render if needed
      forceUpdate(); // Add this function
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setIsFeedbackSubmitting(false);
    }
  };

  // Add a force update function using useState
  const [, forceRender] = useState({});
  const forceUpdate = () => forceRender({});

  // Add these console logs near the top of your component
  console.log("MessageRow for:", message.message_id);
  console.log("showFeedback:", showFeedback);
  console.log("message.feedback:", message.feedback);
  console.log("Should show feedback UI:", showFeedback && message.feedback === undefined);

  return (
    <div
      id={
        isFulfilledOrTypingMessage(message) && message.generationId
          ? getMessageRowId(message.generationId)
          : undefined
      }
      className={cn(ReservedClasses.MESSAGE, 'flex', className)}
      onMouseUp={handleMouseUp}
      // onTouchStart={() => setDebugStatus('Touch started')}
      onTouchEnd={handleMouseUp}
      style={{
        WebkitUserSelect: 'text',
        userSelect: 'text',
        WebkitTouchCallout: 'none',
        touchAction: 'manipulation',
      }}
    >
      <LongPressMenu
        isOpen={isLongPressMenuOpen}
        close={() => setIsLongPressMenuOpen(false)}
        className="md:hidden"
      >
        <div className={cn('flex flex-col divide-y', 'divide-marble-950')}>
          <div className="flex flex-col gap-y-4 pt-4">
            <CopyToClipboardButton
              value={getMessageText()}
              label="Copy text"
              kind="secondary"
              iconAtStart
              onClick={(e) => {
                e.preventDefault();
                handleMessageCopy();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleMessageCopy();
                // setDebugStatus('Copied!!!');
              }}
            />
            {hasSteps && (
              <Button
                label={`${isStepsExpanded ? 'Hide' : 'Show'} steps`}
                startIcon={<Icon name="list" />}
                kind="secondary"
                size="md"
                aria-label={`${isStepsExpanded ? 'Hide' : 'Show'} steps`}
                animate={true}
                onClick={() => setIsStepsExpanded((prevIsExpanded) => !prevIsExpanded)}
              />
            )}
          </div>
        </div>
      </LongPressMenu>
      <div
        id='msgrow' className={cn(
          'group flex h-fit w-full flex-col gap-2 rounded-md p-2 text-left md:flex-row',
          'transition-colors ease-in-out',
          'hover:bg-secondary-100',
        )}
        {...(enableLongPress && longPressProps)}
      >
        <div className="flex w-full gap-x-2">
          <Avatar message={message} />
          <div className="flex w-full min-w-0 max-w-message flex-1 gap-x-3 md:flex-row">
            <div className="w-full">
              <div>{renderAnnotatedText({p_msg:preprocessedMessage})}</div>
              
              {annotDictLength > 0 && (
                <div className="flex justify-between items-start">
                  <div className="w-full">
                    <h1 id='annots' className={cn('text-title','font-bold','font-family-CohereIconDefault')} 
                        style={{ paddingTop: '0.5rem', paddingBottom: '0.3rem' }}>
                      Annotations
                    </h1>
                    <hr id='annots' style={{ paddingTop: '0.5rem', paddingBottom: '0.1rem', border: 'none', borderTop: '2px solid black' }}></hr>
                    
                    <div className="flex justify-between">
                      <div className="flex-grow">
                        {Object.entries(annotSortDict).map(([key, annotation], index) => (
                          <div id='annots' key={index} className={cn()}>
                            <span id='annots' className='clickable cursor-pointer bg-yellow-100 hover:underline focus:underline' style={{                               
                              fontSize: '10.5px', // Adjust the font size as needed
                              height: '1rem', // Adjust the height as needed
                              width: '20px', // Adjust the width as needed
                              padding: '0.3rem', // Adjust the padding as needed
                              lineHeight: '1.5', // Adjust the line height as needed
                              fontFamily: 'Arial, sans-serif', // Adjust the font family as needed
                              fontWeight: 'bold'
                            }}
                            onClick={() => handleClick(key)}
                            >{index + 1}{'. '}{annotation.htext}
                            </span>

                            <span id='annots' className='bg-secondary-900' style={{                               
                              fontSize: '10.5px', // Adjust the font size as needed
                              height: '1rem', // Adjust the height as needed
                              width: '200px', // Adjust the width as needed
                              paddingTop: '0.3rem', // Adjust the padding as needed
                              paddingBottom: '0.3rem',
                              paddingLeft: '-0.01rem',
                              paddingRight: '-0.1rem',
                              lineHeight: '1.5', // Adjust the line height as needed
                              fontFamily: 'Arial, sans-serif', // Adjust the font family as needed
                              fontWeight: 'bold'
                            }}
                            >
                              
                            </span>
                            
                            <span id='annots' className='clickable cursor-pointer bg-danger-50' style={{                               
                              fontSize: '10.5px', // Adjust the font size as needed
                              height: '1rem', // Adjust the height as needed
                              width: '20px', // Adjust the width as needed
                              padding: '0.3rem', // Adjust the padding as needed
                              lineHeight: '1.5', // Adjust the line height as needed
                              fontFamily: 'Arial, sans-serif', // Adjust the font family as needed
                              fontStyle: 'italic'
                            }}
                            onClick={() => handleClick(key)}
                            >{annotation.annotation}
                            </span>
                            <Icon 
                              size={'md'} 
                              name='trash' 
                              onClick={(e) => handleAnnotationDelete(key)} 
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                handleAnnotationDelete(key);
                              }}
                              className={cn(
                                'transition ease-in-out',
                                'text-volcanic-600 hover:bg-secondary-100 hover:text-volcanic-800 cursor-pointer',
                                'trash' 
                              )} 
                              style={{                               
                                fontSize: '10.5px',
                                height: '1rem',
                                width: '200px',
                                padding: '0.3rem',
                                marginTop: '15px',
                                lineHeight: '1.5',
                                fontFamily: 'Arial, sans-serif',
                              }}
                            />
                          

                          </div>
                        ))}
                      </div>
                      
                      {annotDictLength >= 1 && (
                        <div className="flex flex-col items-center" style={{}}>
                          <Tooltip
                            label={addedAnnots.size === annotDictLength? "Remove annotations" : "Prompt model with annotations"}
                            duration={2000}
                            showOutline={false}
                            hover
                            icon={
                              <Icon 
                                className="flex rounded p-2 transition ease-in-out text-volcanic-300 hover:bg-mushroom-900 hover:text-mushroom-300"
                                name={addedAnnots.size === annotDictLength ? "error" : "arrow-right"}
                                kind="outline"
                                onClick={() => {
                                  if (addedAnnots.size === annotDictLength) {
                                    setAddedAnnots(new Set());
                                  } else {
                                    handleAddAllAnnotations();
                                  }
                                }}
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  if (addedAnnots.size === annotDictLength) {
                                    setAddedAnnots(new Set());
                                  } else {
                                    handleAddAllAnnotations();
                                  }
                                }}
                              />
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {(showFeedback) && (message.feedback === undefined || message.feedback === null || message.feedback === "") ? (
  <div className="message-feedback-container" style={{ 
    marginTop: '12px', 
    paddingTop: '8px', 
    // borderTop: '1px solid #e0e0e0',
    maxWidth: '100%'
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <span id='annots' style={{ 
        color: 'black',
        fontSize: '11px',
        fontWeight: 500,
        marginBottom: '4px',
        textDecoration: 'none'
      }}>
        How well did the model address your annotations?
      </span>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '6px',
        fontFamily: 'Arial, sans-serif'
      }}>
        {[
          { value: "1", label: "Very Bad" },
          { value: "2", label: "Bad" },
          { value: "3", label: "Okay" },
          { value: "4", label: "Good" },
          { value: "5", label: "Very Good" }
        ].map(option => (
          <button 
            key={option.value}
            onClick={() => handleFeedbackSubmit(option.value)}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleFeedbackSubmit(option.value);
            }}
            disabled={isFeedbackSubmitting}
            style={{ 
              padding: '4px 8px',
              background: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '3px',
              cursor: isFeedbackSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '9px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              opacity: isFeedbackSubmitting ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              if (!isFeedbackSubmitting) {
                e.currentTarget.style.background = '#F6DDD5';
                e.currentTarget.style.borderColor = 'black';
                e.currentTarget.style.color = 'black';
              }
            }}
            onMouseOut={(e) => {
              if (!isFeedbackSubmitting) {
                e.currentTarget.style.background = '#f0f0f0';
                e.currentTarget.style.borderColor = '#ccc';
                e.currentTarget.style.color = '#333';
              }
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  </div>
) : (message.feedback !== undefined && message.feedback !== "") ? (
  <div className="message-feedback-container" style={{ 
    marginTop: '12px', 
    paddingTop: '8px', 
    // borderTop: '1px solid #e0e0e0',
    maxWidth: '100%',
    fontSize: '14px'
  }}>
    <span 
      id='annots'
      style={{ 
        color: '#4CAF50',
        cursor: 'pointer',
        textDecoration: 'none'
      }}
      onClick={() => {
        // Reset feedback to show the prompt again
        message.feedback = undefined;
        forceUpdate();
      }}
      onTouchEnd={(e) => {
        e.preventDefault(); // Prevent default to avoid double firing
        message.feedback = undefined;
        forceUpdate();
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.textDecoration = 'underline';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.textDecoration = 'none';
      }}
    >
      Thank you for your feedback!
      {(() => {
        const feedbackValue = message.feedback;
        const feedbackLabels = {
          "1": "Very Bad",
          "2": "Bad", 
          "3": "Okay",
          "4": "Good",
          "5": "Very Good"
        };
        const label = feedbackLabels[feedbackValue as keyof typeof feedbackLabels] || feedbackValue;
        return ` (${label})`;
      })()}
    </span>
  </div>
) : null}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center h-full">
            <div className="flex flex-col items-center">
              {/* Copy button */}
              {!isLongPressMenuOpen && (
                <CopyToClipboardIconButton 
                  value={""} 
                  onClick={(e) => {
                    e.preventDefault();
                    handleMessageCopy();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleMessageCopy();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Move debug info outside the message row */}
     
      {/* Debug information display */}
      {debugInfo.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '10px',
            left: '10px',
            zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            maxWidth: '80%',
            maxHeight: '30%',
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Debug Info:</div>
          {debugInfo.map((info, index) => (
            <div key={index} style={{ marginBottom: '3px' }}>{info}</div>
          ))}
        </div>
      )}
      {/* Remove the feedback UI from here */}
    </div>
  );
}), (prevProps, nextProps) => {
  // Deep compare message annotations if they exist
  const prevAnnotations = isFulfilledMessage(prevProps.message) ? prevProps.message.annotations : null;
  const nextAnnotations = isFulfilledMessage(nextProps.message) ? nextProps.message.annotations : null;
  const annotationsEqual = JSON.stringify(prevAnnotations) === JSON.stringify(nextAnnotations);

  // Compare feedback values
  const prevFeedback = prevProps.message.feedback;
  const nextFeedback = nextProps.message.feedback;

  return (
    prevProps.message.message_id === nextProps.message.message_id &&
    prevProps.message.conversation_id === nextProps.message.conversation_id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.is2ndLast === nextProps.is2ndLast &&
    prevProps.isStreamingToolEvents === nextProps.isStreamingToolEvents &&
    prevProps.className === nextProps.className &&
    prevFeedback === nextFeedback && // Compare feedback values
    annotationsEqual
  );
});


export default MessageRow;