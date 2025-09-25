import React from 'react';

const ChatIntro = () => {
  return (
    <div className="chat-intro">
      <div className="chat-intro__content" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <div className="chat-intro__logo" style={{ marginBottom: '40px' }}>
          <img 
            src="/copilot-icon.svg" 
            alt="Copilot" 
            style={{ 
              width: '120px', 
              height: '120px', 
              margin: '0 auto',
              display: 'block'
            }}
          />
        </div>
        <h2>Hi there! I am Incorta Nexus. How can I help you today?</h2>
      </div>
    </div>
  );
};

export default ChatIntro;