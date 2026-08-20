import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  sku: z.string().optional(),
  category: z.string().min(1, "Select a category"),
  unitPrice: z.number().min(0.01, "Enter a valid unit price"),
  currentStock: z.number().int().min(0, "Quantity can't be negative"),
  lowStockThreshold: z.number().int().min(0).optional(),
  vendorId: z.string().optional(),
  isComposite: z.boolean().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const PRODUCT_CATEGORIES = [
  "Audio",
  "Wearables",
  "Computing",
  "Photography",
  "Home",
  "Gaming",
  "Accessories",
  "Capacitor",
  "PCB",
  "Enclosure",
  "Finished Goods",
];
