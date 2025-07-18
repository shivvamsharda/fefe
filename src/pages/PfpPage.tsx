
import React from 'react';

const PfpPage = () => {
  const handleImageError = () => {
    console.log('Image failed to load:', '/cover.png');
  };

  const handleImageLoad = () => {
    console.log('Image loaded successfully');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <img
          src="/cover.png"
          alt="WenLive Logo"
          className="mx-auto max-w-full h-auto"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
        <p className="mt-4 text-sm text-muted-foreground">
          If you see this text but no image above, there may be an issue with the image path.
        </p>
      </div>
    </div>
  );
};

export default PfpPage;
