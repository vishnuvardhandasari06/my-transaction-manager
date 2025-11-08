
export enum TransactionStatus {
    Paid = 'Paid',
    NotReturned = 'Not Returned',
    Returned = 'Returned'
}

export interface Transaction {
    id: string;
    date: string;
    name: string;
    item: string;
    quality: string;
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