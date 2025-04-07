'use client';

import { v4 as uuidv4 } from 'uuid';
import { CohereClient } from '@/cohere-client';
import { env } from '@/env.mjs';

export const setCookie = (name: string, value: string, days: number) => {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
  }
};

export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }
  try {
    if (!document.cookie) {
      console.log('No cookies found');
      return null;
    }
    
    const cookies = document.cookie.split(';').reduce((acc, curr) => {
      if (!curr.includes('=')) return acc;
      const [key, value] = curr.trim().split('=');
      acc[key.trim()] = decodeURIComponent(value);
      return acc;
    }, {} as Record<string, string>);
    
    return cookies[name] || null;
  } catch (e) {
    console.error('Error reading cookie:', e);
    return null;
  }
};

export const setLocalStorage = (key: string, value: string) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

export const getLocalStorage = (key: string): string | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error('Error accessing localStorage:', e);
    return null;
  }
};

export const getUserId = (): { userId: string } => {
  const userIdKey = 'user-id';
  let userId = getLocalStorage(userIdKey) || getCookie(userIdKey);

  console.log('Cookie:', getCookie(userIdKey));

  console.log('User ID FOUND:', userId);
  
  if (!userId) {
      console.log('Creating new user ID');
      userId = uuidv4().toString();
      setLocalStorage(userIdKey, userId);
      setCookie(userIdKey, userId, 500);
  }
  
  return { userId };
};

export const hasAcceptedUserAgreement = () => {
    // console.log('Checking user agreement...');
    // console.log('Full cookie string:', document.cookie);  // Log the full cookie string
  
  const localValue = localStorage.getItem('user-agreement-accepted');
  
  // More explicit cookie parsing
  const cookies = document.cookie.split(';').reduce((acc, curr) => {
    const [key, value] = curr.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  
    // console.log('All cookies:', cookies);
    // console.log('Local storage:', localValue);
    // console.log('Specific cookie value:', cookies['user-agreement-accepted']);
    
  const hasAccepted = localValue === 'true' || cookies['user-agreement-accepted'] === 'true';
  // console.log('Final acceptance status:', hasAccepted);
  
  return hasAccepted;
};

export const acceptUserAgreement = () => {
  localStorage.setItem('user-agreement-accepted', 'true');
  // Set cookie with explicit path and expiry
  document.cookie = `user-agreement-accepted=true; path=/; max-age=31536000; SameSite=Strict`;
};

export const acceptCookies = () => {
  localStorage.setItem('cookie-preferences', 'true');
  // Set cookie with explicit path and expiry
  document.cookie = `cookie-preferences=true; path=/; max-age=31536000; SameSite=Strict`;
};

export const rejectCookies = () => {
  // Clear non-essential cookies/storage
  localStorage.removeItem('cookie-preferences');
  
  // Keep user agreement as it's essential for site functionality
  // localStorage.removeItem('userAgreement'); -- Don't remove this

  // Clear optional cookies
  document.cookie.split(";").forEach(cookie => {
    const name = cookie.split("=")[0].trim();
    if (name !== 'userAgreement') { // Preserve essential cookies
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    }
  });
};

export const hasAcceptedCookies = () => {
  const localValue = localStorage.getItem('cookie-preferences');
  const cookies = document.cookie.split(';').reduce((acc, curr) => {
    const [key, value] = curr.trim().split('=');
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  return localValue === 'true' || cookies['cookie-preferences'] === 'true';
};