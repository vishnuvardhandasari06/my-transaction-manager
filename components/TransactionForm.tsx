import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Transaction, TransactionStatus, Customer, PURITIES } from '../types';
import AddNameDialog from './AddNameDialog';
import AddItemDialog from './AddItemDialog';

interface TransactionFormProps {
    onSave: (transaction: Transaction) => void;
    onCancel: () => void;
    existingTransaction: Transaction | null;
    customers: Customer[];
    onSaveNewCustomer: (customer: { name: string, phone: string }) => void;
    items: string[];
    onSaveNewItem: (newItem: string) => void;
}

const AddCircleIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const RecalculateIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0119.5 19.5M20 20l-1.5-1.5A9 9 0 004.5 4.5" />
    </svg>
);

// Configuration for automatic status updates. This makes the logic easily changeable.
const statusLogicConfig = {
    default: TransactionStatus.NotReturned,
    onGiven: TransactionStatus.NotReturned,
    onReturned: TransactionStatus.Returned,
};

/**
 * Generates a short, numeric, unique ID for new transactions.
 * It uses the last 8 digits of the current timestamp in milliseconds,
 * which provides uniqueness for a cycle of over 27 hours and is sufficient for this application's scope.
 */
const generateShortId = () => {
    return Date.now().toString().slice(-8);
};


