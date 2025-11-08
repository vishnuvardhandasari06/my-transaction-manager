
import React, { useState, useEffect } from 'react';

interface AddItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newItem: string) => void;
    existingItems: string[];
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({ isOpen, onClose, onSave, existingItems }) => {
    const [item, setItem] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setItem('');
            setError('');
        }
    }, [isOpen]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedItem = item.trim();
        if (!trimmedItem) {
            setError('Item name cannot be empty.');
            return;
        }
        if (existingItems.some(i => i.toLowerCase() === trimmedItem.toLowerCase())) {
            setError(`The item "${trimmedItem}" already exists.`);
            return;
        }
        onSave(trimmedItem);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="bg-ivory rounded-lg shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full mx-4">
                <form onSubmit={handleSave}>
                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 rounded-t-lg">
                        <div className="sm:flex sm:items-start">
                             <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-accent-maroon/10 sm:mx-0 sm:h-10 sm:w-10">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent-maroon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium font-serif text-text-main" id="modal-title">
                                    Add New Item
                                </h3>
                                <div className="mt-4">
                                    <label htmlFor="new-item" className="sr-only">New Item</label>
                                    <input
                                        type="text"
                                        id="new-item"
                                        value={item}
                                        onChange={(e) => {
                                            setItem(e.target.value);
                                            if (error) setError('');
                                        }}
                                        className="block w-full px-3 py-2 bg-ivory/50 border border-primary-gold/50 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm"
                                        placeholder="Enter the new item name"
                                        autoFocus
                                    />
                                    {error && <p className="mt-2 text-sm text-highlight-red">{error}</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-ivory/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                        <button
                            type="submit"
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-gold text-base font-medium text-text-main hover:bg-button-hover-gold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-gold sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-text-main hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-gold sm:mt-0 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default React.memo(AddItemDialog);
