import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { Transaction, Customer, Item, TransactionStatus, Purity } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDebounce } from './hooks/useDebounce';
import TransactionTable from './components/TransactionTable';
import SearchBar from './components/SearchBar';
import { Header } from './components/Header';
import { PlusIcon, ExportIcon, JournalIcon, SettingsIcon } from './components/Icons';
import BottomNav from './components/BottomNav';

// Lazy load modal components to reduce initial bundle size.
const TransactionModal = lazy(() => import('./components/TransactionModal'));
const SettingsDialog = lazy(() => import('./components/SettingsDialog'));
const ConfirmationDialog = lazy(() => import('./components/ConfirmationDialog'));

// A simple fallback component for suspense.
const SuspenseFallback = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="text-white text-lg">Loading...</div>
    </div>
);

// Define a type for managing all modals from a single state object.
type ModalType =
  | { type: 'TRANSACTION_FORM'; transaction: Transaction | null }
  | { type: 'CONFIRM_DELETE'; transactionId: string }
  | { type: 'SETTINGS' };

const App: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [purityFilter, setPurityFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [sheetsUrl, setSheetsUrl] = useLocalStorage<string>('sheetsUrl', '');
    const [loading, setLoading] = useState(true);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 8000); // Increased timeout for better readability of complex error messages
    }, []);

    const fetchData = useCallback(async (options?: { quiet?: boolean }) => {
        if (!sheetsUrl) {
            setLoading(false);
            return;
        }
        if (!options?.quiet) {
            setLoading(true);
        }
        try {
            const response = await fetch(sheetsUrl);
            if (!response.ok) throw new Error(`Network response was not ok (${response.status}). Check script deployment permissions.`);
            
            const data = await response.json();
            const { transactions: fetchedTransactions, customers: fetchedCustomers, items: fetchedItems } = data;
            
            const activeTransactions = (Array.isArray(fetchedTransactions) ? fetchedTransactions : [])
                .filter(t => t.status !== TransactionStatus.Deleted)
                .map((t): Transaction => ({
                    ...t,
                    // Ensure 'quality' is consistently a string. Google Sheets may return it as a number
                    // if the cell content is purely numeric (e.g., 916), which causes errors with
                    // string methods like .trim() and breaks strict equality checks (e.g., 916 !== '916').
                    quality: (t.quality != null ? String(t.quality) : '') as Purity | '',
                }));

            setTransactions(activeTransactions);
            setCustomers(Array.isArray(fetchedCustomers) ? fetchedCustomers : []);
            setItems(Array.isArray(fetchedItems) ? fetchedItems : []);
            
            if (!options?.quiet) {
                showNotification('Data synced with Google Sheets.', 'success');
            }
        } catch (error: any) {
            console.error('Failed to fetch data from Google Sheets:', error);
            let errorMessage: string;
    
            if (error instanceof SyntaxError) {
                errorMessage = 'Failed to parse response from Google Sheets. The script might not be returning valid JSON. Please check the script code and its deployment.';
            } else if (error instanceof TypeError) {
                if (error.message.includes('Invalid URL')) {
                    errorMessage = 'The Google Sheets URL is invalid. Please check the URL format in Settings.';
                } else { // Catches "Failed to fetch" which is often network or CORS
                    errorMessage = 'Network Error: Could not connect. This might be a CORS issue or loss of internet. Please check deployment settings (especially "Who has access") and your connection.';
                }
            } else if (error.message.includes('Network response was not ok')) {
                // Extract status code from the error message, e.g., "Network response was not ok (404)..."
                const match = error.message.match(/\((\d{3})\)/);
                if (match) {
                    const status = parseInt(match[1], 10);
                    switch (status) {
                        case 401:
                        case 403:
                            errorMessage = `Permission Error (${status}): Access denied. Ensure script is deployed with "Execute as: Me" and "Who has access: Anyone". You may need to re-deploy.`;
                            break;
                        case 404:
                            errorMessage = `Not Found (${status}): The Web App URL is incorrect. Please double-check it in Settings.`;
                            break;
                        case 302: // Google often redirects to a login page if auth is wrong
                            errorMessage = `Redirect Error (302): This may mean you need to re-authorize the script or redeploy with correct permissions.`;
                            break;
                        default:
                            if (status >= 500) {
                                errorMessage = `Server Error (${status}): The Google Apps Script failed. Check the script for errors in your Google account's script editor.`;
                            } else {
                                errorMessage = `Connection failed with status ${status}. Please verify your URL and deployment settings.`;
                            }
                    }
                } else {
                    errorMessage = 'Connection to Google Sheets failed. Please verify your Web App URL and deployment permissions.';
                }
            } else {
                errorMessage = `An unexpected error occurred: ${error.message}`;
            }
            
            showNotification(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    }, [sheetsUrl, showNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const postToSheet = useCallback(async (action: string, payload: any): Promise<boolean> => {
        if (!sheetsUrl) {
            showNotification('Please set up Google Sheets URL in settings to save data.', 'error');
            return false;
        }
        setLoading(true);
        try {
            const response = await fetch(sheetsUrl, {
                method: 'POST',
                headers: {
                    // IMPORTANT: Use 'text/plain' to avoid CORS preflight (OPTIONS) requests
                    // that Google Apps Script does not handle well. The script on the server
                    // side will then parse this text body as JSON.
                    'Content-Type': 'text/plain',
                },
                body: JSON.stringify({ action, payload }),
            });

            if (!response.ok) {
                throw new Error(`Server error (${response.status}). Please check your Google Apps Script and its deployment settings.`);
            }

            const result = await response.json();
            if (result.status !== 'success' && result.result !== 'success') {
                throw new Error(`The script reported an issue: ${result.message || 'Unknown error'}`);
            }

            await fetchData({ quiet: true });
            return true;
        } catch (error: any) {
            console.error(`Failed to perform action ${action}:`, error);
            const friendlyAction = action.replace(/_/g, ' ').toLowerCase();
            let errorMessage = `Failed to ${friendlyAction}. An unexpected error occurred.`;

            if (error instanceof TypeError) { // This often indicates a CORS or network issue
                errorMessage = `Action failed due to a network error (likely CORS). Please double-check the script deployment instructions and ensure you are using the provided Apps Script code from Settings.`;
            } else if (error instanceof SyntaxError) {
                errorMessage = `Received an invalid response from the server when trying to ${friendlyAction}.`;
            } else {
                errorMessage = error.message;
            }
            showNotification(errorMessage, 'error');
            setLoading(false);
            return false;
        }
    }, [sheetsUrl, fetchData, showNotification]);


    const handleSave = useCallback(async (transaction: Transaction) => {
        const isEditing = transactions.some(t => t.id === transaction.id);
        const success = await postToSheet('SAVE_TRANSACTION', transaction);
        if (success) {
            showNotification(isEditing ? 'Data updated successfully!' : 'New entry added successfully!');
            setActiveModal(null);
        }
    }, [transactions, postToSheet, showNotification]);

    const handleEdit = useCallback((id: string) => {
        const transactionToEdit = transactions.find(t => t.id === id);
        if (transactionToEdit) {
            setActiveModal({ type: 'TRANSACTION_FORM', transaction: transactionToEdit });
        }
    }, [transactions]);

    const handleDelete = useCallback((id: string) => {
        setActiveModal({ type: 'CONFIRM_DELETE', transactionId: id });
    }, []);

    const handleShareViaWhatsApp = useCallback((id: string) => {
        const transaction = transactions.find(t => t.id === id);
        if (!transaction) {
            showNotification('Transaction not found.', 'error');
            return;
        }
    
        const customer = customers.find(c => c.name === transaction.name);
        if (!customer || !customer.phone) {
            showNotification(`Phone number for ${transaction.name} is not available. Please add it to the customer's details.`, 'error');
            return;
        }
        
        const customerPhoneNumber = String(customer.phone).replace(/[^0-9]/g, '');

        const formatDate = (dateString: string) => {
            if (!dateString) return '-';
            try {
                return new Date(dateString).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                });
            } catch {
                return dateString;
            }
        };

        const message = `Hello ${transaction.name}, here is your transaction summary from NL Jewellers:
Transaction ID: ${transaction.id}
Item: ${transaction.item} (${transaction.quality})
Given: ${transaction.weightGiven !== null ? transaction.weightGiven.toFixed(3) : '-'} gm on ${formatDate(transaction.date)}
Returned: ${transaction.weightReturn !== null ? transaction.weightReturn.toFixed(3) : '-'} gm on ${formatDate(transaction.returnTime)}
Sale: ${transaction.sale !== null ? `${transaction.sale.toFixed(3)} gm` : '-'}
Status: ${transaction.status}
`;
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${customerPhoneNumber}&text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }, [transactions, customers, showNotification]);

    const confirmDelete = useCallback(async () => {
        if (activeModal?.type === 'CONFIRM_DELETE') {
            const { transactionId } = activeModal;
            const transactionToDelete = transactions.find(t => t.id === transactionId);
            if (!transactionToDelete) {
                showNotification('Could not find the transaction to delete.', 'error');
                setActiveModal(null);
                return;
            }

            const updatedTransaction = { ...transactionToDelete, status: TransactionStatus.Deleted };
            const success = await postToSheet('SAVE_TRANSACTION', updatedTransaction);
            if (success) {
                showNotification('Entry hidden successfully!');
                setActiveModal(null);
            }
        }
    }, [activeModal, postToSheet, showNotification, transactions]);

    const isFiltering = useMemo(() => {
        return debouncedSearchTerm.trim() !== '' || purityFilter !== 'All' || statusFilter !== 'All' || startDate !== '' || endDate !== '';
    }, [debouncedSearchTerm, purityFilter, statusFilter, startDate, endDate]);

    const filteredTransactions = useMemo(() => {
        let filtered = transactions;

        if (isFiltering) {
            // When any filter is active, search through all transactions
            filtered = transactions.filter(t => {
                const searchTermLower = debouncedSearchTerm.toLowerCase();
                const searchTermMatch = t.name.toLowerCase().includes(searchTermLower) ||
                                       t.item.toLowerCase().includes(searchTermLower);
                
                const purityMatch = purityFilter === 'All' || t.quality === purityFilter;
                const statusMatch = statusFilter === 'All' || t.status === statusFilter;

                const dateMatch = (() => {
                    if (!startDate && !endDate) return true;
                    if (!t.date) return false;
                    const transactionDatePart = t.date.split('T')[0];
                    if (startDate && transactionDatePart < startDate) return false;
                    if (endDate && transactionDatePart > endDate) return false;
                    return true;
                })();

                return searchTermMatch && purityMatch && statusMatch && dateMatch;
            });
        } else {
            // By default, show only entries from the current day
            const today = new Date().toISOString().split('T')[0];
            filtered = transactions.filter(t => {
                if (!t.date) return false;
                const transactionDate = t.date.split('T')[0];
                return transactionDate === today;
            });
        }

        // Sort the final results chronologically
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, debouncedSearchTerm, purityFilter, statusFilter, startDate, endDate, isFiltering]);

    const handleExportData = useCallback(() => {
        if (filteredTransactions.length === 0) {
            alert(isFiltering ? 'No visible entries to export.' : 'No data to export.');
            return;
        }
    
        const headers = [
            'ID', 'Given Time', 'Return Time', 'Name', 'Item', 'Purity',
            'Weight Given (gm)', 'Weight Return (gm)', 'Sale (gm)', 'Status'
        ];
    
        const escapeCsvCell = (cell: string | number | null | undefined): string => {
            if (cell === null || cell === undefined) return '';
            const strCell = String(cell);
            if (strCell.includes(',') || strCell.includes('"') || strCell.includes('\n')) {
                return `"${strCell.replace(/"/g, '""')}"`;
            }
            return strCell;
        };
    
        const csvRows = filteredTransactions.map(t => [
            escapeCsvCell(t.id),
            escapeCsvCell(t.date),
            escapeCsvCell(t.returnTime),
            escapeCsvCell(t.name),
            escapeCsvCell(t.item),
            escapeCsvCell(t.quality),
            escapeCsvCell(t.weightGiven !== null ? t.weightGiven.toFixed(3) : ''),
            escapeCsvCell(t.weightReturn !== null ? t.weightReturn.toFixed(3) : ''),
            escapeCsvCell(t.sale !== null ? t.sale.toFixed(3) : ''),
            escapeCsvCell(t.status)
        ].join(','));
    
        const csvString = [headers.join(','), ...csvRows].join('\n');
    
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `nl-jewellers-export-${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [filteredTransactions, isFiltering]);
    
    const totalSale = useMemo(() => {
        return filteredTransactions.reduce((acc, transaction) => acc + (transaction.sale || 0), 0);
    }, [filteredTransactions]);
    
    const listTitle = useMemo(() => {
        if (!isFiltering) return "Today's Entries";
        
        if (startDate || endDate) {
            const formatDate = (dateStr: string) => {
                if (!dateStr) return '';
                // The date from input is 'YYYY-MM-DD'. We need to parse it correctly.
                const [year, month, day] = dateStr.split('-');
                return `${day}/${month}/${year}`;
            };

            if (startDate && endDate) {
                if (startDate === endDate) return `Entries for ${formatDate(startDate)}`;
                return `Entries from ${formatDate(startDate)} to ${formatDate(endDate)}`;
            }
            if (startDate) return `Entries from ${formatDate(startDate)}`;
            if (endDate) return `Entries until ${formatDate(endDate)}`;
        }
        
        return 'Filtered Results';
    }, [isFiltering, startDate, endDate]);

    const handleSaveSettings = useCallback((url: string) => {
        setSheetsUrl(url);
        showNotification(url ? 'Google Sheets URL saved!' : 'Google Sheets sync disabled.');
        if (url) {
            fetchData();
        }
    }, [setSheetsUrl, fetchData, showNotification]);

    const handleSaveNewCustomer = useCallback(async (newCustomer: { name: string, phone: string }) => {
        if (newCustomer.name && !customers.some(c => c.name.toLowerCase() === newCustomer.name.toLowerCase())) {
            await postToSheet('SAVE_CUSTOMER', newCustomer);
        }
    }, [customers, postToSheet]);

    const handleSaveNewItem = useCallback(async (newItemName: string) => {
        if (newItemName && !items.some(i => i.name.toLowerCase() === newItemName.toLowerCase())) {
            await postToSheet('SAVE_ITEM', { name: newItemName });
        }
    }, [items, postToSheet]);

    const handleAddNew = useCallback(() => setActiveModal({ type: 'TRANSACTION_FORM', transaction: null }), []);
    const handleCancelModal = useCallback(() => setActiveModal(null), []);
    const handleOpenSettings = useCallback(() => setActiveModal({ type: 'SETTINGS' }), []);

    return (
        <div className="min-h-screen pb-24 md:pb-0">
            <Header onOpenSettings={handleOpenSettings} />
            <main className="container mx-auto p-4 md:p-6 lg:p-8">
                 {loading && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" aria-label="Loading">
                        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-primary-gold"></div>
                    </div>
                )}

                {!sheetsUrl && !loading && (
                    <div className="fixed inset-0 bg-ivory bg-opacity-95 flex items-center justify-center z-40 p-4 text-center">
                        <div className="max-w-lg">
                            <h2 className="text-3xl font-serif font-bold text-accent-maroon mb-4">Welcome to NL Jewellers</h2>
                            <p className="text-lg text-text-main/80 mb-6">
                                To enable multi-user sync and store your data securely, please set up the Google Sheets connection.
                            </p>
                            <button
                                onClick={handleOpenSettings}
                                className="inline-flex items-center justify-center gap-3 bg-primary-gold text-text-main font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                            >
                                <SettingsIcon />
                                Start Setup
                            </button>
                        </div>
                    </div>
                )}


                <Suspense fallback={<SuspenseFallback />}>
                    {activeModal?.type === 'SETTINGS' && (
                        <SettingsDialog
                            isOpen={true}
                            onClose={handleCancelModal}
                            onSave={handleSaveSettings}
                            initialUrl={sheetsUrl}
                        />
                    )}
                    {activeModal?.type === 'CONFIRM_DELETE' && (
                         <ConfirmationDialog
                            isOpen={true}
                            onClose={handleCancelModal}
                            onConfirm={confirmDelete}
                            title="Hide Entry"
                            message="Are you sure you want to hide this entry? It will be removed from view but will remain in your Google Sheet."
                        />
                    )}
                    {activeModal?.type === 'TRANSACTION_FORM' && (
                        <TransactionModal
                            isOpen={true}
                            onClose={handleCancelModal}
                            onSave={handleSave}
                            existingTransaction={activeModal.transaction}
                            customers={customers}
                            onSaveNewCustomer={handleSaveNewCustomer}
                            items={items.map(i => i.name)}
                            onSaveNewItem={handleSaveNewItem}
                        />
                    )}
                </Suspense>

                {notification && (
                    <div className={`fixed top-24 right-4 max-w-sm w-[calc(100%-2rem)] ${notification.type === 'success' ? 'bg-green-600' : 'bg-highlight-red'} text-white py-3 px-4 rounded-lg shadow-lg animate-fade-in-out z-50 flex items-center justify-between gap-4`}>
                        <div className="flex items-center gap-3">
                            {notification.type === 'success' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            <span className="flex-1">{notification.message}</span>
                        </div>
                        <button onClick={() => setNotification(null)} className="p-1 rounded-full hover:bg-black/20 flex-shrink-0" aria-label="Dismiss notification">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                
                <div className="text-center mb-6 hidden md:flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
                    <button
                        onClick={handleAddNew}
                        disabled={!sheetsUrl}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-gold text-text-main font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PlusIcon />
                        Add New Entry
                    </button>
                    <button
                        onClick={handleExportData}
                        disabled={!sheetsUrl}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-primary-gold text-primary-gold font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg hover:bg-primary-gold/10 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ExportIcon />
                        Export Data
                    </button>
                </div>
               
                <div className="bg-ivory/80 shadow-2xl rounded-xl p-4 md:p-6 mt-8 backdrop-blur-sm border border-primary-gold/10">
                    <h2 className="text-2xl font-serif font-bold mb-4 text-accent-maroon">{listTitle}</h2>
                    <SearchBar
                        searchTerm={searchTerm}
                        onSearch={setSearchTerm}
                        purityFilter={purityFilter}
                        onPurityChange={setPurityFilter}
                        statusFilter={statusFilter}
                        onStatusChange={setStatusFilter}
                        startDate={startDate}
                        onStartDateChange={setStartDate}
                        endDate={endDate}
                        onEndDateChange={setEndDate}
                    />
                    {sheetsUrl && transactions.length > 0 ? (
                      <TransactionTable
                          transactions={filteredTransactions}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onShare={handleShareViaWhatsApp}
                          totalSale={totalSale}
                          isFiltering={isFiltering}
                      />
                    ) : (
                        <div className="text-center py-16 px-6">
                            <JournalIcon className="mx-auto h-24 w-24 text-primary-gold/30" />
                            <h3 className="mt-4 text-xl font-semibold text-text-main">
                                {sheetsUrl ? 'Your Journal is Empty' : 'Setup Required'}
                            </h3>
                            <p className="mt-2 text-base text-text-main/70">
                                {sheetsUrl ? 'Start by adding your first transaction.' : 'Please configure the Google Sheets URL in settings to begin.'}
                            </p>
                            <div className="mt-8 flex justify-center gap-4">
                                <button
                                    onClick={sheetsUrl ? handleAddNew : handleOpenSettings}
                                    className="inline-flex items-center justify-center gap-2 bg-primary-gold text-text-main font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                >
                                    {sheetsUrl ? <><PlusIcon /> Add New Entry</> : <><SettingsIcon /> Open Settings</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            
            {activeModal?.type !== 'TRANSACTION_FORM' && (
                <BottomNav 
                    onAddNew={handleAddNew}
                    onExport={handleExportData}
                    disabled={!sheetsUrl}
                />
            )}
             <style>{`
                @keyframes fade-in-out {
                    0% { opacity: 0; transform: translateY(-20px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-20px); }
                }
                .animate-fade-in-out {
                    animation: fade-in-out 8s ease-in-out forwards;
                }
            `}</style>
        </div>
    );
};

export default App;