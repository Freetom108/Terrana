export interface BlendIngredient {
  productId: string;
  productName: string;
  amount: number;
  unit: string;
}

export interface Blend {
  id: string;
  name: string;
  notes: string;
  ingredients: BlendIngredient[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
