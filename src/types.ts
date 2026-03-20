import { Key } from "react";

export type PrinterType = 'Laser' | 'Inkjet' | 'Dot Matrix' | 'Thermal' | 'Multifunction';
export type PrinterBrand = 'Epson' | 'Canon' | 'Brother' | 'HP' | 'Samsung' | 'Pantum' | 'Ricoh' | 'Oki' | 'Toshiba' | 'Label / Barcode Printer';
export type ColorMode = 'Monochrome' | 'Color';
export type UserRole = 'admin' | 'user';

export interface Company {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  createdAt: number;
}

export interface UserProfile {
  [x: string]: Key;
  uid: string;
  username: string;
  role: UserRole;
  companyCode: string;
  createdAt: number;
}

export interface Department {
  id: string;
  code: string;
  thaiName: string;
  companyCode: string; // ผูกกับบริษัท
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
  companyCode: string; // ผูกกับบริษัท
  createdAt: number;
  createdBy: string;
  createdByName?: string;
  updatedAt?: number;
  updatedBy?: string;
  updatedByName?: string;
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
