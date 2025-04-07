import React from 'react';

interface CookieBannerProps {
  onAccept: () => void;
  onReject: () => void;
}

const CookieBanner: React.FC<CookieBannerProps> = ({ onAccept, onReject }) => {
  return (
    <div className="cookie-banner">
      <div className="cookie-content">
        <span className="cookie-text">
          We use cookies to allow you to revisit your conversations. By continuing to use Chat Annotator, you consent to our cookie policy.
        </span>
        <div className="button-group">
          <button className="reject-button" onClick={onReject}>
            Reject
          </button>
          <button 
            onClick={onAccept} 
            className="accept-button bg-primary-100"
          >
            Accept
          </button>
        </div>
      </div>
      <style jsx>{`
        .cookie-banner {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: rgba(255, 255, 255, 0.95);
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          padding: 12px;
          backdrop-filter: blur(10px);
          max-height: 40vh;
          overflow-y: auto;
        }

        .cookie-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .cookie-text {
          font-size: 14px;
          color: #4A4A4A;
          line-height: 1.5;
        }

        .button-group {
          display: flex;
          gap: 10px;
        }

        .accept-button, .reject-button {
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          transition: background-color 0.3s;
        }

        .accept-button {
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        .accept-button:hover {
          background-color: #424242;
          color: white;
        }

        .reject-button {
          background-color: transparent;
          color: #4A4A4A;
          border: 1px solid #9E9E9E;
        }

        .reject-button:hover {
          background-color: #f5f5f5;
        }

        @media (max-width: 640px) {
          .cookie-banner {
            padding: 12px 8px;
          }
          
          .cookie-content {
            flex-direction: column;
            text-align: center;
            gap: 12px;
            align-items: stretch;
          }

          .button-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .cookie-text {
            font-size: 13px;
          }

          .accept-button, .reject-button {
            padding: 10px 16px;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default CookieBanner; 