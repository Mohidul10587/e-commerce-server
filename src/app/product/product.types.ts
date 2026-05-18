export interface VariantInput {
  id?: number; // present for existing variants on update
  title: string;
  size?: string;
  color?: string;
  regularPrice: number;
  salePrice: number;
  purchasePrice: number;
  stock: number;
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
  categoryId: number;
  isActive?: boolean;
  variants: VariantInput[];
}

export interface UpdateProductInput extends Omit<CreateProductInput, "variants"> {
  variants: VariantInput[]; // mix of existing (with id) and new (without id)
}
