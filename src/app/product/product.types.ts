export interface VariantInput {
  id?: number;
  title: string;
  size?: string;
  color?: string;
  regularPrice: number;
  salePrice: number;
  purchasePrice: number;
  stock: number;
  lowStockThreshold?: number;
  sku: string;
  images: string[];
  isDefault: boolean;
  isActive?: boolean;
}

export interface CreateProductInput {
  title: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  type: "seal" | "ink";
  isFreeGift?: boolean;
  variants: VariantInput[];
}

export interface UpdateProductInput extends CreateProductInput {}
