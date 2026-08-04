export type MovementType = 'in' | 'out' | 'adjustment';
export type ScanMovementType = MovementType | 'query';

export interface Product {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  active: boolean;
  product_variants?: Variant[];
}

export interface Variant {
  id: string;
  product_id?: string;
  barcode: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
  minimum_stock: number;
  active: boolean;
  products?: {
    id: string;
    name: string;
    category: string | null;
    description?: string | null;
    active: boolean;
  };
  product?: {
    id: string;
    name: string;
    category: string | null;
    description?: string | null;
    active: boolean;
  };
}

export interface ScanResult {
  success: true;
  product: {
    id?: string;
    name: string;
    category: string | null;
    variantId?: string;
    barcode: string;
    sku: string;
    color: string;
    size: string;
  };
  previousStock: number;
  newStock: number;
}

export interface Movement {
  id: number;
  movement_type: MovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
  product_variants?: {
    barcode: string;
    sku: string;
    color: string;
    size: string;
    products?: {
      name: string;
      category: string | null;
    };
  };
}

export interface DashboardMetrics {
  products: number;
  variants: number;
  availableUnits: number;
  lowStock: number;
  movementsToday: number;
  latestMovements: Movement[];
  lowStockVariants: Variant[];
}

