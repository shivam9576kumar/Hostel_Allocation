import React from 'react';
import BlocksManagement from './BlocksManagement';

const BlockManager = ({ onNavigateToFloors }) => {
  return <BlocksManagement onNavigateToFloors={onNavigateToFloors} />;
};

export default BlockManager;
