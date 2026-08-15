import React from 'react';
import PairCodeEntry from './PairCodeEntry';

const CodeEntry = ({ onJoin, onPairSuccess }) => <PairCodeEntry onPairSuccess={onJoin || onPairSuccess} />;
export default CodeEntry;