const TransactionForm: React.FC<TransactionFormProps> = ({ onSave, onCancel, existingTransaction, customers, onSaveNewCustomer, items, onSaveNewItem }) => {
    // Fix: Explicitly define the return type as 'Transaction' to ensure the object created for a new transaction
    // conforms to the interface, specifically to correctly type the 'quality' property which was being inferred as a generic 'string'.
    const getInitialState = useCallback((): Transaction => {
        if (existingTransaction) return existingTransaction;
        
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const localDateTime = now.toISOString().slice(0, 16);

        return {
            id: generateShortId(),
            date: localDateTime,
            name: '',
            item: '',
            quality: '',
            weightGiven: null,
            weightReturn: null,
            sale: null,
            status: statusLogicConfig.default, // Use config for default status
            returnTime: '',
        };
    }, [existingTransaction]);

    const [transaction, setTransaction] = useState<Transaction>(getInitialState);
    const [localItems, setLocalItems] = useState(items);
    const [isAddNameDialogOpen, setIsAddNameDialogOpen] = useState(false);
    const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
    const [selectedPhone, setSelectedPhone] = useState<string | undefined>('');
    const [lastEditedNumericField, setLastEditedNumericField] = useState<'weights' | 'sale' | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof Transaction, string>>>({});
    const initialStateRef = useRef<Transaction | null>(null);

    const getAutoSaveKey = useCallback((tx: Transaction | null) => `autosaved-transaction-${tx?.id || 'new'}`, []);


    useEffect(() => {
        const autoSaveKey = getAutoSaveKey(existingTransaction);
        const autoSavedDataString = localStorage.getItem(autoSaveKey);
        const baseInitialState = getInitialState();

        let finalState: Transaction = baseInitialState;

        if (autoSavedDataString) {
            if (window.confirm('You have unsaved changes from a previous session. Do you want to restore them?')) {
                finalState = JSON.parse(autoSavedDataString);
            } else {
                localStorage.removeItem(autoSaveKey);
            }
        }
        
        setTransaction(finalState);
        initialStateRef.current = finalState;

        setLastEditedNumericField(null);
        setErrors({});
        const customer = customers.find(c => c.name === finalState.name);
        setSelectedPhone(customer?.phone);
        
    }, [existingTransaction, customers, getInitialState, getAutoSaveKey]);

    useEffect(() => {
        if (!initialStateRef.current) return;

        const hasChanges = JSON.stringify(transaction) !== JSON.stringify(initialStateRef.current);
        if (!hasChanges) return;

        const autoSaveKey = getAutoSaveKey(existingTransaction);
        const handler = setTimeout(() => {
            console.log('Auto-saving changes...');
            localStorage.setItem(autoSaveKey, JSON.stringify(transaction));
        }, 3000);

        return () => {
            clearTimeout(handler);
        };
    }, [transaction, existingTransaction, getAutoSaveKey]);

    
    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    useEffect(() => {
        const customer = customers.find(c => c.name === transaction.name);
        setSelectedPhone(customer?.phone);
    }, [transaction.name, customers]);

    // Effect to auto-calculate Sale from weights.
    useEffect(() => {
        if (lastEditedNumericField === 'sale') return;

        const given = transaction.weightGiven;
        const returned = transaction.weightReturn;

        let newSale = (given !== null && returned !== null) ? given - returned : null;

        if (newSale !== null) {
            newSale = parseFloat(newSale.toFixed(3));
        }

        if (newSale !== null && newSale <= 0.015) {
            newSale = 0;
        }

        if (newSale !== transaction.sale) {
            setTransaction(prev => ({ ...prev, sale: newSale }));
        }
    }, [transaction.weightGiven, transaction.weightReturn, lastEditedNumericField, transaction.sale]);

    // Effect to auto-calculate Weight Return and Return Time from Sale.
    useEffect(() => {
        if (lastEditedNumericField !== 'sale') return;

        const given = transaction.weightGiven;
        const sale = transaction.sale;

        // Only act if a sale value is present or being cleared by the user.
        if (given !== null && sale !== null) {
            // Ensure given is not less than sale to avoid negative return weight
            if (given < sale) {
                // If sale is invalid, clear return weight and time.
                setTransaction(prev => ({ ...prev, weightReturn: null, returnTime: '' }));
                return;
            }

            const newReturn = parseFloat((given - sale).toFixed(3));
            const isPositive = newReturn > 0;
            
            // Unconditionally update return weight and time based on the new sale value.
            setTransaction(prev => ({ 
                ...prev, 
                weightReturn: newReturn,
                returnTime: isPositive ? (() => {
                    const now = new Date();
                    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                    return now.toISOString().slice(0, 16);
                })() : ''
            }));
        // If the user clears the sale input, we should also clear the auto-calculated return values.
        } else if (sale === null) {
             setTransaction(prev => ({ ...prev, weightReturn: null, returnTime: '' }));
        }
    }, [transaction.sale, transaction.weightGiven, lastEditedNumericField]);

    // Effect to automatically update the transaction status based on weight inputs.
    useEffect(() => {
        const given = transaction.weightGiven;
        const returned = transaction.weightReturn;

        setTransaction(prev => {
            // Manually set status 'Paid' should be sticky and not be overridden.
            if (prev.status === TransactionStatus.Paid) {
                return prev;
            }
            
            let newStatus: TransactionStatus = prev.status;

            // When weight is given but not returned, status is 'Not Returned'.
            if (given !== null && given > 0 && (returned === null || returned <= 0)) {
                newStatus = statusLogicConfig.onGiven;
            // When weight is returned, status is 'Returned'.
            } else if (given !== null && given > 0 && returned !== null && returned > 0) {
                newStatus = statusLogicConfig.onReturned;
            // If both weights are cleared, revert to the default status.
            } else if ((given === null || given <= 0) && (returned === null || returned <= 0)) {
                newStatus = statusLogicConfig.default;
            }
            
            if (newStatus !== prev.status) {
                return { ...prev, status: newStatus };
            }
            
            return prev;
        });
    }, [transaction.weightGiven, transaction.weightReturn]);

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof Transaction, string>> = {};

        if (!transaction.name.trim()) newErrors.name = 'Name is required.';
        if (!transaction.item.trim()) newErrors.item = 'Item is required.';
        if (!transaction.quality.trim()) newErrors.quality = 'Purity is required.';
        if (!transaction.date) newErrors.date = 'Given time is required.';

        if (transaction.weightGiven !== null && transaction.weightGiven < 0) {
            newErrors.weightGiven = 'Weight must be a non-negative number.';
        }
        if (transaction.weightReturn !== null && transaction.weightReturn < 0) {
            newErrors.weightReturn = 'Weight must be a non-negative number.';
        }

        if (transaction.date && transaction.returnTime) {
            if (new Date(transaction.returnTime) < new Date(transaction.date)) {
                newErrors.returnTime = 'Return time cannot be before the given time.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (errors[name as keyof Transaction]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name as keyof Transaction];
                return newErrors;
            });
        }

        if (name === 'sale') {
            setLastEditedNumericField('sale');
            const numValue = parseFloat(value);
            setTransaction(prev => ({ ...prev, sale: isNaN(numValue) ? null : numValue }));
            return;
        }
        
        if (name === 'weightGiven' || name === 'weightReturn') {
            setLastEditedNumericField('weights');
        }
    
        if (name === 'weightGiven') {
            const numValue = parseFloat(value);
            const isPositive = !isNaN(numValue) && numValue > 0;
            
            setTransaction(prev => ({
                ...prev,
                weightGiven: isNaN(numValue) ? null : numValue,
                date: isPositive && !prev.date ? (() => {
                    const now = new Date();
                    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                    return now.toISOString().slice(0, 16);
                })() : prev.date,
            }));
        } else if (name === 'weightReturn') {
            const numValue = parseFloat(value);
            const isPositive = !isNaN(numValue) && numValue > 0;
    
            setTransaction(prev => ({
                ...prev,
                weightReturn: isNaN(numValue) ? null : numValue,
                returnTime: isPositive ? (() => {
                    const now = new Date();
                    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                    return now.toISOString().slice(0, 16);
                })() : '',
            }));
        } else {
            setTransaction(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleRecalculateSale = () => {
        setLastEditedNumericField('weights');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const autoSaveKey = getAutoSaveKey(existingTransaction);
            localStorage.removeItem(autoSaveKey);
            onSave(transaction);
        }
    };

    const handleCancelWrapper = () => {
        const autoSaveKey = getAutoSaveKey(existingTransaction);
        localStorage.removeItem(autoSaveKey);
        onCancel();
    };

    const handleAddNewOption = (field: 'name' | 'item') => {
        if (field === 'name') {
            setIsAddNameDialogOpen(true);
        } else if (field === 'item') {
            setIsAddItemDialogOpen(true);
        }
    };
    
    const handleSaveNewName = (customer: { name: string, phone: string }) => {
        onSaveNewCustomer(customer);
        setTransaction(prev => ({ ...prev, name: customer.name }));
        if (errors.name) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.name;
                return newErrors;
            });
        }
        setIsAddNameDialogOpen(false);
    };

    const handleSaveNewItem = (newItem: string) => {
        onSaveNewItem(newItem);
        if (newItem && !localItems.some(i => i.toLowerCase() === newItem.toLowerCase())) {
            setLocalItems(prev => [...prev, newItem].sort());
        }
        setTransaction(prev => ({ ...prev, item: newItem }));
        if (errors.item) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.item;
                return newErrors;
            });
        }
        setIsAddItemDialogOpen(false);
    };


    const renderInput = (id: keyof Transaction, label: string, type = 'text', className = '', readOnly = false, step?: string) => (
        <div className={className}>
            <label htmlFor={id} className="block text-sm font-medium text-text-main/90">{label}</label>
            <div className="mt-1">
                <input
                    type={type}
                    id={id}
                    name={id}
                    value={transaction[id] as string ?? ''}
                    onChange={handleChange}
                    autoComplete="off"
                    readOnly={readOnly}
                    step={step}
                    className={`block w-full px-3 py-2 bg-ivory/50 border ${errors[id] ? 'border-highlight-red text-highlight-red' : 'border-primary-gold/50'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
            </div>
            {errors[id] && <p className="mt-1 text-xs text-highlight-red">{errors[id]}</p>}
        </div>
    );
    
    const renderSelectWithAdd = (id: 'name' | 'item', label: string, options: string[], className = '', iconClassName = '') => (
        <div className={className}>
            <label htmlFor={id} className="block text-sm font-medium text-text-main/90">{label}</label>
            <div className="relative mt-1">
                <select
                    id={id}
                    name={id}
                    value={transaction[id]}
                    onChange={handleChange}
                    className={`block w-full pl-3 pr-10 py-2 text-base bg-ivory/50 focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm rounded-md appearance-none border ${errors[id] ? 'border-highlight-red text-highlight-red' : 'border-primary-gold/50'}`}
                >
                    <option value="">Select {label}</option>
                    {options.map(option => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={() => handleAddNewOption(id)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-primary-gold"
                    aria-label={`Add new ${id}`}
                    title={`Add new ${id}`}
                >
                    <AddCircleIcon className={iconClassName || 'h-5 w-5'} />
                </button>
            </div>
            {errors[id] && <p className="mt-1 text-xs text-highlight-red">{errors[id]}</p>}
        </div>
    );
    
    return (
        <>
            <AddNameDialog
                isOpen={isAddNameDialogOpen}
                onClose={() => setIsAddNameDialogOpen(false)}
                onSave={handleSaveNewName}
                existingNames={customers.map(c => c.name)}
            />
            <AddItemDialog
                isOpen={isAddItemDialogOpen}
                onClose={() => setIsAddItemDialogOpen(false)}
                onSave={handleSaveNewItem}
                existingItems={localItems}
            />
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderSelectWithAdd('name', 'Name', customers.map(c => c.name), '', 'h-8 w-8')}
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-text-main/90">Phone Number</label>
                        <div className="mt-1">
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={selectedPhone || ''}
                                readOnly
                                placeholder="Select a name to see phone"
                                className="block w-full px-3 py-2 bg-gray-100 border border-primary-gold/50 rounded-md shadow-sm sm:text-sm cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                {renderSelectWithAdd('item', 'Item', localItems, '', 'h-8 w-8')}
                <div>
                    <label htmlFor="quality" className="block text-sm font-medium text-text-main/90">Purity</label>
                    <select
                        id="quality"
                        name="quality"
                        value={transaction.quality}
                        onChange={handleChange}
                        className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border bg-ivory/50 focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm rounded-md ${errors.quality ? 'border-highlight-red text-highlight-red' : 'border-primary-gold/50'}`}
                    >
                        <option value="">Select Purity</option>
                        {PURITIES.map(purity => (
                           <option key={purity} value={purity}>{purity}</option>
                        ))}
                    </select>
                    {errors.quality && <p className="mt-1 text-xs text-highlight-red">{errors.quality}</p>}
                </div>

                {renderInput('weightGiven', 'Weight Given (gm)', 'number', '', false, '0.001')}
                {renderInput('weightReturn', 'Weight Return (gm)', 'number', '', false, '0.001')}

                {renderInput('date', 'Given Time', 'datetime-local')}
                {renderInput('returnTime', 'Return Time', 'datetime-local')}

                <div>
                    <label htmlFor="sale" className="block text-sm font-medium text-text-main/90">Sale (gm)</label>
                    <div className="mt-1 relative">
                        <input
                            type="number"
                            id="sale"
                            name="sale"
                            value={transaction.sale !== null ? transaction.sale.toString() : ''}
                            onChange={handleChange}
                            step="0.001"
                            placeholder="Auto-calculated"
                            className={`block w-full px-3 py-2 bg-ivory/50 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm pr-10 ${errors.sale ? 'border-highlight-red text-highlight-red' : 'border-primary-gold/50'}`}
                        />
                        {lastEditedNumericField === 'sale' && (
                            <button
                                type="button"
                                onClick={handleRecalculateSale}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-primary-gold"
                                aria-label="Recalculate Sale"
                                title="Recalculate Sale"
                            >
                                <RecalculateIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    {errors.sale && <p className="mt-1 text-xs text-highlight-red">{errors.sale}</p>}
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-text-main/90">Status</label>
                    <select
                        id="status"
                        name="status"
                        value={transaction.status}
                        onChange={handleChange}
                        className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border bg-ivory/50 focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm rounded-md ${errors.status ? 'border-highlight-red text-highlight-red' : 'border-primary-gold/50'}`}
                    >
                        {Object.values(TransactionStatus).filter(s => s !== TransactionStatus.Deleted).map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    {errors.status && <p className="mt-1 text-xs text-highlight-red">{errors.status}</p>}
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-4 pt-4">
                    <button type="button" onClick={handleCancelWrapper} className="bg-gray-200 text-text-main font-bold py-2 px-4 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                        Cancel
                    </button>
                    <button type="submit" className="bg-primary-gold text-text-main font-bold py-2 px-4 rounded-lg hover:bg-button-hover-gold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-gold">
                        {existingTransaction ? 'Update Entry' : 'Save Entry'}
                    </button>
                </div>
            </form>
        </>
    );
};

export default TransactionForm;