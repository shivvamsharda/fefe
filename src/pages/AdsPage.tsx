
import React from 'react';

const AdsPage = () => {
  // The ads.txt content - you can modify this as needed
  const adsContent = `google.com, pub-6268690479548995, DIRECT, f08c47fec0942fa0`;

  return (
    <div style={{ 
      fontFamily: 'monospace', 
      whiteSpace: 'pre-wrap', 
      padding: 0, 
      margin: 0,
      fontSize: '12px',
      lineHeight: '1.2'
    }}>
      {adsContent}
    </div>
  );
};

export default AdsPage;
