import React, { useMemo, useState, useCallback } from 'react';
import { Transaction, Customer, Item, TransactionStatus, PURITIES } from '../types';
import { 
    CalendarIcon, ClockIcon, TrendingUpIcon, StatisticsIcon, FilterIcon, 
    UsersIcon, TagIcon, ArrowUpIcon, ArrowDownIcon, UserRemoveIcon 
} from './Icons';

// Helper function to calculate duration in milliseconds
const calculateDurationMs = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) {
        return 0;
    }
    return endDate.getTime() - startDate.getTime();
};

// Helper function to format duration from milliseconds into a human-readable string
const formatDurationFromMs = (ms: number): string => {
    if (ms <= 0) return '-';
    let diff = ms / 1000;
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
    return parts.join(' ') || '0m';
};


// A reusable stat card component
const StatCard: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
    <div className={`bg-ivory/60 p-4 rounded-lg border border-primary-gold/20 shadow-sm flex flex-col ${className}`}>
        <div className="flex items-center justify-between mb-3 border-b border-primary-gold/20 pb-2">
            <h3 className="text-lg font-serif font-bold text-accent-maroon">{title}</h3>
            {icon && <div className="text-primary-gold">{icon}</div>}
        </div>
        <div className="flex-grow">{children}</div>
    </div>
);


// A reusable stat item component for key-value pairs
const StatItem: React.FC<{ label: string; value?: string | number; valueClassName?: string; children?: React.ReactNode }> = ({ label, value, valueClassName = '', children }) => (
    <div className="flex justify-between items-center py-1.5">
        <span className="text-sm text-text-main/80">{label}</span>
        {children ? (
             <div className={`text-sm font-semibold text-text-main text-right ${valueClassName}`}>{children}</div>
        ) : (
            <span className={`text-sm font-semibold text-text-main ${valueClassName}`}>{value}</span>
        )}
    </div>
);


