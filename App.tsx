
import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Transaction, Customer } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useDebounce } from './hooks/useDebounce';
import TransactionTable from './components/TransactionTable';
import SearchBar from './components/SearchBar';
import { Header } from './components/Header';
import { PlusIcon, ExportIcon, DemoIcon, JournalIcon } from './components/Icons';
import { demoTransactions } from './demo-data';
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
  | { type: 'CONFIRM_DEMO' }
  | { type: 'CONFIRM_DELETE'; transactionId: string }
  | { type: 'SETTINGS' };

const App: React.FC = () => {
    const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
    const [customers, setCustomers] = useLocalStorage<Customer[]>('customers', []);
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [purityFilter, setPurityFilter] = useState('All');
    const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
    const [sheetsUrl, setSheetsUrl] = useLocalStorage<string>('sheetsUrl', '');

    // Debounce search term to avoid re-filtering on every keystroke.
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const showConfirmation = (message: string) => {
        setConfirmationMessage(message);
        setTimeout(() => {
            setConfirmationMessage(null);
        }, 3000);
    };
    
    // Memoize sync function as it's used in other callbacks.
    const syncWithGoogleSheet = useCallback(async (transaction: Transaction, action: 'SAVE' | 'DELETE') => {
        if (!sheetsUrl) {
            return;
        }
        try {
            await fetch(sheetsUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({ action, transaction }),
            });
            console.log(`Sync request sent: ${action} for ${transaction.id}`);
        } catch (error) {
            console.error('Failed to sync with Google Sheets:', error);
            showConfirmation('Error: Failed to sync data.');
        }
    }, [sheetsUrl]);


    const handleSave = useCallback((transaction: Transaction) => {
        if (transactions.some(t => t.id !== transaction.id && t.name === transaction.name && t.date === transaction.date)) {
            alert('A transaction with the same name and date already exists.');
            return;
        }

        const isEditing = transactions.some(t => t.id === transaction.id);

        if (isEditing) {
            setTransactions(transactions.map(t => t.id === transaction.id ? transaction : t));
            showConfirmation('Data updated successfully!');
        } else {
            setTransactions([transaction, ...transactions]);
            showConfirmation('New entry added successfully!');
        }
        syncWithGoogleSheet(transaction, 'SAVE');
        setActiveModal(null);
    }, [transactions, syncWithGoogleSheet, setTransactions]);

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

    const confirmDelete = useCallback(() => {
        if (activeModal?.type === 'CONFIRM_DELETE') {
            const { transactionId } = activeModal;
            const transactionToDelete = transactions.find(t => t.id === transactionId);
            setTransactions(transactions.filter(t => t.id !== transactionId));
            setActiveModal(null);
            showConfirmation('Entry deleted successfully!');
            if (transactionToDelete) {
                syncWithGoogleSheet(transactionToDelete, 'DELETE');
            }
        }
    }, [activeModal, transactions, syncWithGoogleSheet, setTransactions]);

    const handleGenerateDemoData = useCallback(() => {
        const newTransactions = demoTransactions.map((t, index) => ({
            ...t,
            id: `demo-${Date.now()}-${index}`,
        }));

        setTransactions(prev => [...newTransactions, ...prev]);

        const demoNames = [...new Set(demoTransactions.map(t => t.name))];
        const existingNames = new Set(customers.map(c => c.name));
        const newCustomers = demoNames
            .filter(name => !existingNames.has(name))
            .map(name => ({ name, phone: '' }));

        if (newCustomers.length > 0) {
            setCustomers(prev => [...prev, ...newCustomers].sort((a,b) => a.name.localeCompare(b.name)));
        }

        setActiveModal(null);
        showConfirmation('5 demo entries have been added!');
    }, [customers, setTransactions, setCustomers]);

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
                                   t.date.includes(debouncedSearchTerm);
            
            const purityMatch = purityFilter === 'All' || t.quality === purityFilter;

            return searchTermMatch && purityMatch;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, debouncedSearchTerm, purityFilter]);
    
    const totalSale = useMemo(() => {
        return filteredTransactions.reduce((acc, transaction) => acc + (transaction.sale || 0), 0);
    }, [filteredTransactions]);

    const uniqueItems = useMemo(() => [...new Set(transactions.map(t => t.item))], [transactions]);

    const handleSaveSettings = useCallback((url: string) => {
        setSheetsUrl(url);
        showConfirmation(url ? 'Google Sheets sync enabled!' : 'Google Sheets sync disabled.');
    }, [setSheetsUrl]);

    const handleSaveNewCustomer = useCallback((newCustomer: { name: string, phone: string }) => {
        if (newCustomer.name && !customers.some(c => c.name.toLowerCase() === newCustomer.name.toLowerCase())) {
            const sortedCustomers = [...customers, newCustomer].sort((a, b) => a.name.localeCompare(b.name));
            setCustomers(sortedCustomers);
        }
    }, [customers, setCustomers]);

    // Use useCallback for all handlers passed as props to memoized components.
    const handleAddNew = useCallback(() => setActiveModal({ type: 'TRANSACTION_FORM', transaction: null }), []);
    const handleCancelModal = useCallback(() => setActiveModal(null), []);
    const handleOpenSettings = useCallback(() => setActiveModal({ type: 'SETTINGS' }), []);
    const handleConfirmDemo = useCallback(() => setActiveModal({ type: 'CONFIRM_DEMO' }), []);

    return (
        <div className="min-h-screen pb-24 md:pb-0">
            <Header onOpenSettings={handleOpenSettings} />
            <main className="container mx-auto p-4 md:p-6 lg:p-8">
                <Suspense fallback={<SuspenseFallback />}>
                    {activeModal?.type === 'SETTINGS' && (
                        <SettingsDialog
                            isOpen={true}
                            onClose={handleCancelModal}
                            onSave={handleSaveSettings}
                            initialUrl={sheetsUrl}
                        />
                    )}
                    {activeModal?.type === 'CONFIRM_DEMO' && (
                        <ConfirmationDialog
                            isOpen={true}
                            onClose={handleCancelModal}
                            onConfirm={handleGenerateDemoData}
                            title="Generate Demo Entries"
                            message="This will add 5 sample entries to demonstrate the app's features. Your existing data will not be affected. Continue?"
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
                            uniqueItems={uniqueItems}
                        />
                    )}
                </Suspense>

                {confirmationMessage && (
                    <div className="fixed top-24 right-4 bg-green-600 text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-out z-50">
                        {confirmationMessage}
                    </div>
                )}
                
                <div className="text-center mb-6 hidden md:flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
                    <button
                        onClick={handleAddNew}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-gold text-text-main font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                    >
                        <PlusIcon />
                        Add New Entry
                    </button>
                    <button
                        onClick={handleConfirmDemo}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent-maroon text-ivory font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg hover:opacity-90 transition-all transform hover:-translate-y-0.5"
                    >
                        <DemoIcon />
                        Generate Demo Entries
                    </button>
                    <button
                        onClick={handleExportData}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-primary-gold text-primary-gold font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg hover:bg-primary-gold/10 transition-all transform hover:-translate-y-0.5"
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
                    {transactions.length > 0 ? (
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
                            <h3 className="mt-4 text-xl font-semibold text-text-main">Your Journal is Empty</h3>
                            <p className="mt-2 text-base text-text-main/70">
                                Start by adding your first transaction or load sample data to see how it works.
                            </p>
                            <div className="mt-8 flex justify-center gap-4">
                                <button
                                    onClick={handleAddNew}
                                    className="inline-flex items-center justify-center gap-2 bg-primary-gold text-text-main font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                >
                                    <PlusIcon />
                                    Add New Entry
                                </button>
                                <button
                                    onClick={handleConfirmDemo}
                                    className="inline-flex items-center justify-center gap-2 bg-accent-maroon text-ivory font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg hover:opacity-90 transition-all transform hover:-translate-y-0.5"
                                >
                                    <DemoIcon />
                                    Generate Demo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            
            {activeModal?.type !== 'TRANSACTION_FORM' && (
                <BottomNav 
                    onAddNew={handleAddNew}
                    onGenerateDemo={handleConfirmDemo}
                    onExport={handleExportData}
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
