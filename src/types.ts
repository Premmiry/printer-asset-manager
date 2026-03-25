import { Key } from "react";

export type PrinterType = string;
export type PrinterBrand = string;

export interface PrinterTypeConfig {
  id: string;
  name: string;
  createdAt: number;
}

export interface PrinterBrandConfig {
  id: string;
  name: string;
  createdAt: number;
}

export interface TypePrinterConfig {
  id: string;
  name: string;
  createdAt: number;
}

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
  companyCode: string;
  createdAt: number;
  createdBy?: string;
  createdByName?: string;
  updatedAt?: number;
  updatedBy?: string;
  updatedByName?: string;
  typeprinterId?: string;
  purchaseYear2Digit?: string;
}
