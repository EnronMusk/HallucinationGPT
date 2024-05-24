import { usePreviousDistinct } from '@react-hookz/web';
import { forwardRef, useEffect, useState, useRef, useImperativeHandle } from 'react';
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
    console.log(id)
    console.log(element)
    console.log(document.getElementById("annots"))
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

  interface AnnotRanges {
    start: number,
    end: number,
  }

  // State to manage the selected text and annotations
  const [annotationVisible, setAnnotationVisible] = useState<boolean>(false);
  const [annotationKey, setAnnotationKey] = useState<string>("");  
  //Store our annots here!
  const [annotDict, setAnnotDict] = useState<AnnotDict>({});
  const [annotRanges, setAnnotRanges] = useState<AnnotRanges[]>([]);
  const annotationRef = useRef(null);
  const [annotationPosition, setAnnotationPosition] = useState({ top: 0, bottom: 0, height:0, right:0, left:0, x:0, y:0 });
  const [preprocessedMessage, setPreprocessedMessage] = useState<string>(message.text); //default is normal message.text it is updated with higlights.
  const [annotSortDict, setSortAnnotDict] = useState<AnnotDict>(() => sortAnnotDict({}));


  //automatically updates the sorted annotdict when needed.
  useEffect(() => {
    const sorted = sortAnnotDict(annotDict);
    setSortAnnotDict(sorted);
  }, [annotDict]);

    // Function to add annotation
    const addAnnotation = (s: string, a: string, start: number, end: number, ar: AnnotRanges[]) => {

      //First check if ranges overlap, if so DO NOT ADD.
      const newRange: AnnotRanges =  {start , end};

      if (isNewRangeOverlapping(ar, newRange) || end < start){ //Incorrect range or is overlapping.
        setAnnotationVisible(false)
        console.log('overlap')
        return "";
      }

      //Ranges dont overlap, we are good to proceed creating annotation
      setAnnotationVisible(true)
      const id = uuidv4().toString();
  
      const annot: Annotation = { text:s, annotation:a, start, end };
      setAnnotDict(prevDict => ({ ...prevDict, [id]: annot }));
  
      ar.push({start,end})
      const newRanges = Object.values(ar).sort((a, b) => a.start - b.start); //For proper rendering later. DO NOT REMOVE!
      setAnnotRanges(newRanges)

      setPreprocessedMessage(insertHighlightMarkers(message.text, newRanges)) //Set the preprocessed message with higlights

    console.log("key!!!", newRanges)
  
    return id
  
     
    };

    ///

    /// For highlight placements!


    ///

    //Creates a secret id for each annotation based on the annotation itself. (it is embedded in the highlighted text and processed by each markdown component)
    const createSecretId = (text: string, start: number, end: number) => {

      return '+#$s^&@' + (start * end + 100000).toString().substring(0,6)
    }

    // Function to insert highlight markers into text based on ranges
    const insertHighlightMarkers = (text: string, ranges: AnnotRanges[]) => {
      let highlightedText = '';
      let currentIndex = 0;

      ranges.forEach(range => {
        // Add the text before the range
        highlightedText += text.substring(currentIndex, range.start);
        // Add the start marker for the highlighted text
        highlightedText += '[H]';

        //Construct the secret id for click scroll to be parsed by the markdown. Is parsed using the secret idx '+#$!^&@'
        highlightedText += createSecretId(text, range.start, range.end)


        // Add the highlighted text
        let highlightedSelection = text.substring(range.start, range.end);

        console.log("HLS", highlightedSelection)

        //Advanced highlighting to handle special formatting
        highlightedSelection = highlightedSelection.replaceAll("**", "[/H]**[H]");
        
        highlightedSelection = highlightedSelection.replaceAll("```", "[$$$%%%$$$]"); //convert code breaks these so they arent touched.

        highlightedSelection = highlightedSelection.replaceAll("`", "[/H]`[H]");

        highlightedSelection = highlightedSelection.replaceAll("[$$$%%%$$$]", "```"); //restore them

        highlightedSelection = highlightedSelection.replaceAll("- ", "- [H]"); //For lists

        highlightedSelection = highlightedSelection.replaceAll("<", "[/H][H]<[/H][H]"); //<>

        highlightedSelection = highlightedSelection.replaceAll(">", "[/H][H]>[/H][H]"); //<>

        highlightedSelection = highlightedSelection.replaceAll(/\n(\d{1,2})\. /g, '[/H]\n$1. [H]') //lists

        highlightedSelection = highlightedSelection.replaceAll(/\n\n(\d{1,2})\. /g, '[/H]\n\n$1. [H]') //lists

        highlightedSelection = highlightedSelection.replaceAll("\n\n", "[/H]\n\n[H]");  //for highlgihts through line breaks.
        //highlightedSection = highlightedSection.replaceAll(":", "[/H]:[H]"); //list item titles

        highlightedText += highlightedSelection;

        // Add the end marker for the highlighted text
        highlightedText += '[/H]';
        currentIndex = range.end;
      });

      // Add the remaining text after the last range
      highlightedText += text.substring(currentIndex);

      console.log("HLTXT",highlightedText)

      return highlightedText;
    };

    /// for checking if highlight ranges overlap (we dont want that)
    function doRangesOverlap(range1: AnnotRanges, range2:AnnotRanges) {
      return range1.start < range2.end && range2.start < range1.end;
  }
  
  function isNewRangeOverlapping(ranges: AnnotRanges[], newRange: AnnotRanges) {
      for (let range of ranges) {
          if (doRangesOverlap(range, newRange)) {
              return true; // Overlap found
          }
      }
      return false; // No overlap found
  }

    ///

    ///

    ///
  
    interface RenderAnnoatedTextProps {
      p_msg: string;
      ar: AnnotRanges[];
    }
  //ad: { [key: string]: Annotation }}
    const renderAnnotatedText: React.FC<RenderAnnoatedTextProps> = ({p_msg, ar}: {p_msg: string, ar: AnnotRanges[]}) => {
        if (p_msg === ""){//if initial render has trouble...? sometimes processedMEssage is not initialized properly.
          p_msg = message.text
        }

        return (
          <Markdown
            text={p_msg} //Pass pre processed text with highlights only.
            className={cn(STYLE_LEVEL_TO_CLASSES.p)}
            customComponents={{
              img: MarkdownImage as any,
              cite: CitationTextHighlighter as any,
              table: DataTable as any,
            }}
            renderLaTex={true}
            //highlightedRanges={[{start:1,end:200},{start:310, end:320},{start:330, end:390},{start:950,end:1050}]}
            highlightedRanges={ar} //ONLY PASSED FOR ids for linking annotations below to the annotations in the text.
          />
        )
      };

