import React, { useState } from 'react';
import { Outlet } from '@remix-run/react';
import { Link } from '@remix-run/react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('integrations');
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="flex border-b mb-6">
        <Link 
          to="/settings/integrations"
          className={`px-4 py-2 ${activeTab === 'integrations' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('integrations')}
        >
          Integrations
        </Link>
      </div>
      
      <Outlet />
    </div>
  );
}