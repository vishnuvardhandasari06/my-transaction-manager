
import React, { useState, useEffect } from 'react';

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (url: string) => void;
    initialUrl: string;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, onSave, initialUrl }) => {
    const [url, setUrl] = useState(initialUrl);

    useEffect(() => {
        if (isOpen) {
            setUrl(initialUrl);
        }
    }, [isOpen, initialUrl]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(url);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity">
            <div className="bg-ivory rounded-lg shadow-xl transform transition-all sm:my-8 sm:max-w-2xl sm:w-full mx-4">
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <h3 className="text-xl font-serif text-accent-maroon border-b border-primary-gold/20 pb-4" id="modal-title">
                        Google Sheets Sync Settings
                    </h3>
                    <div className="mt-4 text-sm text-text-main/90 space-y-4">
                        <p>
                            Automatically sync your data to a Google Sheet by setting up a Google Apps Script Web App. Follow the instructions provided by the developer.
                        </p>
                        <p className="font-semibold">
                            Once set up, paste the "Web app URL" you receive from Google below.
                        </p>
                        <div>
                            <label htmlFor="sheets-url" className="block text-sm font-medium text-text-main">Web App URL</label>
                            <input
                                type="url"
                                id="sheets-url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-ivory/50 border border-primary-gold/50 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm"
                                placeholder="https://script.google.com/macros/s/..."
                            />
                        </div>
                    </div>
                </div>
                <div className="bg-ivory/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-gold text-base font-medium text-text-main hover:bg-button-hover-gold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-gold sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={handleSave}
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
            </div>
        </div>
    );
};

export default React.memo(SettingsDialog);
