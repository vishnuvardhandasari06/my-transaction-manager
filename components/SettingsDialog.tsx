
import React, { useState, useEffect } from 'react';

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (url: string) => void;
    initialUrl: string;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="bg-[#2d2d2d] text-white/90 rounded-md my-2 relative">
            <pre className="p-4 text-xs overflow-x-auto">
                <code>{code}</code>
            </pre>
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded text-xs"
            >
                {copied ? 'Copied!' : 'Copy'}
            </button>
        </div>
    );
};


const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, onSave, initialUrl }) => {
    const [url, setUrl] = useState(initialUrl);

    useEffect(() => {
        if (isOpen) {
            setUrl(initialUrl);
        }
    }, [isOpen, initialUrl]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(url);
        onClose();
    };

    const fullScriptCode = `
// --- CONFIGURATION ---
// Set the names of the sheets in your Google Sheet document.
const TRANSACTIONS_SHEET_NAME = 'Transactions';
const CUSTOMERS_SHEET_NAME = 'Customers';
const ITEMS_SHEET_NAME = 'Items';
// ---------------------

// Handles GET requests to fetch all initial data.
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    const transactionsSheet = sheet.getSheetByName(TRANSACTIONS_SHEET_NAME);
    const customersSheet = sheet.getSheetByName(CUSTOMERS_SHEET_NAME);
    const itemsSheet = sheet.getSheetByName(ITEMS_SHEET_NAME);

    const transactions = getSheetData(transactionsSheet);
    const customers = getSheetData(customersSheet);
    const items = getSheetData(itemsSheet);
    
    const responseData = {
      transactions: transactions,
      customers: customers,
      items: items
    };

    return ContentService
      .createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handles POST requests to save or update data.
function doPost(e) {
  // The frontend sends the request body as a plain text string to avoid CORS preflight.
  // We must parse it into a JSON object here.
  const request = JSON.parse(e.postData.contents);
  const action = request.action;
  const payload = request.payload;

  // Use LockService to prevent race conditions when multiple users edit at once.
  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // Wait up to 30 seconds.

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet();
    let result;

    switch (action) {
      case 'SAVE_TRANSACTION':
        // This function handles creates, updates, and "soft deletes" (changing status to 'Deleted').
        result = saveTransaction(sheet, payload);
        break;
      case 'BULK_SAVE_TRANSACTIONS':
        result = payload.map(tx => saveTransaction(sheet, tx));
        break;
      case 'SAVE_CUSTOMER':
        result = saveRecord(sheet, CUSTOMERS_SHEET_NAME, payload);
        break;
      case 'SAVE_ITEM':
        result = saveRecord(sheet, ITEMS_SHEET_NAME, payload);
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', result: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Helper to convert sheet data to an array of JSON objects.
function getSheetData(sheet) {
  if (!sheet) return [];
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  if (values.length < 2) return [];
  
  const headers = values[0].map(h => h.trim());
  const scriptTimeZone = Session.getScriptTimeZone();

  return values.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      const cellValue = row[i];
      if ((header === 'date' || header === 'returnTime') && cellValue instanceof Date && !isNaN(cellValue.getTime())) {
        // Format dates to a consistent string format that the client can parse.
        obj[header] = Utilities.formatDate(cellValue, scriptTimeZone, 'yyyy-MM-dd HH:mm');
      } else if (header.toLowerCase().includes('weight') || header.toLowerCase().includes('sale')) {
        obj[header] = cellValue === '' ? null : Number(cellValue);
      } else {
        obj[header] = cellValue;
      }
    });
    return obj;
  });
}

// Saves or updates a transaction based on its ID. Does not delete rows.
function saveTransaction(spreadsheet, transaction) {
  const sheet = spreadsheet.getSheetByName(TRANSACTIONS_SHEET_NAME);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.trim());
  const idColumnIndex = headers.indexOf('id') + 1;
  const dateColumnIndex = headers.indexOf('date') + 1;
  const returnTimeColumnIndex = headers.indexOf('returnTime') + 1;
  
  const data = sheet.getDataRange().getValues();
  
  // Find existing row by ID. Using String() for robust comparison.
  let rowIndex = data.slice(1).findIndex(row => String(row[idColumnIndex - 1]) == String(transaction.id)) + 2;
  const isUpdate = rowIndex > 1;

  // Ensure null values from the app are written as empty cells in the sheet for consistency.
  const rowData = headers.map(header => {
      let value = transaction[header];
      // Convert date strings into true Date objects so Sheets can format them correctly.
      if ((header === 'date' || header === 'returnTime') && typeof value === 'string' && value) {
        return new Date(value);
      }
      return value !== undefined && value !== null ? value : '';
  });
  
  let targetRange;
  if (isUpdate) { // Row found, update it.
    targetRange = sheet.getRange(rowIndex, 1, 1, headers.length);
    targetRange.setValues([rowData]);
  } else { // Not found, append new row.
    sheet.appendRow(rowData);
    rowIndex = sheet.getLastRow();
    targetRange = sheet.getRange(rowIndex, 1, 1, headers.length);
  }

  // Set the desired date format for the date and returnTime cells for better readability in Sheets.
  if (dateColumnIndex > 0) {
    targetRange.getCell(1, dateColumnIndex).setNumberFormat("yyyy-MM-dd HH:mm");
  }
  if (returnTimeColumnIndex > 0) {
    targetRange.getCell(1, returnTimeColumnIndex).setNumberFormat("yyyy-MM-dd HH:mm");
  }
  
  return isUpdate ? 'Transaction updated: ' + transaction.id : 'Transaction added: ' + transaction.id;
}


// Generic function to save a new customer or item.
function saveRecord(spreadsheet, sheetName, payload) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  // FIX: Trim headers to ensure consistency.
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.trim());
  const rowData = headers.map(header => payload[header] !== undefined ? payload[header] : '');
  sheet.appendRow(rowData);
  return 'Added new record to ' + sheetName;
}
`;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity p-4">
            <div className="bg-ivory rounded-lg shadow-xl transform transition-all sm:my-8 sm:max-w-3xl sm:w-full mx-4 max-h-[90vh] flex flex-col">
                <div className="px-4 pt-5 sm:px-6 pb-4 border-b border-primary-gold/20">
                    <h3 className="text-xl font-serif text-accent-maroon" id="modal-title">
                        Google Sheets Sync Setup
                    </h3>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto">
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="sheets-url" className="block text-sm font-medium text-text-main">1. Enter your Web App URL</label>
                             <p className="text-xs text-text-main/70 mb-1">Enter the Web App URL from your deployed Google Apps Script.</p>
                            <input
                                type="url"
                                id="sheets-url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="block w-full px-3 py-2 bg-ivory/50 border border-primary-gold/50 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-gold focus:border-primary-gold sm:text-sm"
                                placeholder="https://script.google.com/macros/s/..."
                            />
                        </div>

                        <div className="text-sm text-text-main/90 p-4 bg-primary-gold/10 border-l-4 border-primary-gold rounded-r-md">
                           <h3 className="font-bold text-accent-maroon">2. Copy this Full Script</h3>
                           <p className="mt-1">Replace the entire contents of your Google Apps Script (`Code.gs`) with the code below. This script is specifically designed for this application.</p>
                           <CodeBlock code={fullScriptCode.trim()} />
                        </div>


                        <div className="text-sm text-text-main/90 p-4 bg-red-50 border-l-4 border-highlight-red rounded-r-md">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-highlight-red" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="font-bold text-accent-maroon">3. Deploy Correctly</h3>
                                    <div className="mt-2 text-sm text-text-main/90">
                                        <p>To prevent errors, follow these deployment steps in Google Apps Script:</p>
                                        <ol className="list-decimal list-inside space-y-1 mt-2">
                                            <li>Go to Deploy &gt; <span className="font-semibold">New deployment</span>.</li>
                                            <li>Click the gear icon, select <span className="font-semibold">Web app</span>.</li>
                                            <li>Set <span className="font-semibold">"Execute as"</span> to <strong className="text-accent-maroon">Me</strong>.</li>
                                            <li>Set <span className="font-semibold">"Who has access"</span> to <strong className="text-accent-maroon">Anyone</strong>.</li>
                                            <li>Click <span className="font-semibold">Deploy</span> and copy the new Web App URL.</li>
                                        </ol>
                                        <p className="mt-3">
                                            <strong className="font-semibold">IMPORTANT:</strong> You must create a <strong className="text-accent-maroon">New deployment</strong> every time you change the script code.
                                        </p>
                                        <a href="https://developers.google.com/apps-script/guides/web#deploy_a_script_as_a_web_app" target="_blank" rel="noopener noreferrer" className="text-primary-gold hover:underline mt-2 inline-block">
                                            Read Official Google Docs &rarr;
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-ivory/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg mt-auto flex-shrink-0">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-gold text-base font-medium text-text-main hover:bg-button-hover-gold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-gold sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={handleSave}
                    >
                        Save Settings
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-text-main hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-gold sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(SettingsDialog);