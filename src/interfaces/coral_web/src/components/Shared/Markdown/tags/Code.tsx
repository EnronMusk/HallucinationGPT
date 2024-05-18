import { ComponentPropsWithoutRef } from 'react';
import React from 'react';

interface PropsWithChildren {
  children: React.ReactNode;
}

const Highlight = ({ children }: { children: React.ReactNode }) => {
  return <span className="bg-yellow-100">{children}</span>;
};

export const Code = ({ children }: ComponentPropsWithoutRef<'code'>) => {
  const processText = (text: string): React.ReactNode => {
    const parts = text.split(/(\[H\]|\[\/H\])/);
    return parts.map((part, index) => {
      if (part === '[H]' || part === '[/H]') {
        return null; // Ignore the markers themselves
      }
      if (index % 4 === 2) {
        // Text within markers
        return <Highlight key={index}>{part}</Highlight>;
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
