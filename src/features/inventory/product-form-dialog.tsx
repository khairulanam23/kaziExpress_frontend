"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Save, Tag, Search, Trash2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCreateProduct, useUpdateProduct,  useProduct, useProducts} from "@/hooks/queries/use-products";
import { useVendors } from "@/hooks/queries/use-vendors";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSIONS } from "@/constants/permissions";
import { useCategories } from "@/hooks/queries/use-categories";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product } from "@/types";

const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  unitPrice: z.number().min(0.01, "Enter a valid unit price"),
  currentStock: z.number().int().min(0, "Quantity can't be negative"),
  lowStockThreshold: z.number().int().min(0).optional(),
  vendorId: z.string().optional(),
  isComposite: z.boolean().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface SelectedComponent {
  childProductId: string;
  name: string;
  sku: string | null;
  quantityRequired: number;
  unitPrice: number;
  currentStock: number;
}

export function ProductFormDialog({
  product,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  defaultIsComposite,
}: {
  product?: Product;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultIsComposite?: boolean;
}) {
  const isEdit = !!product;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const [bomItems, setBomItems] = React.useState<SelectedComponent[]>([]);
  const [componentSearch, setComponentSearch] = React.useState("");
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [shouldRemoveImage, setShouldRemoveImage] = React.useState(false);

  // Vendor and category pickers are optional context: fetch them only when the
  // user can read those lists, otherwise the dialog fires guaranteed 403s.
  const { has } = usePermissions();
  const { data: vendorData } = useVendors(undefined, { enabled: has(PERMISSIONS.VENDOR_VIEW) });
  const { data: categoriesData } = useCategories(undefined, { enabled: has(PERMISSIONS.CATEGORY_VIEW) });
  const vendors = vendorData?.vendors ?? [];
  const categories = categoriesData?.categories ?? [];

  // Fetch full details (including BOM) if we are in edit mode
  const { data: fullProduct } = useProduct(isEdit && product ? product.id : null);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const loading = createProduct.isPending || updateProduct.isPending;

  // Component search
  const { data: searchResultsData } = useProducts({
    search: componentSearch || undefined,
    showPerPage: 100,
  });
  const searchResults = searchResultsData?.products ?? [];

  const defaultValues = (p?: Product): ProductFormValues => ({
    name: p?.name ?? "",
    sku: p?.sku ?? "",
    categoryId: (p as Product & { categoryId?: string })?.categoryId ?? "",
    unitPrice: p ? Number(p.unitPrice) : 0,
    currentStock: p ? Number(p.currentStock) : 0,
    lowStockThreshold: p?.lowStockThreshold ? Number(p.lowStockThreshold) : undefined,
    vendorId: p?.vendorId ?? undefined,
    isComposite: p ? p.isComposite : (defaultIsComposite ?? false),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues(product),
  });

  const isCompositeActive = watch("isComposite");
  const parentQty = watch("currentStock") || 0;

  // Sync edit product data
  React.useEffect(() => {
    if (!open) {
      setBomItems([]);
      setComponentSearch("");
      setSelectedImage(null);
      setImagePreview(null);
      setShouldRemoveImage(false);
      return;
    }

    if (isEdit) {
      if (fullProduct && fullProduct.id === product.id) {
        reset(defaultValues(fullProduct));
        setImagePreview(fullProduct.imageUrl || null);
        if (fullProduct.bomSummary) {
          setBomItems(
            fullProduct.bomSummary.map((item) => ({
              childProductId: item.childProductId,
              name: item.name,
              sku: item.sku,
              quantityRequired: item.quantityRequired,
              unitPrice: item.unitPrice,
              currentStock: item.currentStock,
            }))
          );
        }
      } else {
        reset(defaultValues(product));
        setImagePreview(product.imageUrl || null);
      }
    } else {
      reset(defaultValues(undefined));
      setBomItems([]);
      setImagePreview(null);
    }
    setSelectedImage(null);
    setShouldRemoveImage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fullProduct, product, isEdit]);

  const onSubmit = (values: ProductFormValues) => {
    // Validate that if it's a composite product, it has at least one BOM item
    if (values.isComposite && bomItems.length === 0) {
      toast.error("Component requirements needed", {
        description: "Please search and add at least one component to define this compound product.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("name", values.name);
    if (values.sku) formData.append("sku", values.sku);
    formData.append("unitPrice", String(values.unitPrice));
    formData.append("currentStock", String(values.currentStock));
    if (values.lowStockThreshold !== undefined && values.lowStockThreshold !== null) {
      formData.append("lowStockThreshold", String(values.lowStockThreshold));
    }
    if (values.vendorId) formData.append("vendorId", values.vendorId);
    formData.append("isComposite", String(!!values.isComposite));
    if (values.categoryId) formData.append("categoryId", values.categoryId);
    formData.append("customFields", JSON.stringify({}));
    formData.append("bomItems", JSON.stringify(
      values.isComposite
        ? bomItems.map((item) => ({
            childProductId: item.childProductId,
            quantityRequired: item.quantityRequired,
          }))
        : []
    ));

    if (selectedImage) {
      formData.append("image", selectedImage);
    } else if (shouldRemoveImage) {
      formData.append("removeImage", "true");
    }

    const onSuccess = () => {
      toast.success(isEdit ? "Product updated" : "Product added", { description: `${values.name} was saved.` });
      setOpen(false);
    };
    const onError = (error: unknown) => toast.error("Something went wrong", { description: getApiErrorMessage(error) });

    if (isEdit && product) {
      updateProduct.mutate({ id: product.id, payload: formData }, { onSuccess, onError });
    } else {
      createProduct.mutate(formData, { onSuccess, onError });
    }
  };

  const handleAddComponent = (p: Product) => {
    // Prevent adding self or duplicates
    if (p.id === product?.id) return;
    if (bomItems.some((item) => item.childProductId === p.id)) return;

    setBomItems((prev) => [
      ...prev,
      {
        childProductId: p.id,
        name: p.name,
        sku: p.sku,
        quantityRequired: 1,
        unitPrice: Number(p.unitPrice),
        currentStock: Number(p.currentStock),
      },
    ]);
    setComponentSearch("");
    setIsSearchFocused(false);
  };

  const handleUpdateQty = (id: string, qty: number) => {
    setBomItems((prev) =>
      prev.map((item) =>
        item.childProductId === id ? { ...item, quantityRequired: Math.max(1, qty) } : item
      )
    );
  };

  const handleRemoveComponent = (id: string) => {
    setBomItems((prev) => prev.filter((item) => item.childProductId !== id));
  };

  const unitMaterialCost = bomItems.reduce(
    (sum, item) => sum + item.quantityRequired * item.unitPrice,
    0
  );

  const totalMaterialCost = unitMaterialCost * parentQty;

  const filteredSearchResults = searchResults.filter(
    (p) => p.id !== product?.id && !bomItems.some((item) => item.childProductId === p.id)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : trigger === undefined && !isEdit ? (
        <DialogTrigger asChild>
          <Button>
            <Plus /> Add product
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className={cn("transition-all duration-300", isCompositeActive ? "max-w-2xl" : "max-w-lg")}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add new product"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the details for this product." : "Fill in the details to add a product to your inventory."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Product name</Label>
            <Input id="name" placeholder="Aurora Wireless Headphones" {...register("name")} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Product Image</Label>
            {imagePreview ? (
              <div className="relative size-24 rounded-lg overflow-hidden border border-border group bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="size-full object-cover" />
                <button
                  type="button"
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity"
                  onClick={() => {
                    setImagePreview(null);
                    setSelectedImage(null);
                    setShouldRemoveImage(true);
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  className="max-w-60"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedImage(file);
                      setImagePreview(URL.createObjectURL(file));
                      setShouldRemoveImage(false);
                    }
                  }}
                />
                <span className="text-xs text-muted-foreground">Upload JPG, PNG or WEBP</span>
              </div>
            )}
          </div>

          <label className="border-border flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Compound Product?</p>
              <p className="text-muted-foreground text-xs">Assembled from other components via a Bill of Materials</p>
            </div>
            <Switch checked={watch("isComposite")} onCheckedChange={(v) => setValue("isComposite", v)} />
          </label>



          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" placeholder="SKU-2FA91" {...register("sku")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={watch("categoryId") ?? ""} onValueChange={(v) => setValue("categoryId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <Tag className="size-3 shrink-0 text-muted-foreground" />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unitPrice">{isCompositeActive ? "Per Unit Price" : "Unit price"}</Label>
              <Input id="unitPrice" type="number" step="0.01" {...register("unitPrice", { valueAsNumber: true })} />
              {errors.unitPrice && <p className="text-destructive text-xs">{errors.unitPrice.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentStock">Quantity</Label>
              <Input id="currentStock" type="number" {...register("currentStock", { valueAsNumber: true })} />
              {errors.currentStock && <p className="text-destructive text-xs">{errors.currentStock.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lowStockThreshold">Low stock at</Label>
              <Input id="lowStockThreshold" type="number" placeholder="5" {...register("lowStockThreshold", { valueAsNumber: true })} />
            </div>
          </div>

          {/* BOM COMPONENTS PICKER SECTION */}
          {isCompositeActive && (
            <div className="border-border flex flex-col gap-3 rounded-lg border p-4 bg-muted/20">
              <p className="text-sm font-semibold">Required Products</p>

              {/* SEARCH COMPONENTS */}
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  placeholder="Search components to add..."
                  className="pl-9 bg-background"
                  value={componentSearch}
                  onChange={(e) => setComponentSearch(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
                {(isSearchFocused || !!componentSearch) && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                    {filteredSearchResults.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground text-center">No products found</p>
                    ) : (
                      filteredSearchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAddComponent(p);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">{p.sku ?? "No SKU"}</span>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary">
                            Stock: {Number(p.currentStock)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* SELECTED COMPONENTS LIST */}
              {bomItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg border-border bg-background/50">
                  <p className="text-xs text-muted-foreground text-center">No components added yet. Use the search box above to add components.</p>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-background">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50 text-[10px] font-semibold text-muted-foreground uppercase">
                        <th className="p-2.5">Component</th>
                        <th className="p-2.5 text-right">Available</th>
                        <th className="p-2.5 text-center w-20">Per Unit</th>
                        <th className="p-2.5 text-right">Unit Cost</th>
                        <th className="p-2.5 text-right">Total Required</th>
                        <th className="p-2.5 text-right">Total Cost</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomItems.map((item) => (
                        <tr key={item.childProductId} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-2.5">
                            <div className="flex flex-col">
                              <span className="font-medium truncate max-w-40">{item.name}</span>
                              <span className="text-xs text-muted-foreground">{item.sku ?? "—"}</span>
                            </div>
                          </td>
                          <td className="p-2.5 text-right font-medium text-muted-foreground">
                            {item.currentStock} units
                          </td>
                         
                          <td className="p-2.5 text-center">
                            <Input
                              type="number"
                              className="h-8 text-center px-1"
                              value={item.quantityRequired}
                              min={1}
                              onChange={(e) => handleUpdateQty(item.childProductId, parseInt(e.target.value, 10) || 1)}
                            />
                          </td>
                           <td className="p-2.5 text-right font-medium text-muted-foreground">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="p-2.5 text-right font-medium text-[10px]">
                            {item.quantityRequired} × {parentQty} = {item.quantityRequired * parentQty} units
                          </td>
                          <td className="p-2.5 text-right font-semibold text-primary">
                            {formatCurrency(item.quantityRequired * parentQty * item.unitPrice)}
                          </td>
                          <td className="p-2.5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveComponent(item.childProductId)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* LIVE MATERIAL COST DISPLAY */}
              {bomItems.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-border pt-3 mt-1 text-sm font-semibold">
                  <div className="flex items-center justify-between text-muted-foreground text-xs">
                    <span>Live Material Cost (Per Unit)</span>
                    <span className="tabular">{formatCurrency(unitMaterialCost)}</span>
                  </div>
                  <div className="flex items-center justify-between text-foreground text-sm font-bold mt-1">
                    <span>Live Material Cost (Total Batch)</span>
                    <span className="text-primary tabular">{formatCurrency(totalMaterialCost)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Vendor</Label>
            <Select value={watch("vendorId") ?? ""} onValueChange={(v) => setValue("vendorId", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select vendor (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No vendor</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>







          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isEdit ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
