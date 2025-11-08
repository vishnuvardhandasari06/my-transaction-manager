
import React from 'react';
import { Transaction, Customer } from '../types';
import TransactionForm from './TransactionForm';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Transaction) => void;
    existingTransaction: Transaction | null;
    customers: Customer[];
    onSaveNewCustomer: (customer: { name: string, phone: string }) => void;
    uniqueItems: string[];
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, existingTransaction, customers, onSaveNewCustomer, uniqueItems }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true">
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
            `}</style>
            <div 
                className="bg-ivory rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 md:p-6 border-b border-primary-gold/20 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-serif font-bold text-accent-maroon">
                        {existingTransaction ? 'Edit Entry' : 'Add New Entry'}
                    </h2>
                    <button onClick={onClose} className="text-text-main/60 hover:text-accent-maroon" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-4 md:p-6 overflow-y-auto">
                    <TransactionForm
                        onSave={onSave}
                        onCancel={onClose}
                        existingTransaction={existingTransaction}
                        customers={customers}
                        onSaveNewCustomer={onSaveNewCustomer}
                        uniqueItems={uniqueItems}
                    />
                </div>
            </div>
        </div>
    );
};

export default React.memo(TransactionModal);
