import { useState, useRef } from 'react';
import React from 'react';

export const Highlight = ({ children, id, annotation }: { children: React.ReactNode, id: string, annotation:string }) => {
    const [isVisible, setIsVisible] = useState(false);
  
    return (
      <span id={id} className='highlight non-selectable' onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
        {children}
        {isVisible && (
          <span id={'tool'+id} className='tooltip non-selectable' aria-hidden='true' content={""}>
            {isVisible ? annotation: ""}
          </span>
        )}
      </span>
    );
  };
