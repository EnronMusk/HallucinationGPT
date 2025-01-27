import { v4 as uuidv4 } from 'uuid';
import { CohereClient } from '@/cohere-client';

 const setCookie = (name: string, value: string, days: number) => {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
  }
  };
  
   const getCookie = (name: string) => {
    if (typeof document === 'undefined') {
      return null;
    }

    return document.cookie.split('; ').reduce((r, v) => {
      const parts = v.split('=');
      return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
  };


   const setLocalStorage = (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  };
  
   const getLocalStorage = (key: string) => {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  };
  
  export const getUserId = () => {
    const userIdKey = 'user-id';
    let userId = getLocalStorage(userIdKey) || getCookie(userIdKey);
    
    if (!userId) {
      userId = uuidv4().toString();
      setLocalStorage(userIdKey, userId);
      setCookie(userIdKey, userId, 365);
    }
    
    return userId;
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