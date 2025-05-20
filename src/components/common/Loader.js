import React from 'react';

// Shows a spinning circle when something is loading
function Loader({ fullScreen }) {
  // Show a big spinner in the middle of the screen
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show a small spinner where it's needed
  return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>;
}

export default Loader;