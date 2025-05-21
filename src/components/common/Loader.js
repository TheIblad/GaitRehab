import React from 'react';

function Loader({ fullScreen }) {
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>;
}

export default Loader;