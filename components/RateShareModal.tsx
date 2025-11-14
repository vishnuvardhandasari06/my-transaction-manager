import React, { useState } from 'react';
import { WhatsAppIcon } from './Icons';

interface RateShareModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RateShareModal: React.FC<RateShareModalProps> = ({ isOpen, onClose }) => {
    const [goldPrice, setGoldPrice] = useState('');
    const [silverPrice, setSilverPrice] = useState('');
    const [errors, setErrors] = useState<{ gold?: string; silver?: string }>({});

    if (!isOpen) return null;

    const validate = () => {
        const newErrors: { gold?: string; silver?: string } = {};
        if (!goldPrice || isNaN(parseFloat(goldPrice)) || parseFloat(goldPrice) <= 0) {
            newErrors.gold = 'Please enter a valid gold price.';
        }
        if (!silverPrice || isNaN(parseFloat(silverPrice)) || parseFloat(silverPrice) <= 0) {
            newErrors.silver = 'Please enter a valid silver price.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleShare = () => {
        if (!validate()) return;

        const gold_price_24k = parseFloat(goldPrice);
        const silver_price_1kg = parseFloat(silverPrice);

        const gold_22k = gold_price_24k * 0.92;
        const ara_kasu = gold_22k * 4;
        const kasu = gold_22k * 8;
        
        const formatNumber = (num: number) => num.toLocaleString('en-IN', { maximumFractionDigits: 0 });

        const message = `
🌟 Today Gold & Silver Rate 🌟

✨ GOLD ✨
24K (Pure) 1 gram: ₹${formatNumber(gold_price_24k)}
22K 1 gram: ₹${formatNumber(gold_22k)}
22K Ara Kasu (4): ₹${formatNumber(ara_kasu)}
22K Kasu (8): ₹${formatNumber(kasu)}

✨ SILVER ✨
1 Kg: ₹${formatNumber(silver_price_1kg)}

-----------------------------------
💠 ఈ రోజు బంగారు & వెండి ధర 💠

✨ బంగారం ✨
24 కరాట్లు 1 గ్రాము: ₹${formatNumber(gold_price_24k)}
22 కరాట్లు 1 గ్రాము: ₹${formatNumber(gold_22k)}
22 కరాట్లు ఆర కాసు: ₹${formatNumber(ara_kasu)}
22 కరాట్లు కాసు: ₹${formatNumber(kasu)}

✨ వెండి ✨
1 కిలో: ₹${formatNumber(silver_price_1kg)}
`.trim();

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        onClose();
    };

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
                className="bg-ivory rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 md:p-6 border-b border-primary-gold/20 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-serif font-bold text-accent-maroon">
                        Today's Gold & Silver Rate
                    </h2>
                    <button onClick={onClose} className="text-text-main/60 hover:text-accent-maroon" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-4 md:p-6 overflow-y-auto space-y-6">
                    <div>
                        <label htmlFor="gold-price" className="block text-sm font-medium text-text-main/90">24K Gold Price (per gram)</label>
                        <div className="mt-1">
                            <input
                                type="number"
                                id="gold-price"
                                name="gold-price"
                                value={goldPrice}
                                onChange={(e) => {
                                    setGoldPrice(e.target.value);
                                    if (errors.gold) setErrors(p => ({...p, gold: undefined}));
                                }}
                                placeholder="e.g., 7200"
                                className={`block w-full px-3 py-2 bg-ivory/50 border ${errors.gold ? 'border-highlight-red text-highlight-red' : 'border-primary-gold/50'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm`}
                            />
                        </div>
                        {errors.gold && <p className="mt-1 text-xs text-highlight-red">{errors.gold}</p>}
                    </div>
                    <div>
                        <label htmlFor="silver-price" className="block text-sm font-medium text-text-main/90">Silver Price (per 1 kg)</label>
                        <div className="mt-1">
                            <input
                                type="number"
                                id="silver-price"
                                name="silver-price"
                                value={silverPrice}
                                onChange={(e) => {
                                    setSilverPrice(e.target.value);
                                    if (errors.silver) setErrors(p => ({...p, silver: undefined}));
                                }}
                                placeholder="e.g., 91000"
                                className={`block w-full px-3 py-2 bg-ivory/50 border ${errors.silver ? 'border-highlight-red text-highlight-red' : 'border-primary-gold/50'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm`}
                            />
                        </div>
                        {errors.silver && <p className="mt-1 text-xs text-highlight-red">{errors.silver}</p>}
                    </div>
                </div>
                <div className="p-4 md:p-6 border-t border-primary-gold/20 flex-shrink-0 flex items-center justify-end gap-4">
                     <button type="button" onClick={onClose} className="bg-gray-200 text-text-main font-bold py-2 px-4 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleShare}
                        className="bg-[#25D366] text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 inline-flex items-center gap-2"
                    >
                        <WhatsAppIcon className="h-5 w-5" />
                        Share Rates
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RateShareModal;