import React from 'react';
import ReactDOM from 'react-dom/client';
import { StakeholderChannelsTab } from './components/StakeholderChannelsTab';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <StakeholderChannelsTab />
  </React.StrictMode>
);