const normalize = (text : string) => {
  return text.replace(/\n(\d{1,2})\./g, "").replace(/[\s-`\n\r\t]/g, "")//.replace(/[\x00-\x1F\x7F\s]/g, '');
  .replace(/\*\*/g, "")

  //.replace(/\\n\./g,"")
};


const backNormalize = (text: string): string => {

  // Strings/characters to remove from the end (length 1-4)
  const substrsToRemove = new Set([' ', '-', '\n', '\r', '\t', '\s', '`', '**']);

  for (let i = 1; i <= 30; i++) {
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
    const mappedCharacters = theMapper(text);
    const normalizedText = normalize(text);

    let pairsToRemove = ['**']
    let tripletsToRemove = []
    let singlesToRemove = ['`', '-', '\n', '\r', ' ']

    for (let i = 1; i <= 9; i++) {
      let pair = "\n" + i + '.'; // i + ". "
      tripletsToRemove.push(pair)
    }

    for (let i = 10; i <= 30; i++) {
      let pair = i + '.';
      tripletsToRemove.push(pair)
    }

    let filteredArray = []

    for (let i = 0; i<=mappedCharacters.length-3; i++){
      let trip = mappedCharacters[i][1].toString() + mappedCharacters[i+1][1] + mappedCharacters[i+2][1]
      let double = mappedCharacters[i][1].toString() + mappedCharacters[i+1][1]
      let single = mappedCharacters[i][1].toString()


      if (i === mappedCharacters.length-3){
        
        if (!(singlesToRemove.includes(mappedCharacters[i].toString()))){
            filteredArray.push(mappedCharacters[i])
        }
        if (!(pairsToRemove.includes(mappedCharacters[i].toString() + mappedCharacters[i+1]))){
          filteredArray.push(mappedCharacters[i+1])
        }
        filteredArray.push(mappedCharacters[i+2])
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



// // Usage
// const originalText = "Your original text here";
// const { normalizedText, mappings } = normalizeShellWithMapping(originalText);
// const normalizedIndices = [5, 10]; // Example indices in normalized text
// const originalIndices = mapIndicesBack(normalizedIndices, mappings);

// console.log(`Original indices for normalized indices ${normalizedIndices} are ${originalIndices}`);



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

const calculateStartAndEnd = (sc: Node, startOffset:number, st:string, n_msg:string): {start:number, end:number} => {
  let text = calculateContainerStarter(sc);
  let trueOffset = calculateStartOffset(sc, startOffset)
  let p_text = normalize(sc.parentElement?.textContent||"");
  console.log("p_text", p_text)
  console.log("s_text", text)
  st = normalize(st);
  console.log("n_msg", n_msg)
  console.log(n_msg.length)
  const p_idx = n_msg.indexOf(p_text);
  const c_idx = p_text.indexOf(text)

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




  

  
  


const findExactIndices = (messageText:string, startOffset:number, endOffset:number, st:string, range: Range) => {

  const sc = range.startContainer;
  
  console.log(showHiddenCharacters(message.text))
  const filter = filteredMappingV2(messageText)
  const filteredCharacters = filter.map(item => item[1]).join('');
  console.log("FILTERED CHARSSSSS")
  console.log(filteredCharacters)
  // Normalize the original message text
  const normalizedMessage = normalize(messageText);
  let normalizedSelectedText = normalize(st)

  console.log("7777777777777777777777777777777777777777778787878787878787")
  const d = calculateStartAndEnd(sc, startOffset, st, filteredCharacters) //replace nrom message  
  console.log(normalizedMessage)
  console.log(normalizedMessage.length)
  console.log(filteredCharacters)
  console.log(filteredCharacters.length)
  console.log(normalizedMessage.substring(d.start, d.end))
  console.log(normalizedSelectedText)
  console.log(d.start)
  console.log(d.end)
  console.log("STARTER is back!", calculateContainerStarter(sc)+sc.textContent?.substring(0, startOffset))
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


  //Complicated function for determining annotaiton highlights by the user.
  const handleMouseUp = (event: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!(selection && selection.toString() && !annotationVisible && selection.anchorNode)) { 
      return;
    }
    console.log("Y", event.clientY)
  
    console.log("X", event.clientX)
    const crect = event.currentTarget.getClientRects();
    const selectedText = selection.toString();
    const lenst = selectedText.length;
    const range = selection.getRangeAt(0);

    console.log("cresct")
    console.log(crect[0].height)
    //const rect = event.currentTarget.getBoundingClientRect();
    
    //For annotation positioning
    let rect = range.getBoundingClientRect();
    const rects = range.getClientRects();
    rect = rects[rects.length-1]

    const middleY = rect.top + (rect.height / 2);
    const inlineX = rect.right;  // Position it just right to the highlight

    setAnnotationPosition({
      top: crect[0].top,
      bottom: rect.bottom + (rect.height) + window.scrollY,
      right: crect[0].right,
      left: rect.right + window.scrollX - 10, //correct X.
      x: crect[0].x,
      y: crect[0].y,
      height: crect[0].height
    });

    console.log('rect.bottom:', rect.bottom);
console.log('window.scrollY:', window.scrollY);
console.log('Calculated top:', rect.bottom + window.scrollY);
console.log('Annotation Position:', annotationPosition);
  
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

    const newFinalMessage = backNormalize(message.text.substring(start,end)) //Remove any final junk.
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

    if (message.text.substring(startIdxInMessage, endIdxInMessage).includes('```') && startIdxInMessage < endIdxInMessage){ //THe user is trying to make a stupid highlight.
      console.log("code detection")
      return;
    }

    const ida = addAnnotation(selectedText, "", start, end, annotRanges);
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
                    <div 
                    ref={ref} 
                    style={{
                      display: "flex",
                      position: "absolute",
                      float: 'right',
                      //top: `${annotationPosition.bottom}px`,
                      //bottom: `${annotationPosition.top}px`,
                      //right: `${annotationPosition.right}px`,
                      left: `${annotationPosition.left}px`,
                      //x: `${annotationPosition.x}px`,
                      //y: `${annotationPosition.y}px`,
                      //left: '50%',
                      //bottom: '80%',
                      //height: `${annotationPosition.height}px`,

                      //zIndex: 1000,
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
                                  'w-full',
                              
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


                                    console.log(annotationKey)
                                    console.log("TEXT",message.text)

                                    setAnnotDict(prevDict => ({
                                      ...prevDict,
                                      [annotationKey]: { ...prevDict[annotationKey], annotation: target.value }
                                    }));
                                    
                                    setAnnotationVisible(false);
                                    setAnnotationKey("")
                                    target.value = "";
                                  }
                                  else if(e.key === "Escape"){
                                    setAnnotationVisible(false);
                                    setAnnotationKey("")
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
                    {renderAnnotatedText({p_msg:preprocessedMessage, ar:annotRanges})}
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

            
            {Object.keys(annotDict).length > 0 && <h1 id='annots' className={cn('text-title','font-bold','font-family-CohereIconDefault')} 
                                                      style={{ paddingTop: '0.5rem', paddingBottom: '0.3rem', }}>
                                                  Annotations</h1>}
            {Object.keys(annotDict).length > 0 &&  <hr id='annots' style={{ paddingTop: '0.5rem', paddingBottom: '0.1rem', border: 'none', borderTop: '2px solid black' }}></hr>}
            {Object.values(annotSortDict).map((annotation, index) => (
                <div id='annots' key={index} className={cn()}>
                  <span id='annots' className='clickable cursor-pointer bg-yellow-100 hover:underline focus:underline' style={{                               
                                fontSize: '10.5px', // Adjust the font size as needed
                                height: '1rem', // Adjust the height as needed
                                width: '200px', // Adjust the width as needed
                                padding: '0.3rem', // Adjust the padding as needed
                                lineHeight: '1.5', // Adjust the line height as needed
                                fontFamily: 'Arial, sans-serif', // Adjust the font family as needed
                                fontWeight: 'bold'
                              }}
                              onClick={() => handleClick(createSecretId(message.text, annotation.start, annotation.end).substring(7,13))}
                              >{annotation.text}
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
                                width: '200px', // Adjust the width as needed
                                padding: '0.3rem', // Adjust the padding as needed
                                lineHeight: '1.5', // Adjust the line height as needed
                                fontFamily: 'Arial, sans-serif', // Adjust the font family as needed
                                fontStyle: 'italic'
                              }}
                              onClick={() => handleClick(createSecretId(message.text, annotation.start, annotation.end).substring(7,13))}
                              >{annotation.annotation}
                    </span>
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
