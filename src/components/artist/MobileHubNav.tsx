import React from 'react';
import { LayoutDashboard, Music2, Wallet, Users, User, ArrowLeftRight } from 'lucide-react';

export const MobileHubNav = ({ activeTab, setActiveTab }: { activeTab: any, setActiveTab: (t: any) => void }) => {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'music', label: 'Music', icon: Music2 },
    { id: 'withdraw', label: 'Earnings', icon: Wallet },
    { id: 'fans', label: 'Fans', icon: Users },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <div className="lg:hidden flex overflow-x-auto space-x-2 py-3 px-4 bg-bg-surface border-b border-border-default sticky top-[-16px] md:top-[-32px] -mx-4 md:-mx-8 px-4 md:px-8 z-40 no-scrollbar">
      {navItems.map(item => {
        // Map transactions to Earnings conceptually, although they are separate tabs, activeTab could be transactions
        const isActive = activeTab === item.id || (item.id === 'withdraw' && activeTab === 'transactions');
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-sans transition-colors ${
              isActive 
                ? 'bg-smash-purple text-white' 
                : 'bg-bg-elevated text-text-muted hover:text-text-primary'
            }`}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
};
