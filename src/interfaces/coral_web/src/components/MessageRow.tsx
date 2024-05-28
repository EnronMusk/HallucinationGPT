import { usePreviousDistinct } from '@react-hookz/web';
import { forwardRef, useEffect, useState, useRef, useImperativeHandle, ChangeEvent } from 'react';
import React from 'react';
import { useLongPress } from 'react-aria';

import { Avatar } from '@/components/Avatar';
import IconButton from '@/components/IconButton';
import { LongPressMenu } from '@/components/LongPressMenu';
import { MessageContent } from '@/components/MessageContent';
import { MESSAGE_LIST_CONTAINER_ID } from '@/hooks/citations';
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
  MessageType,
} from '@/types/message';
import { cn, replaceTextWithCitations } from '@/utils';

import { STYLE_LEVEL_TO_CLASSES } from '@/components/Shared';
import { render } from '@headlessui/react/dist/utils/render';
import { v4 as uuidv4 } from 'uuid';

import { CitationTextHighlighter } from '@/components/Citations/CitationTextHighlighter';
import { DataTable } from '@/components/DataTable';
import { MarkdownImage } from '@/components/MarkdownImage';
import { zIndex } from '@/constants/tailwindConfigValues';

import { Dictionary } from 'lodash';
import { offset } from '@floating-ui/react';

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

  //REPLACE DOUBLE NEW LINES WITH SINGLE? IDK?


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
  const [annotationVisible, setAnnotationVisible] = useState<boolean>(false);
  const [annotationKey, setAnnotationKey] = useState<string>("");  
  //Store our annots here!
  const [annotDict, setAnnotDict] = useState<AnnotDict>({});
  const [AnnotRange, setAnnotRange] = useState<AnnotRange[]>([]);
  const [annotationPosition, setAnnotationPosition] = useState({ top: 0, left:0 });
  const [preprocessedMessage, setPreprocessedMessage] = useState<string>(message.text); //default is normal message.text it is updated with higlights.
  const [annotSortDict, setSortAnnotDict] = useState<AnnotDict>(() => sortAnnotDict({}));


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

    const annot: Annotation = { text:s, annotation:a, start, end };
    ad[id] = annot;
    const newDictSorted = sortAnnotDict(ad)
    setAnnotDict(ad);
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

    //Creates a secret id for each annotation based on the annotation itself. (it is embedded in the highlighted text and processed by each markdown component)
    const createSecretId = (text: string, start: number, end: number) => {

      return '+#$s^&@' + (start * end + 100000).toString().substring(0,6)
    }

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
        const annotationSection = "@&^s$#+" + annotText.length.toString().padStart(3, '0') + annotText 

        // Add the text before the range
        highlightedText += text.substring(currentIndex, start);
        // Add the start marker for the highlighted text
        highlightedText += '[H]';

        //Construct the secret id for click scroll to be parsed by the markdown. Is parsed using the secret idx '+#$!^&@'
        highlightedText += '+#$s^&@' + key

        highlightedText += annotationSection //add annotation section.

        // Add the highlighted text
        let highlightedSelection = text.substring(start, end);

        console.log("HLS", highlightedSelection)

        //Advanced highlighting to handle special formatting
        highlightedSelection = highlightedSelection.replaceAll("```", "[$$$%g%%$$$]"); //convert code breaks these so they arent touched.

        highlightedSelection = highlightedSelection.replaceAll("**", "[/H]**[H]" + annotationSection);

        highlightedSelection = highlightedSelection.replaceAll("<", "[/H][H]<[/H][H]" + annotationSection); //<>

        highlightedSelection = highlightedSelection.replaceAll(">", "[/H][H]>[/H][H]" + annotationSection); //<>

        highlightedSelection = highlightedSelection.replaceAll("`", "[/H]`[H]" + annotationSection);

        highlightedSelection = highlightedSelection.replaceAll("[$$$%g%%$$$]", "```"); //restore them

        highlightedSelection = highlightedSelection.replaceAll("- ", "- [H]" + annotationSection); //For lists

        highlightedSelection = highlightedSelection.replaceAll(/\n(\d{1,2})\. /g, '[/H]\n$1. [H]' + annotationSection) //lists

        highlightedSelection = highlightedSelection.replaceAll(/\n\n(\d{1,2})\. /g, '[/H]\n\n$1. [H]' + annotationSection) //lists

        highlightedSelection = highlightedSelection.replaceAll("\n\n", "[/H]\n\n[H]" + annotationSection);  //for highlgihts through line breaks.
        //highlightedSection = highlightedSection.replaceAll(":", "[/H]:[H]"); //list item titles

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
  
    interface RenderAnnoatedTextProps {
      p_msg: string;
    }
  //ad: { [key: string]: Annotation }}
    const renderAnnotatedText: React.FC<RenderAnnoatedTextProps> = ({p_msg}: {p_msg: string}) => {
        if (p_msg === ""){//if initial render has trouble...? sometimes processedMEssage is not initialized properly.
          p_msg = message.text
        }

        return (
          <MessageContent 
            isLast={isLast}
            message={message}
            onRetry={onRetry}
            overrideText={p_msg}
          >
          </MessageContent>

          // <Markdown
          //   text={p_msg} //Pass pre processed text with highlights only.
          //   className={cn(STYLE_LEVEL_TO_CLASSES.p)}
          //   customComponents={{
          //     img: MarkdownImage as any,
          //     cite: CitationTextHighlighter as any,
          //     table: DataTable as any,
          //   }}
          //   renderLaTex={true}
          // />
        )
      };

