import React from 'react';
import FloorsManagement from './FloorsManagement';

const FloorManager = ({ initialBlock, onBackToBlocks, onNavigateToRooms }) => {
  return (
    <FloorsManagement
      initialBlock={initialBlock}
      onBackToBlocks={onBackToBlocks}
      onNavigateToRooms={onNavigateToRooms}
    />
  );
};

export default FloorManager;
