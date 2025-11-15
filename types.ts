export const PURITIES = ['916', '750'] as const;
export type Purity = typeof PURITIES[number];

export enum TransactionStatus {
    Paid = 'Paid',
    NotReturned = 'Not Returned',
    Returned = 'Returned',
    Deleted = 'Deleted'
}

export interface Transaction {
    id: string;
    date: string;
    name: string;
    item: string;
    quality: Purity | '';
    weightGiven: number | null;
    weightReturn: number | null;
    sale: number | null;
    status: TransactionStatus;
    returnTime: string;
}

export interface Customer {
    name: string;
    phone?: string;
}

export interface Item {
    name: string;
}