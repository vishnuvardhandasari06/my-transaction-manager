import React from 'react';
import { DeleteIcon, CheckCircleIcon } from './Icons';

interface BulkActionsBarProps {
    count: number;
    onBulkDelete: () => void;
    onBulkMarkPaid: () => void;
    onClearSelection: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({ count, onBulkDelete, onBulkMarkPaid, onClearSelection }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-accent-maroon text-ivory p-4 shadow-lg z-50 transform transition-transform animate-slide-up">
            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
            `}</style>
            <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onClearSelection} className="text-ivory/80 hover:text-white p-1 rounded-full hover:bg-white/10" aria-label="Clear selection">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <span className="font-bold">{count} selected</span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={onBulkMarkPaid} className="flex items-center gap-2 text-ivory/90 hover:text-white font-semibold" aria-label="Mark selected as paid">
                        <CheckCircleIcon />
                        <span>Mark as Paid</span>
                    </button>
                    <button onClick={onBulkDelete} className="flex items-center gap-2 text-ivory/90 hover:text-white font-semibold" aria-label="Delete selected">
                        <DeleteIcon />
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(BulkActionsBar);
