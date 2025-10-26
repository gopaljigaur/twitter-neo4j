'use client';

import React from 'react';

interface ClickableTextProps {
  text: string;
  onUserClick?: (username: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  className?: string;
}

export default function ClickableText({
  text,
  onUserClick,
  onHashtagClick,
  className = '',
}: ClickableTextProps) {
  const parseText = (input: string) => {
    const parts: { text: string; type: 'text' | 'user' | 'hashtag' | 'url' }[] =
      [];
    // Match URLs, @mentions, and #hashtags
    const regex = /(https?:\/\/\S+)|(@\w+)|(#\w+)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(input)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push({
          text: input.slice(lastIndex, match.index),
          type: 'text',
        });
      }

      // Add the match
      if (match[1]) {
        // URL
        parts.push({
          text: match[1],
          type: 'url',
        });
      } else if (match[2]) {
        // Username
        parts.push({
          text: match[2],
          type: 'user',
        });
      } else if (match[3]) {
        // Hashtag
        parts.push({
          text: match[3],
          type: 'hashtag',
        });
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < input.length) {
      parts.push({
        text: input.slice(lastIndex),
        type: 'text',
      });
    }

    return parts;
  };

  const parts = parseText(text);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'url') {
          // Hide URLs from tweet text - they'll be shown as a button
          return null;
        } else if (part.type === 'user' && onUserClick) {
          return (
            <button
              key={index}
              onClick={() => onUserClick(part.text.replace('@', ''))}
              className="text-blue-500 hover:text-blue-600 hover:underline font-medium cursor-pointer bg-transparent border-none p-0"
            >
              {part.text}
            </button>
          );
        } else if (part.type === 'hashtag' && onHashtagClick) {
          return (
            <button
              key={index}
              onClick={() => onHashtagClick(part.text.replace('#', ''))}
              className="text-purple-500 hover:text-purple-600 hover:underline font-medium cursor-pointer bg-transparent border-none p-0"
            >
              {part.text}
            </button>
          );
        } else {
          return <span key={index}>{part.text}</span>;
        }
      })}
    </span>
  );
}
