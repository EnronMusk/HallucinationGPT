import { ComponentPropsWithoutRef, useState } from 'react';
import React from 'react';
import { cn } from '@/utils';
import { STYLE_LEVEL_TO_CLASSES } from '@/components/Shared';

interface PropsWithChildren {
  children: React.ReactNode;
}

//we use custom highlight here.
const Highlight = ({ children, id, annotation }: { children: React.ReactNode, id: string, annotation:string }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span id={id} className={cn("font-family-CohereIconDefault","text-bold","text-volcanic-700",'non-selectable','highlight')} onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      {isVisible && (
        <span id={'tool'+id} className='tooltip non-selectable' aria-hidden='true'>
          {annotation}
        </span>
      )}
    </span>
  );
};

export const Code = ({ children }: ComponentPropsWithoutRef<'code'>) => {
  const processText = (text: string): React.ReactNode => {
    const parts = text.split(/(\[H\]|\[\/H\])/);
    return parts.map((part, index) => {
      if (part === '[H]' || part === '[/H]') {
        return null; // Ignore the markers themselves
      }
      if (index % 4 === 2) {
        const idx_id = part.indexOf("+x$s^&@") //Grab idx for the secret id to assign.
        let id = ""

        if(idx_id !== -1){
          let start = 7;
          id = part.substring(start, start + 36)
          part = part.substring(start + 36)
          //console.log(id)
        }

        const idx_annotation = part.indexOf("@&^s$x+")
        let annot = ""

        if(idx_annotation !== -1){
          let start = 7 //start from id
          let len = part.substring(start, start + 3) //length of annotation
          annot = part.substring(start + 3, start + 3 + Number(len))
          part = part.substring(start + 3 + Number(len))
          //console.log(id)
        }

        // Text within markers
        return <Highlight key={index} id={id.toString()} annotation={annot}>{part}</Highlight>; //Use id as a markter for linking the annotation.
      }
      return part; // Regular text
    });
  };

  const processChildren = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') {
      return processText(children);
    }
    if (Array.isArray(children)) {
      return children.map((child, index) => (
        <React.Fragment key={index}>{processChildren(child)}</React.Fragment>
      ));
    }
    return children;
  };

  return <code dir="auto">{processChildren(children)}</code>;
};
