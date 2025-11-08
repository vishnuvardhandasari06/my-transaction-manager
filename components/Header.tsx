
import React from 'react';
import { SettingsIcon } from './Icons';

interface HeaderProps {
    onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({ onOpenSettings }) => {
    return (
        <header className="bg-gradient-to-r from-accent-maroon to-red-900 shadow-lg">
            <div className="container mx-auto px-4 md:px-6 py-4 relative flex justify-center items-center">
                <div className="text-center">
                    <h1 
                        className="text-3xl md:text-4xl font-serif font-bold text-primary-gold select-none" 
                        style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}
                    >
                        NL Jewellers
                    </h1>
                    <p className="text-ivory/80 text-sm md:text-base mt-1">Precisely Crafted</p>
                </div>
                <button
                    onClick={onOpenSettings}
                    className="absolute right-4 md:right-6 text-ivory/70 hover:text-primary-gold transition-colors duration-200"
                    aria-label="Open settings"
                    title="Settings"
                >
                    <SettingsIcon />
                </button>
            </div>
        </header>
    );
});
