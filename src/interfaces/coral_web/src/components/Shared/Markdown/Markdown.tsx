import { ComponentPropsWithoutRef, useState, useEffect, ReactNode } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { PluggableList } from 'unified';

import { Text } from '@/components/Shared';
import { cn } from '@/utils';

import { renderRemarkCites } from './directives/cite';
import { remarkReferences } from './directives/code';
import { renderTableTools  } from './directives/table-tools';
import { renderRemarkUnknowns } from './directives/unknown';
import { P } from './tags/P';
import { CustomOl, CustomLi, CustomUl, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Title, dl, dd, dt, strong, em, td, th  } from './tags/list';
import { Code } from './tags/Code';
import { Pre } from './tags/Pre';
import { References } from './tags/References';

import 'highlight.js/styles/github-dark.css';

type MarkdownTextProps = {
  text: string;
  className?: string;
  customComponents?: Components;
  renderLaTex?: boolean;
  customRemarkPlugins?: PluggableList;
  customRehypePlugins?: PluggableList;
  allowedElements?: Array<string>;
  unwrapDisallowed?: boolean;
} & ComponentPropsWithoutRef<'div'>;

export const getActiveMarkdownPlugins = (
  renderLaTex?: boolean
): { remarkPlugins: PluggableList; rehypePlugins: PluggableList } => {
  const remarkPlugins: PluggableList = [
    // remarkGFm is a plugin that adds support for GitHub Flavored Markdown
    remarkGfm,
    // remarkDirective is a plugin that adds support for custom directives
    remarkDirective,
    // renderRemarkCites is a plugin that adds support for :cite[] directives
    renderRemarkCites,
    // renderRemarkUnknowns is a plugin that converts unrecognized directives to regular text nodes
    renderRemarkUnknowns,
    remarkReferences,
    // renderTableTools is a plugin that detects tables and saves them in a readable structure
    renderTableTools,
  ];

  const rehypePlugins: PluggableList = [[rehypeHighlight, { detect: true, ignoreMissing: true }]];

  if (renderLaTex) {
    // remarkMath is a plugin that adds support for math
    remarkPlugins.push([remarkMath, { singleDollarTextMath: false }]);
    // options: https://katex.org/docs/options.html
    rehypePlugins.push([rehypeKatex, { output: 'mathml' }]);
  }

  return { remarkPlugins, rehypePlugins };
};



/**
 * Convenience component to help apply the styling to markdown texts.
 */
export const Markdown = ({
  className = '',
  text, //preprocessed is passed
  customComponents,
  customRemarkPlugins = [],
  customRehypePlugins = [],
  renderLaTex = true,
  allowedElements,
  unwrapDisallowed,
  ...rest
}: MarkdownTextProps & { highlightedRanges?: { start: number; end: number }[] }) => {
  const { remarkPlugins, rehypePlugins } = getActiveMarkdownPlugins(renderLaTex);


  return (
    <Text
      as="div"
      dir="auto"
      className={cn(
        'prose max-w-none',
        'prose-p:my-0',
        'prose-ol:my-0 prose-ol:space-y-2 prose-ol:whitespace-normal',
        'prose-ul:my-0 prose-ul:space-y-2 prose-ul:whitespace-normal',
        'prose-li:my-0',
        'prose-pre prose-pre:mb-0 prose-pre:mt-0',
        'prose-code:!whitespace-pre-wrap prose-code:!bg-transparent prose-code:!p-0',
        'prose-headings:my-0',
        'prose-h1:font-medium prose-h2:font-medium prose-h3:font-medium prose-h4:font-medium prose-h5:font-medium prose-h6:font-medium prose-strong:font-medium',
        'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-base prose-h5:text-base prose-h6:text-base',
        className
      )}
      {...rest}
    >
      <ReactMarkdown
        remarkPlugins={[...remarkPlugins, ...customRemarkPlugins]}
        //rehypePlugins={[...rehypePlugins, ...customRehypePlugins]} //screw the code formatting!
        unwrapDisallowed={unwrapDisallowed}
        allowedElements={allowedElements}
        components={{
          pre: Pre, //copy for code
          ...customComponents,
          p: P, // CUSTOM P
          code: Code,
          td: td,
          th: th,
          li: CustomLi,
          ol: CustomOl,
          ul: CustomUl,
          h1: Heading1,
          h2: Heading2,
          h3: Heading3,
          h4: Heading4,
          h5: Heading5,
          h6: Heading6,
          title: Title,
          dl: dl,
          dt: dt,
          dd: dd,
          strong: strong,
          em: em,

        }}
      >
        {text} 
      </ReactMarkdown>
    </Text>
  );
};

export default Markdown;