
import { Transaction, TransactionStatus } from './types';

// Helper to generate dates relative to today
const getDateString = (daysAgo: number, hour: number, minute: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
};

export const demoTransactions: Omit<Transaction, 'id'>[] = [
    {
        date: getDateString(1, 10, 30),
        name: 'Amelia Chen',
        item: 'Gold Necklace',
        quality: '916',
        weightGiven: 12.500,
        weightReturn: 12.100,
        sale: 0.400,
        status: TransactionStatus.Paid,
        returnTime: getDateString(1, 15, 0),
    },
    {
        date: getDateString(2, 11, 0),
        name: 'Ben Carter',
        item: 'Silver Bracelet',
        quality: '750',
        weightGiven: 28.200,
        weightReturn: null,
        sale: null,
        status: TransactionStatus.NotReturned,
        returnTime: '',
    },
    {
        date: getDateString(3, 14, 15),
        name: 'Chloe Davis',
        item: 'Gold Earrings',
        quality: '916',
        weightGiven: 6.800,
        weightReturn: 6.800,
        sale: 0.000,
        status: TransactionStatus.Returned,
        returnTime: getDateString(2, 18, 20),
    },
    {
        date: getDateString(4, 9, 45),
        name: 'Amelia Chen',
        item: 'Silver Ring',
        quality: '750',
        weightGiven: 7.300,
        weightReturn: 7.100,
        sale: 0.200,
        status: TransactionStatus.Paid,
        returnTime: getDateString(4, 13, 0),
    },
    {
        date: getDateString(5, 16, 0),
        name: 'David Evans',
        item: 'Gold Pendant',
        quality: '916',
        weightGiven: 4.500,
        weightReturn: null,
        sale: null,
        status: TransactionStatus.NotReturned,
        returnTime: '',
    },
];