// A component for rendering bar charts
const StatBar: React.FC<{ label: string; value: number; total: number; color: string }> = ({ label, value, total, color }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium text-text-main/90">{label}</span>
                <span className="text-text-main/70">{value} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-primary-gold/20 rounded-full h-2.5">
                <div className={`${color} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

interface StatisticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    customers: Customer[];
    items: Item[];
}

const StatisticsModal: React.FC<StatisticsModalProps> = ({ isOpen, onClose, transactions, customers, items }) => {
    
    const [customerFilter, setCustomerFilter] = useState<string>('All');
    const [purityFilter, setPurityFilter] = useState<string>('All');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);
    const [showAllCustomers, setShowAllCustomers] = useState<boolean>(false);
    const [showAllItems, setShowAllItems] = useState<boolean>(false);
    const [showAllPurity, setShowAllPurity] = useState<boolean>(false);
    const [showAllSaleProfiles, setShowAllSaleProfiles] = useState<boolean>(false);
    const [showAllSaleItems, setShowAllSaleItems] = useState<boolean>(false);
    
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const customerMatch = customerFilter === 'All' || t.name === customerFilter;
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

            return customerMatch && purityMatch && statusMatch && dateMatch;
        });
    }, [transactions, customerFilter, purityFilter, statusFilter, startDate, endDate]);

    const stats = useMemo(() => {
        if (filteredTransactions.length === 0) return null;

        const now = new Date();
        
        const uniqueCustomersInFilter = new Set(filteredTransactions.map(t => t.name)).size;
        const uniqueItemsInFilter = new Set(filteredTransactions.map(t => t.item)).size;

        const totalSale = filteredTransactions.reduce((acc, t) => acc + (t.sale || 0), 0);
        const transactionsWithSale = filteredTransactions.filter(t => t.sale && t.sale > 0);
        const averageSale = transactionsWithSale.length > 0 ? totalSale / transactionsWithSale.length : 0;
        
        let longestOpenTransaction: { transaction: Transaction; duration: string } | null = null;
        const openTransactions = filteredTransactions.filter(t => t.status === TransactionStatus.NotReturned && t.date);
        if (openTransactions.length > 0) {
            const oldest = openTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
            const durationMs = calculateDurationMs(oldest.date, now.toISOString());
            longestOpenTransaction = { transaction: oldest, duration: formatDurationFromMs(durationMs) };
        }

        let quickestTurnaround: { transaction: Transaction; duration: string } | null = null;
        const completedTransactions = filteredTransactions.filter(t => t.date && t.returnTime);
        if (completedTransactions.length > 0) {
            const quickest = completedTransactions.map(t => ({
                transaction: t,
                durationMs: calculateDurationMs(t.date, t.returnTime)
            })).filter(t => t.durationMs > 0).sort((a, b) => a.durationMs - b.durationMs)[0];

            if (quickest) {
                quickestTurnaround = { transaction: quickest.transaction, duration: formatDurationFromMs(quickest.durationMs) };
            }
        }
        
        const monthlyBreakdown = filteredTransactions.reduce((acc: Record<string, { count: number; totalSale: number }>, t) => {
            if (!t.date) return acc;
            const month = t.date.substring(0, 7); // YYYY-MM
            if (!acc[month]) {
                acc[month] = { count: 0, totalSale: 0 };
            }
            acc[month].count++;
            acc[month].totalSale += t.sale || 0;
            return acc;
        }, {});

        const uniqueDays = new Set(filteredTransactions.filter(t => t.date).map(t => t.date.split('T')[0]));
        const avgTransactionsPerDay = uniqueDays.size > 0 ? filteredTransactions.length / uniqueDays.size : 0;
        const avgSalePerDay = uniqueDays.size > 0 ? totalSale / uniqueDays.size : 0;
        
        const customerFrequency = filteredTransactions.reduce((acc: Record<string, number>, t) => {
            acc[t.name] = (acc[t.name] || 0) + 1;
            return acc;
        }, {});
        // Fix: Ensure destructuring handles empty objects gracefully
        const [mostFrequentCustomer, customerCount] = Object.entries(customerFrequency).sort(([, a], [, b]) => (b as number) - (a as number))[0] || ['-', 0];
        
        const itemFrequency = filteredTransactions.reduce((acc: Record<string, { count: number }>, t) => {
            if (!acc[t.item]) acc[t.item] = { count: 0 };
            acc[t.item].count++;
            return acc;
        }, {});
        const allItemsByFrequency = Object.entries(itemFrequency).sort(([, a], [, b]) => b.count - a.count);

        
        const purityBreakdown = filteredTransactions.reduce((acc: Record<string, { count: number; totalSale: number }>, t) => {
            if (t.quality) {
                if (!acc[t.quality]) acc[t.quality] = { count: 0, totalSale: 0 };
                acc[t.quality].count += 1;
                acc[t.quality].totalSale += t.sale || 0;
            }
            return acc;
        }, {});
        
        const statusBreakdown = filteredTransactions.reduce((acc: Record<TransactionStatus, number>, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {} as Record<TransactionStatus, number>);
        
        const customerSales = filteredTransactions.reduce((acc: Record<string, number>, t) => {
            if (t.sale && t.sale > 0) {
                acc[t.name] = (acc[t.name] || 0) + t.sale;
            }
            return acc;
        }, {});
        const allCustomersBySale = Object.entries(customerSales).sort(([, a], [, b]) => b - a);

        const itemSales = filteredTransactions.reduce((acc: Record<string, number>, t) => {
            if (t.sale && t.sale > 0) {
                acc[t.item] = (acc[t.item] || 0) + t.sale;
            }
            return acc;
        }, {});
        const allItemsBySale = Object.entries(itemSales).sort(([, a], [, b]) => b - a);


        const customerPurityProfile = filteredTransactions.reduce((acc: Record<string, { '916': number, '750': number, total: number }>, t) => {
            if (t.quality) {
                if (!acc[t.name]) {
                    acc[t.name] = { '916': 0, '750': 0, total: 0 };
                }
                acc[t.name][t.quality]++;
                acc[t.name].total++;
            }
            return acc;
        }, {});

        const puritySpecialists = Object.entries(customerPurityProfile)
            .map(([name, data]) => {
                let specialization: '916' | '750' | null = null;
                // Consider a specialist if >90% of their transactions are of one type.
                if (data.total > 1 && data['916'] / data.total > 0.9) {
                    specialization = '916';
                } else if (data.total > 1 && data['750'] / data.total > 0.9) {
                    specialization = '750';
                }
                return { name, specialization };
            })
            .filter(c => c.specialization !== null);

        const customerTransactionProfile = filteredTransactions.reduce((acc: Record<string, { total: number; nonSale: number }>, t) => {
            if (!acc[t.name]) {
                acc[t.name] = { total: 0, nonSale: 0 };
            }
            acc[t.name].total++;
            if (t.sale === null || t.sale <= 0) {
                acc[t.name].nonSale++;
            }
            return acc;
        }, {});

        const customerSaleProfiles = Object.entries(customerTransactionProfile)
            .map(([name, data]) => ({
                name,
                ...data,
                nonSaleRatio: data.total > 0 ? data.nonSale / data.total : 0,
            }))
            .sort((a, b) => b.nonSaleRatio - a.nonSaleRatio || b.total - a.total);


        return {
            totalTransactions: filteredTransactions.length,
            totalSale,
            uniqueCustomers: uniqueCustomersInFilter,
            uniqueItems: uniqueItemsInFilter,
            averageSale,
            transactionsWithSaleCount: transactionsWithSale.length,
            mostFrequentCustomer: { name: mostFrequentCustomer, count: customerCount as number },
            allItemsByFrequency,
            purityBreakdown,
            statusBreakdown,
            longestOpenTransaction,
            quickestTurnaround,
            monthlyBreakdown,
            avgTransactionsPerDay,
            avgSalePerDay,
            allCustomersBySale,
            allItemsBySale,
            puritySpecialists,
            customerSaleProfiles,
        };
    }, [filteredTransactions]);
    
    const handleResetFilters = useCallback(() => {
        setCustomerFilter('All');
        setPurityFilter('All');
        setStatusFilter('All');
        setStartDate('');
        setEndDate('');
        setActiveDatePreset(null);
        setShowAllCustomers(false);
        setShowAllItems(false);
        setShowAllPurity(false);
        setShowAllSaleProfiles(false);
        setShowAllSaleItems(false);
    }, []);

    const handleDatePresetClick = useCallback((preset: string) => {
        const today = new Date();
        let start = new Date();
        const end = today;

        switch (preset) {
            case 'daily':
                start = today;
                break;
            case 'weekly':
                start.setDate(today.getDate() - today.getDay()); // Sunday as start of week
                break;
            case 'monthly':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'quarterly':
                const quarter = Math.floor(today.getMonth() / 3);
                start = new Date(today.getFullYear(), quarter * 3, 1);
                break;
            case 'yearly':
                start = new Date(today.getFullYear(), 0, 1);
                break;
            default:
                break;
        }

        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
        setActiveDatePreset(preset);
    }, []);

    const handleStartDateChange = (date: string) => {
        setStartDate(date);
        setActiveDatePreset(null); // Clear preset when custom date is chosen
    };

    const handleEndDateChange = (date: string) => {
        setEndDate(date);
        setActiveDatePreset(null); // Clear preset when custom date is chosen
    };


    if (!isOpen) return null;
    
    const filterFieldClass = "w-full px-3 py-2 text-sm border border-primary-gold/50 rounded-lg focus:ring-primary-gold focus:border-primary-gold bg-ivory/80";

    const InsightListItem: React.FC<{ label: string, value: string | number, valueSuffix?: string, valueClass?: string }> = ({ label, value, valueSuffix, valueClass = 'text-green-700' }) => (
        <li className="flex justify-between items-center text-sm py-1">
            <span className="text-text-main truncate pr-2">{label}</span>
            <span className={`font-semibold whitespace-nowrap ${valueClass}`}>{value} <span className="text-xs font-normal">{valueSuffix}</span></span>
        </li>
    );

    const customersToShow = stats ? (showAllCustomers ? stats.allCustomersBySale : stats.allCustomersBySale.slice(0, 5)) : [];
    const itemsToShow = stats ? (showAllItems ? stats.allItemsByFrequency : stats.allItemsByFrequency.slice(0, 5)) : [];
    const saleItemsToShow = stats ? (showAllSaleItems ? stats.allItemsBySale : stats.allItemsBySale.slice(0, 5)) : [];
    const purityPrefsToShow = stats ? (showAllPurity ? stats.puritySpecialists : stats.puritySpecialists.slice(0, 5)) : [];
    const saleProfilesToShow = stats ? (showAllSaleProfiles ? stats.customerSaleProfiles : stats.customerSaleProfiles.slice(0, 5)) : [];


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
                className="bg-ivory rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 md:p-6 border-b border-primary-gold/20 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-serif font-bold text-accent-maroon">
                        Transaction Dashboard
                    </h2>
                    <button onClick={onClose} className="text-text-main/60 hover:text-accent-maroon" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-4 md:p-6 overflow-y-auto">
                    <div className="bg-ivory/60 p-4 rounded-lg border border-primary-gold/20 shadow-sm mb-6">
                        <h3 className="text-lg font-serif font-bold text-accent-maroon mb-4 flex items-center gap-2">
                            <FilterIcon /> Filters
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-medium text-text-main/80 mb-1">Customer</label>
                                <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} className={filterFieldClass}>
                                    <option value="All">All Customers</option>
                                    {customers.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-main/80 mb-1">Purity</label>
                                <select value={purityFilter} onChange={e => setPurityFilter(e.target.value)} className={filterFieldClass}>
                                    <option value="All">All Purities</option>
                                    {PURITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-text-main/80 mb-1">Status</label>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={filterFieldClass}>
                                    <option value="All">All Statuses</option>
                                    {Object.values(TransactionStatus).filter(s => s !== TransactionStatus.Deleted).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-main/80 mb-1">From Date</label>
                                <input type="date" value={startDate} onChange={e => handleStartDateChange(e.target.value)} className={filterFieldClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-text-main/80 mb-1">To Date</label>
                                <input type="date" value={endDate} onChange={e => handleEndDateChange(e.target.value)} className={filterFieldClass} />
                            </div>
                            <button onClick={handleResetFilters} className="w-full bg-ivory border border-primary-gold text-primary-gold font-bold py-2 px-4 rounded-lg hover:bg-primary-gold/10 transition-colors text-sm">
                                Reset
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].map(preset => {
                                const presetLower = preset.toLowerCase();
                                const isActive = activeDatePreset === presetLower;
                                return (
                                    <button
                                        key={preset}
                                        onClick={() => handleDatePresetClick(presetLower)}
                                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                            isActive 
                                            ? 'bg-primary-gold text-white shadow-sm' 
                                            : 'bg-transparent text-primary-gold hover:bg-primary-gold/10 border border-primary-gold/50'
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {transactions.length === 0 ? (
                         <div className="text-center py-16 px-6">
                             <StatisticsIcon className="mx-auto h-24 w-24 text-primary-gold/30" />
                            <h3 className="mt-4 text-xl font-semibold text-text-main">
                                No Data to Analyze
                            </h3>
                            <p className="mt-2 text-base text-text-main/70">
                                Start by adding some transactions to see your dashboard come to life.
                            </p>
                        </div>
                    ) : stats ? (
                        <div className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard title="Total Transactions" className="text-center justify-center">
                                    <p className="text-5xl font-bold text-accent-maroon">{stats.totalTransactions}</p>
                                </StatCard>
                                <StatCard title="Total Sale" className="text-center justify-center">
                                    <p className="text-5xl font-bold text-green-700">{stats.totalSale.toFixed(3)}<span className="text-2xl ml-1">gm</span></p>
                                </StatCard>
                                <StatCard title="Unique Customers" className="text-center justify-center">
                                    <p className="text-5xl font-bold text-accent-maroon">{stats.uniqueCustomers}</p>
                                </StatCard>
                                <StatCard title="Unique Items" className="text-center justify-center">
                                    <p className="text-5xl font-bold text-accent-maroon">{stats.uniqueItems}</p>
                                </StatCard>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                <StatCard title="Key Metrics" className="md:col-span-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                        <StatItem label="Avg Sale per Transaction" value={`${stats.averageSale.toFixed(3)} gm`} />
                                        <StatItem label="Transactions w/ Sale" value={stats.transactionsWithSaleCount} />
                                        <StatItem label="Avg Transactions per Day" value={stats.avgTransactionsPerDay.toFixed(1)} />
                                        <StatItem label="Avg Sale per Day" value={`${stats.avgSalePerDay.toFixed(3)} gm`} />
                                        <StatItem label="Most Frequent Customer">
                                            <span>{stats.mostFrequentCustomer.name} <span className="text-xs">({stats.mostFrequentCustomer.count}x)</span></span>
                                        </StatItem>
                                    </div>
                                </StatCard>
                                
                                <StatCard title="Performance" icon={<ClockIcon />} className="md:col-span-2">
                                    <div className="space-y-3">
                                        <StatItem label="Quickest Turnaround">
                                        {stats.quickestTurnaround ? (
                                                <div>
                                                    <p className="font-bold">{stats.quickestTurnaround.duration}</p>
                                                    <p className="text-xs text-text-main/60">{stats.quickestTurnaround.transaction.name} - {stats.quickestTurnaround.transaction.item}</p>
                                                </div>
                                        ) : <span>-</span>}
                                        </StatItem>
                                        <StatItem label="Longest Open Transaction">
                                        {stats.longestOpenTransaction ? (
                                                <div>
                                                    <p className="font-bold">{stats.longestOpenTransaction.duration}</p>
                                                    <p className="text-xs text-text-main/60">{stats.longestOpenTransaction.transaction.name} - {stats.longestOpenTransaction.transaction.item}</p>
                                                </div>
                                        ) : <span>-</span>}
                                        </StatItem>
                                    </div>
                                </StatCard>
                                
                                <StatCard title="Purity Breakdown" className="lg:col-span-2">
                                    <div className="space-y-4">
                                        {Object.entries(stats.purityBreakdown).map(([purity, data]) => (
                                            <StatBar key={purity} label={`${purity} (${(data as any).totalSale.toFixed(3)} gm)`} value={(data as any).count} total={stats.totalTransactions} color={purity === '916' ? 'bg-primary-gold' : 'bg-highlight-red'} />
                                        ))}
                                    </div>
                                </StatCard>
                                <StatCard title="Status Breakdown" className="lg:col-span-2">
                                    <div className="space-y-4">
                                        {Object.entries(stats.statusBreakdown).sort(([, countA], [, countB]) => (countB as number) - (countA as number)).map(([status, count]) => (
                                            <StatBar key={status} label={status} value={count as number} total={stats.totalTransactions} color="bg-accent-maroon/80" />
                                        ))}
                                    </div>
                                </StatCard>
                                
                                <StatCard title="Monthly Trends" icon={<TrendingUpIcon />} className="lg:col-span-4">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-text-main/70 uppercase">
                                                <tr>
                                                    <th className="py-2 px-3">Month</th>
                                                    <th className="py-2 px-3 text-right">Transactions</th>
                                                    <th className="py-2 px-3 text-right">Total Sale (gm)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Object.entries(stats.monthlyBreakdown).sort(([a], [b]) => b.localeCompare(a)).map(([month, data]) => (
                                                    <tr key={month} className="border-b border-primary-gold/10 last:border-b-0">
                                                        <td className="py-2 px-3 font-medium">
                                                            {new Date(`${month}-02`).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                        </td>
                                                        <td className="py-2 px-3 text-right">{(data as any).count}</td>
                                                        <td className="py-2 px-3 text-right font-semibold text-green-700">{(data as any).totalSale.toFixed(3)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </StatCard>

                                <div className="lg:col-span-4 border-t-2 border-primary-gold/20 pt-6">
                                     <h3 className="text-xl font-serif font-bold text-accent-maroon mb-4 text-center">Customer & Item Insights</h3>
                                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                        <div className="bg-ivory/60 p-4 rounded-lg border border-primary-gold/20 shadow-sm flex flex-col md:col-span-2 xl:col-span-4">
                                            <div className="flex items-center justify-between mb-3 border-b border-primary-gold/20 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-serif font-bold text-accent-maroon">Customer Sales Ranking</h3>
                                                    <div className="text-primary-gold"><TrendingUpIcon /></div>
                                                </div>
                                                {stats.allCustomersBySale.length > 5 && (
                                                    <button
                                                        onClick={() => setShowAllCustomers(!showAllCustomers)}
                                                        className="text-xs font-semibold text-primary-gold hover:underline focus:outline-none"
                                                    >
                                                        {showAllCustomers ? 'Show Less' : 'Show All'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex-grow">
                                                {customersToShow.length > 0 ? (
                                                    <div className={`${showAllCustomers ? 'max-h-64 overflow-y-auto' : ''} pr-2 -mr-2`}>
                                                        <ul className="space-y-1">
                                                            {customersToShow.map(([name, sale]) => (
                                                                <InsightListItem key={name} label={name} value={(sale as number).toFixed(3)} valueSuffix="gm" />
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ) : <p className="text-sm text-text-main/70 text-center py-4">No sales data for customers in this period.</p>}
                                            </div>
                                        </div>

                                        <div className="bg-ivory/60 p-4 rounded-lg border border-primary-gold/20 shadow-sm flex flex-col">
                                            <div className="flex items-center justify-between mb-3 border-b border-primary-gold/20 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-serif font-bold text-accent-maroon">Taken Items Ranking</h3>
                                                    <div className="text-primary-gold"><TagIcon /></div>
                                                </div>
                                                {stats.allItemsByFrequency.length > 5 && (
                                                    <button onClick={() => setShowAllItems(!showAllItems)} className="text-xs font-semibold text-primary-gold hover:underline focus:outline-none">
                                                        {showAllItems ? 'Show Less' : 'Show All'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex-grow">
                                                {itemsToShow.length > 0 ? (
                                                    <div className={`${showAllItems ? 'max-h-64 overflow-y-auto' : ''} pr-2 -mr-2`}>
                                                        <ul className="space-y-1">
                                                        {itemsToShow.map(([name, data]) => <InsightListItem key={name} label={name} value={(data as any).count} valueSuffix="times" valueClass="text-accent-maroon" />)}
                                                        </ul>
                                                    </div>
                                                ) : <p className="text-sm text-text-main/70">Not enough data.</p>}
                                            </div>
                                        </div>

                                        <div className="bg-ivory/60 p-4 rounded-lg border border-primary-gold/20 shadow-sm flex flex-col">
                                            <div className="flex items-center justify-between mb-3 border-b border-primary-gold/20 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-serif font-bold text-accent-maroon">Sale Items Ranking</h3>
                                                    <div className="text-primary-gold"><TrendingUpIcon /></div>
                                                </div>
                                                {stats.allItemsBySale.length > 5 && (
                                                    <button onClick={() => setShowAllSaleItems(!showAllSaleItems)} className="text-xs font-semibold text-primary-gold hover:underline focus:outline-none">
                                                        {showAllSaleItems ? 'Show Less' : 'Show All'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex-grow">
                                                {saleItemsToShow.length > 0 ? (
                                                    <div className={`${showAllSaleItems ? 'max-h-64 overflow-y-auto' : ''} pr-2 -mr-2`}>
                                                        <ul className="space-y-1">
                                                        {saleItemsToShow.map(([name, sale]) => (
                                                            <InsightListItem key={name} label={name} value={(sale as number).toFixed(3)} valueSuffix="gm" />
                                                        ))}
                                                        </ul>
                                                    </div>
                                                ) : <p className="text-sm text-text-main/70">Not enough data.</p>}
                                            </div>
                                        </div>

                                        <div className="bg-ivory/60 p-4 rounded-lg border border-primary-gold/20 shadow-sm flex flex-col">
                                            <div className="flex items-center justify-between mb-3 border-b border-primary-gold/20 pb-2">
                                                 <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-serif font-bold text-accent-maroon">Customer Purity Preference</h3>
                                                    <div className="text-primary-gold"><UsersIcon /></div>
                                                </div>
                                                {stats.puritySpecialists.length > 5 && (
                                                    <button onClick={() => setShowAllPurity(!showAllPurity)} className="text-xs font-semibold text-primary-gold hover:underline focus:outline-none">
                                                        {showAllPurity ? 'Show Less' : 'Show All'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex-grow">
                                                {purityPrefsToShow.length > 0 ? (
                                                    <div className={`${showAllPurity ? 'max-h-64 overflow-y-auto' : ''} pr-2 -mr-2`}>
                                                        <ul className="space-y-1">
                                                            {purityPrefsToShow.map(({ name, specialization }) => (
                                                                <li key={name} className="flex justify-between items-center text-sm py-1">
                                                                <span className="text-text-main truncate pr-2">{name}</span>
                                                                <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${specialization === '916' ? 'bg-primary-gold text-white' : 'bg-highlight-red text-white'}`}>
                                                                        Prefers {specialization}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                ) : <p className="text-sm text-text-main/70">No distinct preferences found.</p>}
                                            </div>
                                        </div>

                                        <div className="bg-ivory/60 p-4 rounded-lg border border-primary-gold/20 shadow-sm flex flex-col">
                                            <div className="flex items-center justify-between mb-3 border-b border-primary-gold/20 pb-2">
                                                 <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-serif font-bold text-accent-maroon">Customer Transaction Profile</h3>
                                                    <div className="text-primary-gold"><UsersIcon /></div>
                                                </div>
                                                {stats.customerSaleProfiles.length > 5 && (
                                                    <button onClick={() => setShowAllSaleProfiles(!showAllSaleProfiles)} className="text-xs font-semibold text-primary-gold hover:underline focus:outline-none">
                                                        {showAllSaleProfiles ? 'Show Less' : 'Show All'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex-grow">
                                                {saleProfilesToShow.length > 0 ? (
                                                    <div className={`${showAllSaleProfiles ? 'max-h-64 overflow-y-auto' : ''} pr-2 -mr-2`}>
                                                        <ul className="space-y-1">
                                                        {saleProfilesToShow.map(({ name, total, nonSale, nonSaleRatio }) => (
                                                            <li key={name} className="flex justify-between items-center text-sm py-1">
                                                                <span className="text-text-main truncate pr-2">{name}</span>
                                                                <span className={`font-semibold whitespace-nowrap ${nonSaleRatio >= 0.8 ? 'text-highlight-red' : 'text-text-main'}`}>
                                                                    {nonSale}/{total} <span className="text-xs font-normal">no-sale ({(nonSaleRatio * 100).toFixed(0)}%)</span>
                                                                </span>
                                                            </li>
                                                        ))}
                                                        </ul>
                                                    </div>
                                                ) : <p className="text-sm text-text-main/70">No customer data for this period.</p>}
                                            </div>
                                        </div>
                                     </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                         <div className="text-center py-16 px-6">
                            <FilterIcon className="mx-auto h-24 w-24 text-primary-gold/30" />
                            <h3 className="mt-4 text-xl font-semibold text-text-main">No Results Found</h3>
                            <p className="mt-2 text-base text-text-main/70">No transactions match the selected filters. Try adjusting your criteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(StatisticsModal);