
import React, { useState, useEffect, useRef } from 'react';
import { MenuIcon, SettingsIcon, StarIcon, CalculatorIcon } from './Icons';

interface HeaderProps {
    onOpenSettings: () => void;
    onOpenRateModal: () => void;
    onOpenCalculator: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({ onOpenSettings, onOpenRateModal, onOpenCalculator }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const handleRateClick = () => {
        onOpenRateModal();
        setIsMenuOpen(false);
    };

    const handleSettingsClick = () => {
        onOpenSettings();
        setIsMenuOpen(false);
    };

    const handleCalculatorClick = () => {
        onOpenCalculator();
        setIsMenuOpen(false);
    };

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
                {/* Menu Button and Dropdown */}
                <div className="absolute right-4 md:right-6" ref={menuRef}>
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="text-ivory/70 hover:text-primary-gold transition-colors duration-200"
                        aria-label="Open menu"
                        title="Menu"
                        aria-haspopup="true"
                        aria-expanded={isMenuOpen}
                    >
                        <MenuIcon />
                    </button>

                    {isMenuOpen && (
                        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-ivory ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="menu-button">
                                <button
                                    onClick={handleRateClick}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-text-main hover:bg-primary-gold/10"
                                    role="menuitem"
                                >
                                    <StarIcon />
                                    <span>Today's Rate</span>
                                </button>
                                <button
                                    onClick={handleCalculatorClick}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-text-main hover:bg-primary-gold/10"
                                    role="menuitem"
                                >
                                    <CalculatorIcon />
                                    <span>Calculator</span>
                                </button>
                                <button
                                    onClick={handleSettingsClick}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-text-main hover:bg-primary-gold/10"
                                    role="menuitem"
                                >
                                    <SettingsIcon />
                                    <span>Settings</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
});