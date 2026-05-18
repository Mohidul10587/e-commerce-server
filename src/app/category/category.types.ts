export interface CreateCategoryInput {
  name: string;
  slug: string;
  image?: string;
  isActive?: boolean;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}