const normalize = (text : string) => {
  return text.replace(/\n(\d{1,2})\./g, "").replace(/[\s-`\n\r\t]/g, "")//.replace(/[\x00-\x1F\x7F\s]/g, '');
  .replace(/\*\*/g, "")

  //.replace(/\\n\./g,"")
};


const backNormalize = (text: string): string => {

  // Strings/characters to remove from the end (length 1-4)
  const substrsToRemove = new Set([' ', '-', '\n', '\r', '\t', '`', '**']);

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
    let tripletsToRemove = []
    let singlesToRemove = ['`', '-', '\n', '\r', ' ']

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

  const [value, setValue] = useState('');

  const handleChange = (event : ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    // Regex pattern: allow alphanumeric characters and specified special characters
    const regex = /^[a-zA-Z0-9\[\]\(\)\{\}\!\@\#\$\%\^\&\_\+\=\-\;\:\'\"\,\.\?\/\\]*$/;
    
    if (regex.test(value)) {
      setValue(value);
    }
  };


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
    inputBox.style.font = "Arial, sans-serif";
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
      "hover:none"
    ].join(" ")

    inputBox.ariaHidden = 'true'

    inputBox.placeholder = 'Add annotation . . .';
    inputBox.maxLength = 125;

    // Adding event handler
    inputBox.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLInputElement;
        

        console.log(annotationKey);
        console.log('text', message.text);

        setAnnotDict(prevDict => ({
          ...prevDict,
          [annotationKey]: { ...prevDict[annotationKey], annotation: target.value}
        }));

        // Temporary dict for this single render.
        let ad = annotDict;
        ad[annotationKey].annotation = target.value;
        ad = sortAnnotDict(ad);

        setSortAnnotDict(ad);
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


  useEffect(() => {
    //setPreprocessedMessage(insertHighlightMarkers(message.text, annotSortDict))
  }, [annotSortDict]);

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

  //For tricky starting points as code.
  if (sc.parentElement?.nodeName === 'CODE'){ 
    console.log('override with ender')
    p_text = calculateContainerEnder(ec)+normalize(ec.textContent||"")
    trueOffset += p_text.lastIndexOf(normalize(sc.textContent||""))
  }

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
  if (st.length >= 75){
    p_idx = n_msg.indexOf(st)
    c_idx = 0;
    trueOffset = 0;
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

}



  

  
  


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

    if (message.text.substring(start, end).includes('```')){ //The user is trying to make a stupid highlight.
      console.log("code detection")
      return;
    }

    const ida = addAnnotation(selectedText, "Add Annotation...", start, end, annotDict);
    // //setAnnotationVisible(true);
    setAnnotationKey(ida);

    setAnnotationPosition({
      top: 0, //rect.top + scrollY,
      left: rect.right + window.scrollX //rect.right + scrollX - 10, //correct X.
    });
    
    

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

          
              {annotationVisible && (<div></div>)}

             
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

            
            {Object.keys(annotDict).length > 0 && <h1 id='annots' className={cn('text-title','font-bold','font-family-CohereIconDefault')} 
                                                      style={{ paddingTop: '0.5rem', paddingBottom: '0.3rem', }}>
                                                  Annotations</h1>}
            {Object.keys(annotDict).length > 0 &&  <hr id='annots' style={{ paddingTop: '0.5rem', paddingBottom: '0.1rem', border: 'none', borderTop: '2px solid black' }}></hr>}
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
                              >{index + 1}{'. '}{annotation.text}
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
                </div>
                
              ))}
            {Object.keys(annotDict).length > 2 &&  <hr id='annots' style={{ marginTop: '0.8rem', paddingTop: '0.8rem', paddingBottom: '0.1rem', border: 'none', borderTop: '2px solid black' }}></hr>}
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
