import { ComponentPropsWithoutRef } from 'react';
import React from 'react';
import { cn } from '@/utils';
import { Highlight } from './Highlight';

interface PropsWithChildren {
  children: React.ReactNode;
}

const processText = (text: string): React.ReactNode => {
  const parts = text.split(/(\[H\]|\[\/H\])/);
  return parts.map((part, index) => {
    if (part === '[H]' || part === '[/H]') {
      return null; // Ignore the markers themselves
    }
    if (index % 4 === 2) {
      const idx_id = part.indexOf("+#$s^&@") //Grab idx for the secret id to assign.
      let id = ""

      if(idx_id !== -1){
        let start = 7;
        id = part.substring(start, start + 36)
        part = part.substring(start + 36)
        //console.log(id)
      }

      const idx_annotation = part.indexOf("@&^s$#+")
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



export const CustomUl = ({ children }: ComponentPropsWithoutRef<"ul">) => (
  <ul>{processChildren(children)}</ul>
);

export const CustomOl = ({ children }: ComponentPropsWithoutRef<'ol'>) => (
  <ol>{processChildren(children)}</ol>
);

export const CustomLi = ({ children }: ComponentPropsWithoutRef<'li'>) => (
  <li>{processChildren(children)}</li>
);

export const Heading1 = ({ children }: ComponentPropsWithoutRef<'h1'>) => (
  <h1>{processChildren(children)}</h1>
);

export const Heading2 = ({ children }: ComponentPropsWithoutRef<'h2'>) => (
  <h2>{processChildren(children)}</h2>
);

export const Heading3 = ({ children }: ComponentPropsWithoutRef<'h3'>) => (
  <h3>{processChildren(children)}</h3>
);

export const Heading4 = ({ children }: ComponentPropsWithoutRef<'h4'>) => (
  <h4>{processChildren(children)}</h4>
);

export const Heading5 = ({ children }: ComponentPropsWithoutRef<'h5'>) => (
  <h5>{processChildren(children)}</h5>
);

export const Heading6 = ({ children }: ComponentPropsWithoutRef<'h6'>) => (
  <h6>{processChildren(children)}</h6>
);

export const Title = ({ children }: ComponentPropsWithoutRef<'title'>) => (
  <title>{processChildren(children)}</title>
);

export const dl = ({ children }: ComponentPropsWithoutRef<'dl'>) => (
  <dl>{processChildren(children)}</dl>
);

export const dd = ({ children }: ComponentPropsWithoutRef<'dd'>) => (
  <dd>{processChildren(children)}</dd>
);

export const dt = ({ children }: ComponentPropsWithoutRef<'dt'>) => (
  <dt>{processChildren(children)}</dt>
);

export const strong = ({ children }: ComponentPropsWithoutRef<'strong'>) => (
  <strong>{processChildren(children)}</strong>
);

export const em = ({ children }: ComponentPropsWithoutRef<'em'>) => (
  <em>{processChildren(children)}</em>
);

export const td = ({ children }: ComponentPropsWithoutRef<'td'>) => (
  <td>{processChildren(children)}</td>
);

export const th = ({ children }: ComponentPropsWithoutRef<'th'>) => (
  <th>{processChildren(children)}</th>
);


