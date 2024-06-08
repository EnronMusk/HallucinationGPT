import React from 'react';
import { Markdown } from '@/components/Shared';

interface UserAgreementModalProps {
  onAccept: () => void;
}

const UserAgreementModal: React.FC<UserAgreementModalProps> = ({ onAccept }) => {
    return (
        <div className="modal bg-marble-100">
          <div className="modal-content rounded-lg border border-marble-400">
            <span className="modal-title" style={{ fontFamily: 'Cambria', fontSize: '25px', fontWeight: 'bold' }}>WildChat User Agreement</span>
            <hr style={{ paddingTop: '0.5rem', paddingBottom: '0.2rem'}}/>
            <div className="modal-body">
              <Markdown 
                style={{ fontSize: '15px' }} 
                text={`By using our app, which is powered by OpenAI's API, you agree to the following terms regarding the data you provide:\n\n\u200B\n\n1. **Collection:** We may collect information, including all prompts you provide, model outputs, and annotations.\n\n2. **Use:** We may use the collected data for research purposes, to improve our services, and to develop new products or services, including commercial applications, and for security purposes, such as protecting against unauthorized access and attacks.\n\n3. **Sharing and Publication:** Your data, including prompts and annotations, may be published, shared with third parties, or used for analysis and reporting purposes.\n\n4. **Data Retention:** We may retain your data, for as long as necessary.\n\n\u200B\n\nBy continuing to use our app, you provide your explicit consent to the collection, use, and potential sharing of your data as described above. If you do not agree with our data collection, use and sharing practices, please do not use our app.\n\n\u200B\n\n`}
              />
            </div>
            <div className="button-container">
            <button className="accept-button" onClick={onAccept} style={{fontWeight: 'bold', fontFamily: 'Cambria', fontSize: '25px'}}>I Accept</button>
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
            }
            .modal-content {
              background: white;
              padding: 20px;
              border-radius: 8px;
              text-align: left; /* Default to left-align content */
              max-width: 600px; /* Adjust this value as needed */
              width: 90%; /* Ensure it is responsive */
              box-sizing: border-box; /* Include padding in the width calculation */
            }
            .modal-title {
              display: block;
              text-align: center; /* Center the title */
              margin-bottom: 10px
            }
            .modal-body {
              text-align: left; /* Ensure the body content is left-aligned */
            }
            .button-container {
                text-align: center; /* Center the button */
            }
            .accept-button {
                background-color: #9E9E9E; /* Initial background color */
                color: white; /* Text color */
                border: none; /* Remove border */
                padding: 10px 20px; /* Padding for size */
                border-radius: 5px; /* Rounded corners */
                cursor: pointer; /* Pointer cursor on hover */
                font-size: 16px; /* Font size */
                transition: background-color 0.3s; /* Smooth transition for background color */

              }

              .accept-button:hover {
                background-color: #424242; /* Background color on hover */
              }

          `}</style>
        </div>
      );
    };

export default UserAgreementModal;
