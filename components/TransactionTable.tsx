

import React, { useRef, useEffect } from 'react';
import { Transaction, TransactionStatus } from '../types';
import { EditIcon, DeleteIcon, WhatsAppIcon } from './Icons';

interface TransactionTableProps {
    transactions: Transaction[];
    onEdit: (id: string) => void;
    onDelete: (id:string) => void;
    onShare: (id: string) => void;
    totalSale: number;
    isFiltering: boolean;
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
}

const formatDuration = (start: string, end: string): string | null => {
    if (!start || !end) return null;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
        return null;
    }

    let diff = (endDate.getTime() - startDate.getTime()) / 1000;

    const days = Math.floor(diff / (24 * 3600));
    diff -= days * 24 * 3600;
    const hours = Math.floor(diff / 3600);
    diff -= hours * 3600;
    const minutes = Math.floor(diff / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    if (parts.length === 0 && diff > 0) return "< 1m";
    
    return parts.join(' ');
};

const formatDateTime12Hour = (dateString: string): string => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Invalid date, return original
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch (error) {
        console.error("Could not format date:", dateString, error);
        return dateString; // fallback
    }
};

// Memoize the PurityBadge sub-component as it's a pure presentational component.
const PurityBadge: React.FC<{ quality: string, size?: 'sm' | 'md' }> = React.memo(({ quality, size = 'md' }) => {
    const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
    if (quality === '916') {
        return <span className={`${padding} text-xs font-semibold text-white bg-primary-gold rounded-full`}>916</span>;
    }
    if (quality === '750') {
        return <span className={`${padding} text-xs font-semibold text-white bg-highlight-red rounded-full`}>750</span>;
    }
    return <>{quality}</>;
});

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, onEdit, onDelete, onShare, totalSale, isFiltering, selectedIds, onToggleSelect, onToggleSelectAll }) => {
    
    const headerCheckboxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (headerCheckboxRef.current) {
            const allVisibleIds = transactions.map(t => t.id);
            const numSelected = allVisibleIds.filter(id => selectedIds.has(id)).length;
            const allSelected = numSelected > 0 && numSelected === allVisibleIds.length;
            
            headerCheckboxRef.current.checked = allSelected;
            headerCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < allVisibleIds.length;
        }
    }, [selectedIds, transactions]);
    
    if (transactions.length === 0) {
        const message = isFiltering ? "No matching entries found." : "No entries for today.";
        return <p className="text-center text-text-main/70 py-8">{message}</p>;
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case TransactionStatus.Paid: return 'bg-green-100 text-green-800';
            case TransactionStatus.NotReturned: return 'bg-primary-gold/20 text-yellow-800';
            case TransactionStatus.Returned: return 'bg-highlight-red/20 text-highlight-red';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="min-w-full divide-y divide-primary-gold/20 hidden md:table">
                <thead className="bg-ivory/50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left">
                            <input 
                                type="checkbox" 
                                ref={headerCheckboxRef}
                                onChange={onToggleSelectAll}
                                className="h-4 w-4 rounded border-gray-300 text-primary-gold focus:ring-primary-gold" 
                                aria-label="Select all transactions"
                            />
                        </th>
                        {['Given Time', 'Name', 'Item', 'Purity', 'Wt Given', 'Wt Return', 'Sale', 'Duration', 'Status', 'Actions'].map(header => (
                             <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-accent-maroon uppercase tracking-wider">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-primary-gold/20">
                    {transactions.map((t) => (
                        <tr key={t.id} className={`hover:bg-primary-gold/10 ${selectedIds.has(t.id) ? 'bg-primary-gold/20' : ''}`}>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => onToggleSelect(t.id)} className="h-4 w-4 rounded border-gray-300 text-primary-gold focus:ring-primary-gold" aria-label={`Select transaction ${t.id}`} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main/80">{formatDateTime12Hour(t.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-main">{t.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main/80">{t.item}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm"><PurityBadge quality={t.quality} /></td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main/80">{t.weightGiven !== null ? `${t.weightGiven.toFixed(3)} gm` : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main/80">{t.weightReturn !== null ? `${t.weightReturn.toFixed(3)} gm` : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">{t.sale !== null ? `${t.sale.toFixed(3)} gm` : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main/80">{formatDuration(t.date, t.returnTime) || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(t.status)}`}>
                                    {t.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                               <div className="flex items-center gap-4">
                                    <button onClick={() => onShare(t.id)} className="text-green-600 hover:text-green-800" aria-label="Chat on WhatsApp"><WhatsAppIcon /></button>
                                    <button onClick={() => onEdit(t.id)} className="text-primary-gold hover:text-button-hover-gold" aria-label="Edit"><EditIcon /></button>
                                    <button onClick={() => onDelete(t.id)} className="text-highlight-red hover:opacity-70" aria-label="Delete"><DeleteIcon /></button>
                               </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-ivory border-t-2 border-primary-gold/30">
                        <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-accent-maroon uppercase tracking-wider">
                            Total Sale
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-bold text-green-800">
                            {totalSale.toFixed(3)} gm
                        </td>
                        <td colSpan={3}></td>
                    </tr>
                </tfoot>
            </table>

            {/* Mobile Cards */}
            <div className="md:hidden">
                <div className="space-y-4">
                    {transactions.map(t => (
                        <div key={t.id} className={`relative bg-white/70 rounded-lg shadow-md p-4 border-l-4 border-accent-maroon ${selectedIds.has(t.id) ? 'ring-2 ring-primary-gold' : ''}`}>
                             <div className="absolute top-3 right-3 z-10">
                                <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => onToggleSelect(t.id)} className="h-5 w-5 rounded border-gray-400 text-primary-gold focus:ring-primary-gold" aria-label={`Select transaction ${t.id}`} />
                            </div>
                            <div className="flex justify-between items-start pr-8">
                                <div onClick={() => onToggleSelect(t.id)} className="cursor-pointer flex-grow">
                                    <p className="font-bold text-lg text-text-main">{t.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-sm text-text-main/70">{t.item}</p>
                                      <PurityBadge quality={t.quality} size="sm" />
                                    </div>
                                    <p className="text-xs text-text-main/60 mt-1">{formatDateTime12Hour(t.date)}</p>
                                </div>
                                 <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(t.status)}`}>
                                    {t.status}
                                </span>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2 text-center border-b border-primary-gold/20 pb-4">
                                <div>
                                    <p className="text-xs text-text-main/70">Wt Given</p>
                                    <p className="font-medium text-text-main/90">{t.weightGiven !== null ? `${t.weightGiven.toFixed(3)} gm` : '-'}</p>
                                </div>
                                 <div>
                                    <p className="text-xs text-text-main/70">Wt Return</p>
                                    <p className="font-medium text-text-main/90">{t.weightReturn !== null ? `${t.weightReturn.toFixed(3)} gm` : '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-text-main/70">Sale</p>
                                    <p className="font-medium text-green-700">{t.sale !== null ? `${t.sale.toFixed(3)} gm` : '-'}</p>
                                </div>
                            </div>
                            {t.returnTime && (
                                <div className="mt-2 text-center">
                                     <p className="text-xs text-text-main/70">Duration</p>
                                     <p className="font-medium text-text-main/90">{formatDuration(t.date, t.returnTime)}</p>
                                </div>
                            )}
                            <div className="mt-4 pt-4 border-t border-primary-gold/20 flex justify-end gap-4">
                                <button onClick={() => onShare(t.id)} className="text-green-600 font-semibold flex items-center gap-1" aria-label="Chat on WhatsApp"><WhatsAppIcon /> Chat</button>
                                <button onClick={() => onEdit(t.id)} className="text-primary-gold font-semibold flex items-center gap-1" aria-label="Edit"><EditIcon /> Edit</button>
                                <button onClick={() => onDelete(t.id)} className="text-highlight-red font-semibold flex items-center gap-1" aria-label="Delete"><DeleteIcon /> Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="mt-6 bg-ivory rounded-lg shadow p-4 text-center">
                    <p className="text-sm font-medium text-accent-maroon uppercase tracking-wider">Total Sale</p>
                    <p className="text-2xl font-bold text-green-800 mt-1">
                        {totalSale.toFixed(3)} gm
                    </p>
                </div>
            </div>
        </div>
    );
};

// Memoize the entire component to prevent re-renders if its props haven't changed.
export default React.memo(TransactionTable);