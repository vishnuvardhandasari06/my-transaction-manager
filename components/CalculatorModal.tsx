import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DeleteIcon } from './Icons';

interface CalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface CalculationParams {
    id: string;
    goldPrice: string;
    goldWeight: string;
    purity: '916' | '750';
    minPercent: string;
    maxPercent: string;
    selectedPercent?: number;
}

interface ResultDetail {
    percent: number;
    wastageValue: number;
    purityValue: number;
    total: number;
    wastageInGrams: number;
}

const formatCurrency = (num: number) => num.toLocaleString("en-IN", {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const GoldCalculator: React.FC = () => {
    const [goldPrice, setGoldPrice] = useState('');
    const [goldWeight, setGoldWeight] = useState('');
    const [purity, setPurity] = useState<'916' | '750'>('916');
    const [minPercent, setMinPercent] = useState('3');
    const [maxPercent, setMaxPercent] = useState('10');
    const [errors, setErrors] = useState<Partial<Record<keyof Omit<CalculationParams, 'id' | 'purity' | 'selectedPercent'>, string>>>({});
    
    const [results, setResults] = useState<ResultDetail[]>([]);
    const [selectedResult, setSelectedResult] = useState<ResultDetail | null>(null);

    const [savedCalculations, setSavedCalculations] = useLocalStorage<CalculationParams[]>('goldCalculatorSaves', []);
    const [loadRequest, setLoadRequest] = useState<CalculationParams | null>(null);

    const validate = useCallback(() => {
        const newErrors: Partial<Record<keyof Omit<CalculationParams, 'id' | 'purity' | 'selectedPercent'>, string>> = {};
        if (!goldPrice || parseFloat(goldPrice) <= 0) newErrors.goldPrice = 'Invalid price';
        if (!goldWeight || parseFloat(goldWeight) <= 0) newErrors.goldWeight = 'Invalid weight';
        if (!minPercent || parseInt(minPercent, 10) < 0) newErrors.minPercent = 'Invalid %';
        if (!maxPercent || parseInt(maxPercent, 10) < 0) newErrors.maxPercent = 'Invalid %';
        if (parseInt(minPercent, 10) > parseInt(maxPercent, 10)) newErrors.maxPercent = 'Max must be >= min';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [goldPrice, goldWeight, minPercent, maxPercent]);

    const calculateAndSelect = useCallback((selectedPercent?: number) => {
        if (!validate()) {
            setResults([]);
            setSelectedResult(null);
            return;
        };

        const price = parseFloat(goldPrice);
        const weight = parseFloat(goldWeight);
        const purityDecimal = purity === '916' ? 0.92 : 0.75;

        const min = parseInt(minPercent, 10);
        const max = parseInt(maxPercent, 10);
        const newResults: ResultDetail[] = [];

        for (let i = min; i <= max; i++) {
            const wastagePercentDecimal = i / 100;
            const purityValue = weight * purityDecimal * price;
            const wastageValue = weight * wastagePercentDecimal * price;
            const total = purityValue + wastageValue;
            
            // As per user request: WastageInGrams = wastageValue / (pricePerGram × purity)
            const rateOfAlloyedGold = price * purityDecimal;
            const wastageInGrams = rateOfAlloyedGold > 0 ? wastageValue / rateOfAlloyedGold : 0;
            
            newResults.push({ percent: i, wastageValue, purityValue, total, wastageInGrams });
        }
        setResults(newResults);

        if (selectedPercent !== undefined) {
            const resultToSelect = newResults.find(r => r.percent === selectedPercent);
            setSelectedResult(resultToSelect || newResults[0] || null);
        } else {
            setSelectedResult(newResults[0] || null);
        }
    }, [goldPrice, goldWeight, purity, minPercent, maxPercent, validate]);

    useEffect(() => {
        if (loadRequest) {
            calculateAndSelect(loadRequest.selectedPercent);
            setLoadRequest(null);
        }
    }, [loadRequest, calculateAndSelect]);

    const handleCalculate = useCallback(() => {
        calculateAndSelect();
    }, [calculateAndSelect]);

    const handleSave = () => {
        if (!validate()) return;
        const newSave: CalculationParams = {
            id: Date.now().toString(),
            goldPrice, goldWeight, purity, minPercent, maxPercent,
            selectedPercent: selectedResult?.percent,
        };
        setSavedCalculations(prev => [newSave, ...prev.slice(0, 9)]); // Limit to 10 saves
    };

    const loadCalculation = (params: CalculationParams) => {
        setGoldPrice(params.goldPrice);
        setGoldWeight(params.goldWeight);
        setPurity(params.purity);
        setMinPercent(params.minPercent);
        setMaxPercent(params.maxPercent);
        setLoadRequest(params);
    };

    const deleteCalculation = (id: string) => {
        setSavedCalculations(prev => prev.filter(c => c.id !== id));
    };

    const renderInputField = (label: string, value: string, setter: (val: string) => void, name: keyof typeof errors, placeholder: string) => (
        <div>
            <label className="block text-sm font-medium text-text-main/90">{label}</label>
            <input
                type="number"
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={placeholder}
                className={`mt-1 block w-full px-3 py-2 bg-ivory/50 border ${errors[name] ? 'border-highlight-red' : 'border-primary-gold/50'} rounded-md shadow-sm focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm`}
            />
            {errors[name] && <p className="mt-1 text-xs text-highlight-red">{errors[name]}</p>}
        </div>
    );

    return (
        <div className="flex-grow p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 overflow-y-auto">
            {/* Left Column: Inputs & Saved */}
            <div className="flex flex-col gap-6">
                <div className="bg-ivory/60 p-4 rounded-lg border border-primary-gold/20 shadow-sm">
                    <h3 className="text-lg font-serif font-bold text-accent-maroon mb-4">Parameters</h3>
                    <div className="space-y-4">
                        {renderInputField("Gold Price (per gram)", goldPrice, setGoldPrice, 'goldPrice', 'e.g., 7200')}
                        {renderInputField("Gold Weight (grams)", goldWeight, setGoldWeight, 'goldWeight', 'e.g., 10')}
                        <div>
                             <label className="block text-sm font-medium text-text-main/90">Purity</label>
                             <select value={purity} onChange={e => setPurity(e.target.value as '916' | '750')} className="mt-1 block w-full px-3 py-2 bg-ivory/50 border border-primary-gold/50 rounded-md shadow-sm focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm">
                                <option value="916">916 (22K)</option>
                                <option value="750">750 (18K)</option>
                             </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {renderInputField("Min Wastage %", minPercent, setMinPercent, 'minPercent', 'e.g., 3')}
                            {renderInputField("Max Wastage %", maxPercent, setMaxPercent, 'maxPercent', 'e.g., 10')}
                        </div>
                        <div className="flex gap-4 pt-2">
                             <button onClick={handleCalculate} className="w-full bg-primary-gold text-text-main font-bold py-2 px-4 rounded-lg hover:bg-button-hover-gold transition-colors">Calculate</button>
                             <button onClick={handleSave} className="w-full bg-ivory border border-primary-gold text-primary-gold font-bold py-2 px-4 rounded-lg hover:bg-primary-gold/10 transition-colors">Save</button>
                        </div>
                    </div>
                </div>
                <div className="flex-grow flex flex-col">
                    <h3 className="text-lg font-serif font-bold text-accent-maroon mb-2">Saved Calculations</h3>
                    <div className="flex-grow bg-ivory/60 p-2 rounded-lg border border-primary-gold/20 shadow-sm overflow-y-auto">
                       {savedCalculations.length > 0 ? (
                           <ul className="space-y-2">
                               {savedCalculations.map(c => (
                                   <li key={c.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-primary-gold/10 transition-colors">
                                       <button onClick={() => loadCalculation(c)} className="text-left flex-grow">
                                            <p className="font-semibold text-text-main">
                                                {c.goldWeight}g - {c.purity}
                                                {c.selectedPercent !== undefined
                                                    ? <span className="text-accent-maroon"> - Selected: {c.selectedPercent}%</span>
                                                    : ` - ${c.minPercent}% to ${c.maxPercent}%`
                                                }
                                            </p>
                                            <p className="text-xs text-text-main/70">@ {formatCurrency(parseFloat(c.goldPrice) || 0)}/g</p>
                                       </button>
                                       <button onClick={() => deleteCalculation(c.id)} className="ml-2 p-1 text-highlight-red/50 hover:text-highlight-red opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete saved calculation">
                                           <DeleteIcon />
                                       </button>
                                   </li>
                               ))}
                           </ul>
                       ) : (
                           <p className="text-center text-sm text-text-main/60 p-4">No saved calculations yet.</p>
                       )}
                    </div>
                </div>
            </div>

            {/* Right Column: Results */}
            <div className="bg-ivory/60 p-4 rounded-lg border border-primary-gold/20 shadow-sm flex flex-col">
                <h3 className="text-lg font-serif font-bold text-accent-maroon mb-4">Results</h3>
                
                {results.length > 0 && selectedResult ? (
                    <div className="mb-4 bg-white/50 p-4 rounded-md shadow-inner border border-primary-gold/10">
                        <h4 className="font-semibold text-text-main text-center mb-3 text-lg">
                            Details for {selectedResult.percent}% Wastage
                        </h4>
                        <div className="space-y-2 text-md">
                            <div className="flex justify-between">
                                <span className="text-text-main/80">Purity Value:</span>
                                <span className="font-medium text-text-main">{formatCurrency(selectedResult.purityValue)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-main/80">Wastage ({selectedResult.wastageInGrams.toFixed(3)} gm):</span>
                                <span className="font-medium text-text-main">{formatCurrency(selectedResult.wastageValue)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-xl border-t-2 pt-2 mt-2 border-primary-gold/30 text-accent-maroon">
                                <span>Total Price:</span>
                                <span>{formatCurrency(selectedResult.total)}</span>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                     {results.length > 0 ? (
                         <ul className="space-y-1">
                             {results.map(r => (
                                 <li key={r.percent}>
                                     <button 
                                        onClick={() => setSelectedResult(r)}
                                        className={`w-full flex justify-between items-center p-2 rounded-md text-sm transition-colors ${selectedResult?.percent === r.percent ? 'bg-primary-gold text-text-main shadow-sm' : 'hover:bg-primary-gold/10'}`}
                                      >
                                         <span className={`font-bold ${selectedResult?.percent === r.percent ? '' : 'text-accent-maroon'}`}>{r.percent}%</span>
                                         <div className="text-right">
                                             <p className="font-semibold">{formatCurrency(r.total)}</p>
                                             <p className={`text-xs ${selectedResult?.percent === r.percent ? 'text-text-main/80' : 'text-text-main/70'}`}>
                                                Wastage: {formatCurrency(r.wastageValue)} ({r.wastageInGrams.toFixed(3)} gm)
                                             </p>
                                         </div>
                                     </button>
                                 </li>
                             ))}
                         </ul>
                     ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-center text-text-main/60 p-4">Enter parameters and click 'Calculate' to see results.</p>
                          </div>
                     )}
                </div>
            </div>
        </div>
    );
};


const CalculatorModal: React.FC<CalculatorModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

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
                className="bg-ivory rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-primary-gold/20 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-serif font-bold text-accent-maroon">
                        Gold Price Calculator
                    </h2>
                    <button onClick={onClose} className="text-text-main/60 hover:text-accent-maroon" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <GoldCalculator />
            </div>
        </div>
    );
};

export default CalculatorModal;