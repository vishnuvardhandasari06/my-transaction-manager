
import React from 'react';

interface SearchBarProps {
    searchTerm: string;
    onSearch: (term: string) => void;
    purityFilter: string;
    onPurityChange: (purity: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onSearch, purityFilter, onPurityChange }) => {
    return (
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <input
                type="text"
                placeholder="Search by name, item, or time..."
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                className="flex-grow px-4 py-2 border border-primary-gold/50 rounded-lg focus:ring-primary-gold focus:border-primary-gold bg-ivory/50"
            />
             <div className="relative">
                <select
                    value={purityFilter}
                    onChange={(e) => onPurityChange(e.target.value)}
                    className="w-full sm:w-auto appearance-none px-4 py-2 border border-primary-gold/50 rounded-lg focus:ring-primary-gold focus:border-primary-gold bg-ivory/50 pr-8"
                    aria-label="Filter by purity"
                >
                    <option value="All">All Purities</option>
                    <option value="916">916</option>
                    <option value="750">750</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-main/70">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
        </div>
    );
};

// Memoize component as it's a pure presentational component whose re-render depends only on props.
export default React.memo(SearchBar);
