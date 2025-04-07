'use client';

import React, { useState, useEffect } from 'react';
import { TermsModal } from './TermsModal';
import { hasAcceptedUserAgreement, acceptUserAgreement, hasAcceptedCookies, acceptCookies, rejectCookies } from '@/pages_old/cookies';
import CookieBanner from '@/pages_old/CookieBanner';

export const TermsWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showUserAgreement, setShowUserAgreement] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  useEffect(() => {
    const hasAccepted = hasAcceptedUserAgreement();
    console.log('Has accepted terms:', hasAccepted);
    if (!hasAccepted) {
      console.log('Setting show terms to true');
      setShowUserAgreement(true);
    }
  }, []);

  useEffect(() => {
    const hasAcceptedCookiesValue = hasAcceptedCookies();
    if (!hasAcceptedCookiesValue) {
      setShowCookieBanner(true);
    }
  }, []);

  console.log('Current showUserAgreement state:', showUserAgreement);

  const handleAcceptUserAgreement = () => {
    acceptUserAgreement();
    setShowUserAgreement(false);
  };

  const handleAcceptCookies = () => {
    acceptCookies();
    setShowCookieBanner(false);
  };

  const handleRejectCookies = () => {
    console.log('Rejecting cookies');
    rejectCookies();
    setShowCookieBanner(false);
  };

  return (
    <>
      {!showUserAgreement && children}
      {showUserAgreement && <TermsModal onAccept={handleAcceptUserAgreement} />}
      {showCookieBanner && !showUserAgreement && <CookieBanner onAccept={handleAcceptCookies} onReject={handleRejectCookies} />}
    </>
  );
}; 