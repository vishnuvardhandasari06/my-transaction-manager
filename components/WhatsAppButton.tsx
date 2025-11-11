import React from 'react';
import { WhatsAppIcon } from './Icons';

interface WhatsAppButtonProps {
    phoneNumber: string; // Phone number without '+' or '00'
    message: string;
    floating?: boolean;
    children?: React.ReactNode;
    className?: string;
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
    phoneNumber,
    message,
    floating = false,
    children,
    className = ''
}) => {
    const handleChat = () => {
        const encodedMessage = encodeURIComponent(message);
        // The official link format for reliability across devices.
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    const baseClasses = 'inline-flex items-center justify-center gap-2 font-bold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400';
    
    const floatingClasses = floating 
        ? 'fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-4 h-16 w-16' 
        : 'bg-[#25D366] text-white py-2 px-4';

    return (
        <button
            onClick={handleChat}
            className={`${baseClasses} ${floatingClasses} ${className}`}
            aria-label="Chat on WhatsApp"
        >
            <WhatsAppIcon className={floating ? 'h-8 w-8' : 'h-5 w-5'} />
            {children && !floating && <span className="text-sm">{children}</span>}
        </button>
    );
};

export default WhatsAppButton;
