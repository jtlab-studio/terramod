import React from 'react';
import MainLayout from './layouts/MainLayout';
import { useInfraStore } from './store/infraStore';
import { useUIStore } from './store/uiStore';

const App: React.FC = () => {
  return <MainLayout />;
};

export default App;
