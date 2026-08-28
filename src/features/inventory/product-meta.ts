import type { Product } from "@/types";

/**
 * The category a product belongs to.
 *
 * The table read `customFields.category` while the grid read the `category`
 * relation, so the same product showed a different category depending on which
 * view you were looking at — and every row in the table read "Uncategorized"
 * because that custom field is never written. Both views now come through here.
 *
 * The many-to-many `categories` relation is consulted as well, since a product
 * can be filed under several and the single `category` may be unset.
 */
export function productCategoryName(product: Product): string | null {
  if (product.category?.name) return product.category.name;
  if (product.categories?.length) return product.categories[0].name;
  const custom = product.customFields?.category;
  return typeof custom === "string" && custom.trim() ? custom : null;
}

/** Every category a product is filed under, for tooltips and detail views. */
export function productCategoryNames(product: Product): string[] {
  const names = new Set<string>();
  if (product.category?.name) names.add(product.category.name);
  for (const c of product.categories ?? []) names.add(c.name);
  return [...names];
}

/** The vendor that supplies a product, plus any additional suppliers. */
export function productVendorName(product: Product): string | null {
  if (product.vendor?.name) return product.vendor.name;
  if (product.vendors?.length) return product.vendors[0].name;
  return null;
}

export function productVendorNames(product: Product): string[] {
  const names = new Set<string>();
  if (product.vendor?.name) names.add(product.vendor.name);
  for (const v of product.vendors ?? []) names.add(v.name);
  return [...names];
}
