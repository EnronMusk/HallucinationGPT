'use client';

import React, { useState, useEffect } from 'react';
import { TermsModal } from './TermsModal';
import { hasAcceptedUserAgreement, acceptUserAgreement } from '@/pages_old/cookies';

export const TermsWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showUserAgreement, setShowUserAgreement] = useState(false);

  useEffect(() => {
    const hasAccepted = hasAcceptedUserAgreement();
    console.log('Has accepted terms:', hasAccepted);
    if (!hasAccepted) {
      console.log('Setting show terms to true');
      setShowUserAgreement(true);
    }
  }, []);

  console.log('Current showUserAgreement state:', showUserAgreement);

  const handleAcceptUserAgreement = () => {
    acceptUserAgreement();
    setShowUserAgreement(false);
  };

  return (
    <>
      {!showUserAgreement && children}
      {showUserAgreement && <TermsModal onAccept={handleAcceptUserAgreement} />}
    </>
  );
}; 