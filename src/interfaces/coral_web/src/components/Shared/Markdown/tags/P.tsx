import { ComponentPropsWithoutRef, useState, useRef, useEffect, useLayoutEffect } from 'react';
import React from 'react';
import { MESSAGE_LIST_CONTAINER_ID, useCalculateCitationStyles } from '@/hooks/citations';
import { CHAT_COMPOSER_TEXTAREA_ID } from '@/constants';
import StaticGenerationSearchParamsBailoutProvider from 'next/dist/client/components/static-generation-searchparams-bailout-provider';
import { left } from '@popperjs/core'; 
import { Highlight } from './Highlight';

export const P = ({ children }: ComponentPropsWithoutRef<'p'>) => {
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

  return <p dir="auto">{processChildren(children)}</p>;
};
