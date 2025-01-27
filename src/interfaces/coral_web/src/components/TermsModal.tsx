'use client';

import React, { useEffect, useState } from 'react';
import { Markdown } from '@/components/Shared';
import { hasAcceptedUserAgreement, acceptUserAgreement } from '@/pages_old/cookies';

interface UserAgreementModalProps {
  onAccept?: () => void;
}

export const TermsModal: React.FC<{ onAccept: () => void }> = ({ onAccept }) => {
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    const hasAccepted = hasAcceptedUserAgreement();
    if (!hasAccepted) {
      setShowTerms(true);
    }
  }, []);

  const handleAcceptClick = () => {
    if (window.confirm('Are you sure you want to accept the user agreement?')) {
      onAccept();
    }
  };

  if (!showTerms) return null;

  return (
    <div className="modal bg-marble-100">
      <div className="modal-content rounded-lg border border-marble-400">
        <span className="modal-title" style={{ fontFamily: 'Cambria', fontSize: '25px', fontWeight: 'bold' }}>
          WildChat User Agreement
        </span>
        <hr style={{ paddingTop: '0.5rem', paddingBottom: '0.2rem'}}/>
        <div className="modal-body">
          <Markdown 
            style={{ fontSize: '15px' }} 
            text={`By using our app, which is powered by Cohere's API, you agree to the following terms regarding the data you provide:\n\n\u200B\n\n1. **Collection:** We may collect information, including all prompts you provide, model outputs, and annotations.\n\n2. **Use:** We may use the collected data for research purposes, to improve our services, and to develop new products or services, including commercial applications, and for security purposes, such as protecting against unauthorized access and attacks.\n\n3. **Sharing and Publication:** Your data, including prompts and annotations, may be published, shared with third parties, or used for analysis and reporting purposes.\n\n4. **Data Retention:** We may retain your data, for as long as necessary.\n\n\u200B\n\nBy continuing to use our app, you provide your explicit consent to the collection, use, and potential sharing of your data as described above. If you do not agree with our data collection, use and sharing practices, please do not use our app.\n\n\u200B\n\n`}
          />
        </div>
        <div className="button-container">
          <button 
            className="accept-button" 
            onClick={handleAcceptClick} 
            style={{fontWeight: 'bold', fontFamily: 'Cambria', fontSize: '25px'}}
          >
            I Accept
          </button>
        </div>
      </div>
      <style jsx>{`
        .modal {
          position: fixed;
          border: #E0E0E0;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          text-align: left;
          max-width: 600px;
          width: 90%;
          box-sizing: border-box;
        }
        .modal-title {
          display: block;
          text-align: center;
          margin-bottom: 10px
        }
        .modal-body {
          text-align: left;
        }
        .button-container {
          text-align: center;
        }
        .accept-button {
          background-color: #9E9E9E;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.3s;
        }
        .accept-button:hover {
          background-color: #424242;
        }
      `}</style>
    </div>
  );
}; 