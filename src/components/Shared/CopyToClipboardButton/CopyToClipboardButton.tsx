import React, { useCallback } from 'react';

const handleCopy = async (text: string) => {
  try {
    // Try modern clipboard API first
    if (window?.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(text);
    } else {
      // Fallback to textarea method
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';  // Avoid scrolling to bottom
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    
    // Optional: Add success feedback
    console.log('Copied:', text);
  } catch (e) {
    console.error('Failed to copy:', e);
  }
};

const onClick = useCallback(
  (e: React.MouseEvent) => {
    e.preventDefault();
    handleCopy(value);
    onCopy?.(e);
  },
  [value, onCopy]
); 