import React from 'react';
import SwapList from './SwapList';

const SwapConsentCard = ({ currentUserRoll, studentRoll, onUpdate }) => {
  const roll = currentUserRoll || studentRoll;
  return <SwapList currentUserRoll={roll} onUpdate={onUpdate} />;
};

export default SwapConsentCard;
