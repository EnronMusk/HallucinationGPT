import { v4 as uuidv4 } from 'uuid';

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
      setCookie(userIdKey, userId, 365); // Store cookie for 7 days
    }
    return userId;
  };

  export const hasAcceptedUserAgreement = () => {
    return getLocalStorage('user-agreement-accepted') === 'true' || getCookie('user-agreement-accepted') === 'true';
  };
  
  export const acceptUserAgreement = () => {
    setLocalStorage('user-agreement-accepted', 'true');
    setCookie('user-agreement-accepted', 'true', 7); // Store for 1 year
  };