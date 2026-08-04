export type MovementType = 'in' | 'out' | 'adjustment';
export type ScanMovementType = MovementType | 'query';

export interface ProductSummary {
  id: string;
  name: string;
  category: string | null;
  variantId: string;
  barcode: string;
  sku: string;
  color: string;
  size: string;
}

export interface ScanResult {
  success: true;
  product: ProductSummary;
  previousStock: number;
  newStock: number;
}

export interface ProductVariantView {
  id: string;
  barcode: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  minimum_stock: number;
  active: boolean;
  product: {
    id: string;
    name: string;
    category: string | null;
    description?: string | null;
    active: boolean;
  };
}

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

