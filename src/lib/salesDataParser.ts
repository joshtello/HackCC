// src/lib/salesDataParser.ts
// Utility to parse Coffee Shop Sales.xlsx and extract sales data

import * as XLSX from 'xlsx';

export interface SalesRecord {
  date: Date;
  itemName: string;
  quantity: number;
  revenue?: number;
}

export async function parseSalesExcel(filePath: string): Promise<SalesRecord[]> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to fetch ${filePath}: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Assume the first sheet contains sales data
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);

    // Parse ALL rows; callers should filter by date range as needed
    const salesRecords: SalesRecord[] = [];

    data.forEach((row: any) => {
      // Adjust these field names based on actual Excel column names
      const storeLocation = row['store_location'] || row['Store Location'] || row['location'];
      const dateStr = row['transaction_date'] || row['date'] || row['Date'] || row['transaction_time'];
      const itemName = row['product_detail'] || row['item'] || row['Item'] || row['product'];
      const quantity = parseInt(row['transaction_qty'] || row['quantity'] || row['Quantity'] || '1');
      const revenue = parseFloat(row['Total'] || row['total'] || row['Revenue'] || '0');

      // Only include records from Lower Manhattan
      if (storeLocation && storeLocation.toString().trim() === 'Lower Manhattan' && dateStr && itemName) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          salesRecords.push({
            date,
            itemName: itemName.toString().trim(),
            quantity: isNaN(quantity) ? 1 : quantity,
            revenue: isNaN(revenue) ? undefined : revenue,
          });
        }
      }
    });

    return salesRecords;
  } catch (error) {
    console.error('Error parsing sales Excel file:', error);
    return [];
  }
}

export function aggregateSalesByItem(salesRecords: SalesRecord[]): Map<string, number> {
  const aggregated = new Map<string, number>();
  
  salesRecords.forEach(record => {
    const current = aggregated.get(record.itemName) || 0;
    aggregated.set(record.itemName, current + record.quantity);
  });
  
  return aggregated;
}
