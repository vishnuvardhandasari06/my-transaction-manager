
import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { Transaction, Customer, Item } from './types';
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
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [sheetsUrl, setSheetsUrl] = useLocalStorage<string>('sheetsUrl', '');
    const [loading, setLoading] = useState(true);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    const fetchData = useCallback(async () => {
        if (!sheetsUrl) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(sheetsUrl);
            if (!response.ok) throw new Error('Network response was not ok. Check script deployment permissions.');
            const { transactions: fetchedTransactions, customers: fetchedCustomers, items: fetchedItems } = await response.json();
            
            // Ensure data is in the correct format before setting state
            setTransactions(Array.isArray(fetchedTransactions) ? fetchedTransactions : []);
            setCustomers(Array.isArray(fetchedCustomers) ? fetchedCustomers : []);
            setItems(Array.isArray(fetchedItems) ? fetchedItems : []);
            
            showNotification('Data synced with Google Sheets.', 'success');
        } catch (error) {
            console.error('Failed to fetch data from Google Sheets:', error);
            showNotification('Failed to load data. Check Sheets URL or script setup.', 'error');
        } finally {
            setLoading(false);
        }
    }, [sheetsUrl]);

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
            await fetch(sheetsUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({ action, payload }),
            });
            // With 'no-cors', we can't inspect the response. We assume success and refetch.
            // The Apps Script must be deployed to allow anonymous access.
            await fetchData();
            return true;
        } catch (error) {
            console.error(`Failed to perform action ${action}:`, error);
            showNotification(`Action failed: ${action}. Please try again.`, 'error');
            setLoading(false);
            return false;
        }
    }, [sheetsUrl, fetchData]);


    const handleSave = useCallback(async (transaction: Transaction) => {
        const isEditing = transactions.some(t => t.id === transaction.id);
        const success = await postToSheet('SAVE_TRANSACTION', transaction);
        if (success) {
            showNotification(isEditing ? 'Data updated successfully!' : 'New entry added successfully!');
            setActiveModal(null);
        }
    }, [transactions, postToSheet]);

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
        if (!transaction) return;

        const formatDate = (dateString: string) => dateString ? new Date(dateString).toLocaleString() : '-';

        const message = `NL Jewellers - Transaction Summary
Customer: ${transaction.name}
Item: ${transaction.item} (${transaction.quality})
Given: ${transaction.weightGiven !== null ? transaction.weightGiven.toFixed(3) : '-'} gm on ${formatDate(transaction.date)}
Returned: ${transaction.weightReturn !== null ? transaction.weightReturn.toFixed(3) : '-'} gm on ${formatDate(transaction.returnTime)}
Sale : ${transaction.sale !== null ? `${transaction.sale.toFixed(3)} gm` : '-'}
Status: ${transaction.status}
`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }, [transactions]);

    const confirmDelete = useCallback(async () => {
        if (activeModal?.type === 'CONFIRM_DELETE') {
            const { transactionId } = activeModal;
            const success = await postToSheet('DELETE_TRANSACTION', { id: transactionId });
            if (success) {
                showNotification('Entry deleted successfully!');
                setActiveModal(null);
            }
        }
    }, [activeModal, postToSheet]);

    const handleExportData = useCallback(() => {
        if (transactions.length === 0) {
            alert('No data to export.');
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
    
        const csvRows = transactions.map(t => [
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
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const searchTermLower = debouncedSearchTerm.toLowerCase();
            const searchTermMatch = t.name.toLowerCase().includes(searchTermLower) ||
                                   t.item.toLowerCase().includes(searchTermLower) ||
                                   (t.date && t.date.includes(debouncedSearchTerm));
            
            const purityMatch = purityFilter === 'All' || t.quality === purityFilter;

            return searchTermMatch && purityMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, debouncedSearchTerm, purityFilter]);
    
    const totalSale = useMemo(() => {
        return filteredTransactions.reduce((acc, transaction) => acc + (transaction.sale || 0), 0);
    }, [filteredTransactions]);

    const handleSaveSettings = useCallback((url: string) => {
        setSheetsUrl(url);
        showNotification(url ? 'Google Sheets URL saved!' : 'Google Sheets sync disabled.');
        if (url) {
            fetchData();
        }
    }, [setSheetsUrl, fetchData]);

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
                            title="Delete Entry"
                            message="Are you sure you want to delete this entry? This action cannot be undone."
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
                    <div className={`fixed top-24 right-4 ${notification.type === 'success' ? 'bg-green-600' : 'bg-highlight-red'} text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-out z-50`}>
                        {notification.message}
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
                    <h2 className="text-2xl font-serif font-bold mb-4 text-accent-maroon">Latest Entries</h2>
                    <SearchBar
                        searchTerm={searchTerm}
                        onSearch={setSearchTerm}
                        purityFilter={purityFilter}
                        onPurityChange={setPurityFilter}
                    />
                    {sheetsUrl && transactions.length > 0 ? (
                      <TransactionTable
                          transactions={filteredTransactions}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onShare={handleShareViaWhatsApp}
                          totalSale={totalSale}
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
                    animation: fade-in-out 3s ease-in-out forwards;
                }
            `}</style>
        </div>
    );
};

export default App;
