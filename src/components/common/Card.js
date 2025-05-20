import React from 'react';
import './Card.css';

// A box that can hold other things and has a title
function Card({ children, className = '', title }) {
  return (
    <div className={`card ${className}`}>
      {title && <h3 className="card-title">{title}</h3>}
      <div className="card-content">{children}</div>
    </div>
  );
}

export default Card;
