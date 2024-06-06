import { MouseEvent, forwardRef, useEffect, useState, useRef, useImperativeHandle, useMemo, memo, useContext, createContext } from 'react';
import React from 'react';
import { useLongPress } from 'react-aria';

import { Avatar } from '@/components/Avatar';
import { LongPressMenu } from '@/components/LongPressMenu';
import { MessageContent } from '@/components/MessageContent';
import {
  Button,
  CopyToClipboardButton,
  CopyToClipboardIconButton,
  Icon,
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
} from '@/types/message';
import { cn } from '@/utils';

import { v4 as uuidv4 } from 'uuid';

import { CHAT_COMPOSER_TEXTAREA_ID } from '@/constants';
import { appSSR } from '@/pages/_app';
import { CohereClient } from '@/cohere-client';

type Props = {
  isLast: boolean;
  is2ndLast: boolean;
  message: ChatMessage;
  delay?: boolean;
  className?: string;
  order?: number;
  onCopy?: VoidFunction;
  onRetry?: VoidFunction;
  client: CohereClient;
};

/**
 * Renders a single message row from the user or from our models.
 */
const MessageRow = forwardRef<HTMLDivElement, Props>(function MessageRowInternal(
  { message, delay = false, isLast, is2ndLast, className = '', order, onCopy, onRetry, client },
  ref
) {
  const breakpoint = useBreakpoint();

  console.log('okay?')


  const [isShowing, setIsShowing] = useState(false);
  const [isLongPressMenuOpen, setIsLongPressMenuOpen] = useState(false);
  const [isStepsExpanded, setIsStepsExpanded] = useState<boolean>(isLast);
  // const {
  //   citations: { selectedCitation, hoveredGenerationId },
  //   hoverCitation,
  // } = useCitationsStore();
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
    setPreprocessedMessage(message.text)
  }, []);
  
  useEffect(() => {
    if (isLast) {
      setIsStepsExpanded(true);
    }
  }, [isLast]);

  // const [highlightMessage, setHighlightMessage] = useState(false);
  // const prevSelectedCitationGenId = usePreviousDistinct(selectedCitation?.generationId);

  // useEffect(() => {
  //   if (isFulfilledOrTypingMessage(message) && message.citations && message.generationId) {
  //     if (
  //       selectedCitation?.generationId === message.generationId &&
  //       prevSelectedCitationGenId !== message.generationId
  //     ) {
  //       setHighlightMessage(true);

  //       setTimeout(() => {
  //         setHighlightMessage(false);
  //       }, 1000);
  //     }
  //   }
  // }, [selectedCitation?.generationId, prevSelectedCitationGenId]);

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

  // State to manage the selected text and annotations
  const [annotationVisible, setAnnotationVisible] = useState<boolean | null>(null);
  const [annotationKey, setAnnotationKey] = useState<string>("");  
  //Store our annots here!
  const [annotDict, setAnnotDict] = useState<AnnotDict>({});
  const [addedAnnots, setAddedAnnots] = useState<Set<string>>(new Set()); //Checks for added annots to the prompt.

  const [preprocessedMessage, setPreprocessedMessage] = useState<string>(message.text); //default is normal message.text it is updated with higlights.
  const [annotSortDict, setSortAnnotDict] = useState<AnnotDict>(() => sortAnnotDict({}));



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
        setAnnotationVisible(false);
        removeAnnotation(annotationKey, annotSortDict);
        setAnnotationKey('');
      }
    };
  
    // Attach the event listener
    window.addEventListener('keydown', handleEscape);
  
    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [annotationKey, annotSortDict]);

  // Function to add annotation
  const addAnnotation = (s: string, a: string, start: number, end: number, ad: AnnotDict) => {

    //First check if ranges overlap, if so DO NOT ADD.
    const newRange: AnnotRange =  {start , end};

    console.log("YEAH IT OVERLAPS",isNewRangeOverlapping(ad, newRange))
    if (isNewRangeOverlapping(ad, newRange) || end < start){ //Incorrect range or is overlapping.
      setAnnotationVisible(false)
      console.log('overlap')
      return "";
    }

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
        const start = annotation.start;
        const end = annotation.end;
        const annotText = annotation.annotation;

        //Add the annotation length and fill it to 3 characters with secret parase key.
        const annotationSection = "@&^s$x+" + annotText.length.toString().padStart(3, '0') + annotText 

        // Add the text before the range
        highlightedText += text.substring(currentIndex, start);
        // Add the start marker for the highlighted text
        highlightedText += '[H]';

        //Construct the secret id for click scroll to be parsed by the markdown. Is parsed using the secret idx '+#$!^&@'
        highlightedText += '+x$s^&@' + key

        highlightedText += annotationSection //add annotation section.

        // Add the highlighted text
        let highlightedSelection = text.substring(start, end);

        console.log("HLS", highlightedSelection)

        //Advanced highlighting to handle special formatting
        highlightedSelection = highlightedSelection.replaceAll("```", "[$$$%g%%$$$]"); //convert code breaks these so they arent touched.

        highlightedSelection = highlightedSelection.replaceAll("**", "[@@@%ga%^$]"); //for bold

        highlightedSelection = highlightedSelection.replaceAll("\n-", "[%s%^$]"); //for lists
        
        highlightedSelection = highlightedSelection.replaceAll("*", "[/H]*[H]" + annotationSection); //for italics

        highlightedSelection = highlightedSelection.replaceAll("#", "[/H]#[H]" + annotationSection); //for headings (doesnt fix sadly)

        highlightedSelection = highlightedSelection.replaceAll("_", "[/H]_[H]" + annotationSection); //for underline

        highlightedSelection = highlightedSelection.replaceAll("[@@@%ga%^$]", "[/H]**[H]" + annotationSection); //for bold

        highlightedSelection = highlightedSelection.replaceAll("<", "[/H][H]<[/H][H]" + annotationSection); //<>

        highlightedSelection = highlightedSelection.replaceAll(">", "[/H][H]>[/H][H]" + annotationSection); //<>

        highlightedSelection = highlightedSelection.replaceAll("`", "[/H]`[H]" + annotationSection);

        highlightedSelection = highlightedSelection.replaceAll("[$$$%g%%$$$]", "```"); //restore them

        highlightedSelection = highlightedSelection.replaceAll("- ", "[/H]- [H]" + annotationSection); //For lists

        highlightedSelection = highlightedSelection.replaceAll("[%s%^$]", "[/H]\n- [H]" + annotationSection); //For lists

        highlightedSelection = highlightedSelection.replaceAll(/\n(\d{1,2})\. /g, '[/H]\n$1. [H]' + annotationSection) //lists

        highlightedSelection = highlightedSelection.replaceAll(/\n\n(\d{1,2})\. /g, '[/H]\n\n$1. [H]' + annotationSection) //lists

        highlightedSelection = highlightedSelection.replaceAll("\n\n", "[/H]\n\n[H]" + annotationSection);  //for highlgihts through line breaks.
        //highlightedSection = highlightedSection.replaceAll(":", "[/H]:[H]"); //list item titles
        //highlightedSelection = highlightedSelection.replaceAll("\n", "[/H]\n[H]" + annotationSection);

        highlightedText += highlightedSelection;

        // Add the end marker for the highlighted text
        highlightedText += '[/H]';
        currentIndex = end;
      });

      // Add the remaining text after the last range
      highlightedText += text.substring(currentIndex);

      console.log("HLTXT",highlightedText)

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


  useEffect(() => {
    const targetElement = document.getElementById(annotationKey);

    console.log("VISIBILITY CHANGE @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@", annotationVisible)

    //let annotationKey = annotationKey;

    let inputBox = document.createElement('input')
    if (annotationVisible){
    inputBox.type = 'text';
    //inputBox.value= value;
    //inputBox.onchange = (event) => handleChange(event as unknown as ChangeEvent<HTMLInputElement>);

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
    inputBox.style.zIndex = '99999999999999';

    // Applying class names
    inputBox.className = [
      //"min-h-[1rem] md:min-h-[2rem]",
      'w-auto',
      "self-center",
      "rounded",
      //"px-1 px-2",
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

    // Adding event handler
    inputBox.onkeydown = (e) => {
      const target = e.target as HTMLInputElement;

      if (e.key === 'Enter') {

        console.log(annotationKey);
        console.log('text', message.text);

        let final_annot = normalizeAnnotation(target.value) //remove unwatned chars.

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
        if (message.message_id){
        client.annotate(annotationKey, annotationRequest) //add it to DB
        } else{
          console.log("FAILED !!!!")
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
      } else {
        let tooltip = document.getElementById('tool' + annotationKey)
        const n_key = isAlphaNumericOrSymbol(e.key) ? e.key : "" //add latest key
        if (tooltip){tooltip.textContent = target.value + n_key;}
      } 
        
    
    }

    console.log("ADDED", inputBox)
    targetElement?.appendChild(inputBox)
    inputBox.focus();

    //targetElement?.appendChild(inputBox)
    // Optional clean up
    return () => {
      console.log("RETURN REMOVAL")
      if (targetElement && targetElement.contains(inputBox)) {
        targetElement.removeChild(inputBox);
        let tooltip = document.getElementById('tool' + annotationKey)
        console.log(tooltip)
        //tooltip!.textContent = "";
        
        //setPreprocessedMessage(insertHighlightMarkers(message.text, annotSortDict)) //Set the preprocessed message with higlights
        console.log('REMOVED2', inputBox)
        console.log(targetElement?.childNodes)
      }
    };
  }
  
  }, [annotationVisible]);


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
    console.log(currentNode.textContent)
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

//Handles the deleteion of an annotation after a click
const handleAnnotationDelete = (key: string) => {
  setAnnotationVisible(false);
  removeAnnotation(key, annotSortDict);
  handleRemovePromptAnnotation(key) //remove it if added to prompt
  client.deleteAnnotation(key) //remove it from db
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
  let l1 = '| Annotated Text | Annotation |\n'
  let l2 = '|----------|----------|\n'
  return l1 + l2
}

//Builds the prompt for annotations to be passed to the model
function constructAnnotationPromptCore(annots: AnnotDict, keys: Set<string>): string {
  let core = ""

  //Creates a single line for the prompt
  function createAnnotationLine(a: Annotation): string {
    let line = "| " + (a.htext).trim().replaceAll('\n',"").replaceAll('\t',"").replaceAll(/\s{2,}/g, "").replaceAll('\r',"") + " | *" + (a.annotation).trim() + "* |\n"
    //let line = "**" + (a.htext).trim() + "** : *" + (a.annotation).trim() + "*\n"

    return line
  }

  Object.entries(annots).forEach(([key, annotation]) => {

    if(keys.has(key)){  
      core += '' + createAnnotationLine(annotation)
      //core += '\n- ' + createAnnotationLine(annotation)
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
        start = "Can you address these annotations? Answer by modifying your previous output. I have provided annotations regarding my prompt in the order they appeared in the prompt.\n\n## Prompt Annotations:\n" + constructHeaders()
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
        start = "Can you address these annotations? Answer by modifying your previous output. I have provided annotations for your output in the order they appeared in your message.\n\n## Output Annotations:\n" + constructHeaders()
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

const handleCopy = async (e: MouseEvent<HTMLElement>) => {
  try {
    await window?.navigator?.clipboard.writeText(e.currentTarget.id ?? '');
  } catch (e) {
    console.error(e);
  }
};

  

  
  


const findExactIndices = (messageText:string, startOffset:number, endOffset:number, st:string, range: Range) => {

  const sc = range.startContainer;
  const ec = range.endContainer;
  
  console.log(showHiddenCharacters(message.text))
  const filter = filteredMappingV2(messageText)
  const filteredCharacters = filter.map(item => item[1]).join('');
  console.log("FILTERED CHARSSSSS")
  console.log(filteredCharacters)
  // Normalize the original message text
  const normalizedMessage = normalize(messageText);
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

  const fil = filteredMappingV2(message.text)
  console.log(fil)
  let f_start = 0;
  let f_end = 0;
  ///

  //Weird undefined bug for ending and starting character, handled here.

  ///
  if (fil[d.start] !== undefined){
    f_start = Number(fil[d.start][0])
  } else {f_start=0}
  if (fil[d.end] !== undefined){
    f_end=Number(fil[d.end][0])
  } else {f_end=messageText.length;}
  return { start: f_start, end: f_end };
};

const localRef = useRef<HTMLDivElement|null>(null);

// Combine forwarded ref with localRef
useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  //Complicated function for determining annotaiton highlights by the user.
  const handleMouseUp = (e : React.MouseEvent) => {
    const selection = window.getSelection();
    if (!(selection && selection.toString() && !annotationVisible && selection.anchorNode)) { 
      return;
    }


    const selectedText = selection.toString();
    const lenst = selectedText.length;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
  
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

    const u = findExactIndices(message.text, startOffset, endOffset, selectedText, range)
    console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
    console.log(message.text.substring(Number(u.start), Number(u.end)))
    console.log(u.start)
    console.log(u.end)
    console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")

    let start = Number(u.start)
    let end = Number(u.end)

    console.log(selectedText.charAt(lenst))
    console.log(backNormalize(message.text.substring(start,end)))

    const newFinalMessage = backNormalize(message.text.substring(start,end)) //Remove any final junk with backNroamlize.
    const fLen = newFinalMessage.length;
    end = start + fLen;

  

    //console.log("SUBSTRING", message.text.substring(startIdxInMessage, endIdxInMessage))
    //user messages are weird so we handle them with special care (copied line breaks cause issues)
    if (message.text.indexOf(startContainerText) === -1 || message.text.indexOf(endContainerText) === -1){ //User selected from multiple chat rows.
      console.log("multiple!!!!")
      //return;
    }

    const startIdxInMessage = message.text.indexOf(startContainerText) + startOffset;
    const endIdxInMessage = message.text.indexOf(endContainerText) + endOffset;

    if (message.text.substring(start, end).includes('```')||message.text.substring(startIdxInMessage, endIdxInMessage).includes('```') && (range?.commonAncestorContainer?.textContent||"").includes('```')){ //The user is trying to make a stupid highlight.
      console.log("code detection")
      return;
    }

    //cannot annotate a space 
    if(selectedText === ""){
      return;
    }

    const ida = addAnnotation(selectedText, "Add Annotation...", start, end, annotDict);
    // //setAnnotationVisible(true);
    setAnnotationKey(ida);
    


    

  };



  return (
    <div
      id={
        isFulfilledOrTypingMessage(message) && message.generationId
          ? getMessageRowId(message.generationId)
          : undefined
      }
      className={cn(ReservedClasses.MESSAGE, 'flex', className)}
      //onMouseEnter={handleOnMouseEnter}
      //onMouseLeave={handleOnMouseLeave}
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

          // {
          //   'bg-secondary-50':
          //     isFulfilledOrTypingMessage(message) &&
          //     message.generationId &&
          //     hoveredGenerationId === message.generationId,
          //   'bg-primary-50 hover:bg-primary-50': highlightMessage,
          // }
        )}
        {...(enableLongPress && longPressProps)}
      >
        <div className="flex w-full gap-x-2">
          <Avatar message={message} />
          <div className="flex w-full min-w-0 max-w-message flex-1 flex-col items-center gap-x-3 md:flex-row">
            <div className="w-full">
              {hasSteps && <ToolEvents show={isStepsExpanded} events={message.toolEvents}/>}

              {//This is where we render the annotated box
              }

              {/* <MessageContent 
              isLast={isLast}
              message={message}
              onRetry={onRetry}
              overrideText={preprocessedMessage}
              >
              </MessageContent> */}
              

                  <div>
                    {renderAnnotatedText({p_msg:preprocessedMessage})}
                  </div>



              {//This was an old rendering pipeline. 
              //<MessageContent isLast={isLast} message={message} onRetry={onRetry} />
              }

              {/* {annotations.map((annotation, index) => (
                <div key={index} className='bg-secondary-50 p-1 my-1'>
                  <span className='font-bold'>{annotation.text}</span>: {annotation.annotation}
                </div>
              ))} */}

            
            {annotDictLength > 0 && <h1 id='annots' className={cn('text-title','font-bold','font-family-CohereIconDefault')} 
                                                      style={{ paddingTop: '0.5rem', paddingBottom: '0.3rem', }}>
                                                  Annotations</h1>}
            {annotDictLength > 0 &&  <hr id='annots' style={{ paddingTop: '0.5rem', paddingBottom: '0.1rem', border: 'none', borderTop: '2px solid black' }}></hr>}
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
                              }}>
                              
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
                    <Icon size={'md'} name='trash' kind="outline" onClick={() => handleAnnotationDelete(key)} className={cn(
                    'transition ease-in-out',
                    'text-volcanic-600 hover:bg-secondary-100 hover:text-volcanic-800 cursor-pointer',
                    //'bg-secondary-200',
                    'trash' 
                  )} style={{                               
                    fontSize: '10.5px', // Adjust the font size as needed
                    height: '1rem', // Adjust the height as needed
                    width: '200px', // Adjust the width as needed
                    padding: '0.3rem', // Adjust the padding as needed
                    marginTop: '15px',
                    lineHeight: '1.5', // Adjust the line height as needed
                    fontFamily: 'Arial, sans-serif', // Adjust the font family as needed
                  }}/>
                  {!isAnnotAdded(key, addedAnnots) && (<Icon size={'md'} name='add' kind="outline" onClick={() => handleAddPromptAnnotation(key)} className={cn(
                      'transition ease-in-out',
                      'text-volcanic-600 hover:bg-secondary-100 hover:text-volcanic-800 cursor-pointer',
                      //'bg-secondary-200',
                      'trash' 
                    )} style={{                               
                      fontSize: '10.5px', // Adjust the font size as needed
                      height: '1rem', // Adjust the height as needed
                      width: '200px', // Adjust the width as needed
                      padding: '0.3rem', // Adjust the padding as needed
                      marginTop: '15px',
                      lineHeight: '1.5', // Adjust the line height as needed
                      fontFamily: 'Arial, sans-serif', // Adjust the font family as needed
                    }}/>)}
                    {isAnnotAdded(key, addedAnnots) && (<Icon size={'md'} name='subtract' kind="outline" onClick={() => handleRemovePromptAnnotation(key)} className={cn(
                      'transition ease-in-out',
                      'text-volcanic-600 hover:bg-secondary-100 hover:text-volcanic-800 cursor-pointer',
                      //'bg-secondary-200',
                      'trash' 
                    )} style={{                               
                      fontSize: '10.5px', // Adjust the font size as needed
                      height: '1rem', // Adjust the height as needed
                      width: '200px', // Adjust the width as needed
                      padding: '0.3rem', // Adjust the padding as needed
                      marginTop: '15px',
                      lineHeight: '1.5', // Adjust the line height as needed
                      fontFamily: 'Arial, sans-serif', // Adjust the font family as needed
                    }}/>)}
                    <Icon size={'md'} name='copy' kind="outline" id={annotation.htext} onClick={handleCopy} className={cn(
                      'transition ease-in-out',
                      'text-volcanic-600 hover:bg-secondary-100 hover:text-volcanic-800 cursor-pointer',
                      //'bg-secondary-200',
                    )} style={{                               
                      fontSize: '13px', // Adjust the font size as needed
                      height: '1rem', // Adjust the height as needed
                      width: '200px', // Adjust the width as needed
                      padding: '0.3rem', // Adjust the padding as needed
                      marginTop: '15px',
                      lineHeight: '1.5', // Adjust the line height as needed
                      fontFamily: 'Arial, sans-serif', // Adjust the font family as needed
                    }}/>

                </div>
                
              ))}
            {annotDictLength > 2 &&  <hr id='annots' style={{ marginTop: '0.8rem', paddingTop: '0.8rem', paddingBottom: '0.1rem', border: 'none', borderTop: '2px solid black' }}></hr>}
            </div>
            


            

            <div
              className={cn('flex h-full items-end justify-end self-end', {
                'hidden md:invisible md:flex':
                  !isFulfilledMessage(message) && !isUserMessage(message),
                'hidden md:invisible md:flex md:group-hover:visible': !isLast,
              })}
            >
              {/* {hasSteps && (
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
              )} */}
              {<CopyToClipboardIconButton value={getMessageText()} onClick={onCopy} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});


export default memo(MessageRow);
