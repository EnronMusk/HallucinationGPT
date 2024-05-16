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
import { renderTableTools } from './directives/table-tools';
import { renderRemarkUnknowns } from './directives/unknown';
import { P } from './tags/P';
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
  text,
  customComponents,
  customRemarkPlugins = [],
  customRehypePlugins = [],
  renderLaTex = true,
  allowedElements,
  unwrapDisallowed,
  highlightedRanges = [],
  ...rest
}: MarkdownTextProps & { highlightedRanges?: { start: number; end: number }[] }) => {
  const { remarkPlugins, rehypePlugins } = getActiveMarkdownPlugins(renderLaTex);

// Function to insert highlight markers into text based on ranges
const insertHighlightMarkers = (text: string, ranges: { start: number; end: number }[]) => {
  let highlightedText = '';
  let currentIndex = 0;

  ranges.forEach(range => {
    // Add the text before the range
    highlightedText += text.substring(currentIndex, range.start);
    // Add the start marker for the highlighted text
    highlightedText += '[[HIGHLIGHT]]';
    // Add the highlighted text
    highlightedText += text.substring(range.start, range.end);
    // Add the end marker for the highlighted text
    highlightedText += '[[/HIGHLIGHT]]';
    currentIndex = range.end;
  });

  // Add the remaining text after the last range
  highlightedText += text.substring(currentIndex);

  return highlightedText;
};

  const processedText = insertHighlightMarkers(text, highlightedRanges);

    // Function to override the style for highlighted text
    const overrideHighlightStyle = (props: any) => {
      // Check if the text is inside a highlighted section
      if (props.node && props.node.type === 'text' && props.node.value === '[[HIGHLIGHT]]') {
        return <code className='bg-yellow-100'>{props.children}</code>;
      }
      // Return the default rendering
      return <span {...props} />;
    };

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
        rehypePlugins={[...rehypePlugins, ...customRehypePlugins]}
        unwrapDisallowed={unwrapDisallowed}
        allowedElements={allowedElements}
        components={{
          pre: Pre,
          ...customComponents,
          p: P, // CUSTOM P
          code: overrideHighlightStyle,
        }}
      >
        {processedText}
      </ReactMarkdown>
    </Text>
  );
};

export default Markdown;