import React from 'react';
import { PURITIES, TransactionStatus } from '../types';

interface SearchBarProps {
    searchTerm: string;
    onSearch: (term: string) => void;
    purityFilter: string;
    onPurityChange: (purity: string) => void;
    statusFilter: string;
    onStatusChange: (status: string) => void;
    startDate: string;
    onStartDateChange: (date: string) => void;
    endDate: string;
    onEndDateChange: (date: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
    searchTerm, onSearch, 
    purityFilter, onPurityChange, 
    statusFilter, onStatusChange,
    startDate, onStartDateChange,
    endDate, onEndDateChange
}) => {
    return (
        <div className="mb-4 space-y-4">
            <input
                type="text"
                placeholder="Search by name or item..."
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                className="w-full px-4 py-2 border border-primary-gold/50 rounded-lg focus:ring-primary-gold focus:border-primary-gold bg-ivory/50"
            />
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* Date From */}
                    <div>
                        <label htmlFor="start-date" className="block text-xs font-medium text-text-main/80 mb-1">From Date</label>
                        <input
                            type="date"
                            id="start-date"
                            value={startDate}
                            onChange={(e) => onStartDateChange(e.target.value)}
                            className="w-full px-4 py-2 border border-primary-gold/50 rounded-lg focus:ring-primary-gold focus:border-primary-gold bg-ivory/50"
                            aria-label="Start date for filtering"
                        />
                    </div>
                    {/* Date To */}
                    <div>
                        <label htmlFor="end-date" className="block text-xs font-medium text-text-main/80 mb-1">To Date</label>
                        <input
                            type="date"
                            id="end-date"
                            value={endDate}
                            onChange={(e) => onEndDateChange(e.target.value)}
                            className="w-full px-4 py-2 border border-primary-gold/50 rounded-lg focus:ring-primary-gold focus:border-primary-gold bg-ivory/50"
                            aria-label="End date for filtering"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {/* Purity */}
                    <div>
                        <label htmlFor="purity-filter" className="block text-xs font-medium text-text-main/80 mb-1">Purity</label>
                        <div className="relative">
                            <select
                                id="purity-filter"
                                value={purityFilter}
                                onChange={(e) => onPurityChange(e.target.value)}
                                className="w-full appearance-none px-4 py-2 border border-primary-gold/50 rounded-lg focus:ring-primary-gold focus:border-primary-gold bg-ivory/50 pr-8"
                                aria-label="Filter by purity"
                            >
                                <option value="All">All Purities</option>
                                {PURITIES.map(purity => (
                                    <option key={purity} value={purity}>{purity}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-main/70">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>
                    {/* Status */}
                    <div>
                        <label htmlFor="status-filter" className="block text-xs font-medium text-text-main/80 mb-1">Status</label>
                        <div className="relative">
                            <select
                                id="status-filter"
                                value={statusFilter}
                                onChange={(e) => onStatusChange(e.target.value)}
                                className="w-full appearance-none px-4 py-2 border border-primary-gold/50 rounded-lg focus:ring-primary-gold focus:border-primary-gold bg-ivory/50 pr-8"
                                aria-label="Filter by status"
                            >
                                <option value="All">All Statuses</option>
                                {Object.values(TransactionStatus).filter(s => s !== TransactionStatus.Deleted).map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-main/70">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Memoize component as it's a pure presentational component whose re-render depends only on props.
export default React.memo(SearchBar);