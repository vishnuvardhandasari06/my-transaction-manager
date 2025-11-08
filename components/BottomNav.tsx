
import React from 'react';
import { PlusCircleIcon, ExportIcon } from './Icons';

interface BottomNavProps {
    onAddNew: () => void;
    onExport: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onAddNew, onExport }) => {
    return (
        <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-ivory/95 backdrop-blur-sm border-t border-primary-gold/20 shadow-lg z-40">
            <div className="flex justify-around items-center h-16">
                <button 
                    onClick={onAddNew}
                    className="flex flex-col items-center justify-center text-text-main/80 hover:text-accent-maroon transition-colors -mt-8"
                >
                    <div className="bg-primary-gold text-text-main rounded-full p-3 shadow-lg border-4 border-ivory">
                       <PlusCircleIcon />
                    </div>
                    <span className="text-xs mt-1 font-bold">New Entry</span>
                </button>
                <button 
                    onClick={onExport} 
                    className="flex flex-col items-center justify-center text-text-main/80 hover:text-accent-maroon transition-colors"
                >
                    <ExportIcon />
                    <span className="text-xs mt-1">Export</span>
                </button>
            </div>
        </footer>
    );
};

export default React.memo(BottomNav);
