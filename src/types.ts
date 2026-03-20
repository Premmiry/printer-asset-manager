export type PrinterType = 'Laser' | 'Inkjet' | 'Dot Matrix' | 'Thermal' | 'Multifunction';
export type PrinterBrand = 'Epson' | 'Canon' | 'Brother' | 'HP' | 'Samsung' | 'Pantum' | 'Ricoh' | 'Oki' | 'Toshiba' | 'Label / Barcode Printer';
export type ColorMode = 'Monochrome' | 'Color';

export interface Department {
  id: string;
  code: string;
  thaiName: string;
  createdAt: number;
}

export interface Printer {
  id: string;
  assetId: string;
  model: string;
  brand: PrinterBrand;
  type: PrinterType;
  colorMode: ColorMode;
  departmentCode: string;
  createdAt: number;
  createdBy: string;
}

export const PRINTER_TYPES: PrinterType[] = ['Laser', 'Inkjet', 'Dot Matrix', 'Thermal', 'Multifunction'];
export const PRINTER_BRANDS: PrinterBrand[] = [
  'Epson', 
  'Canon', 
  'Brother', 
  'HP', 
  'Samsung', 
  'Pantum', 
  'Ricoh', 
  'Oki', 
  'Toshiba', 
  'Label / Barcode Printer'
];
