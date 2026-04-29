"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { formatNaira } from "@/lib/format";
import type { ProductRecord } from "@/types";

type ProductsResponse = {
  products?: ProductRecord[];
  allowed_categories?: string[];
  error?: string;
};

type ProductFormState = {
  name: string;
  description: string;
  category: string;
  custom_category: string;
  price: string;
  stock_count: string;
  is_available: boolean;
  images: File[];
  existing_image_urls: string[];
  remove_image: boolean;
};

const initialForm: ProductFormState = {
  name: "",
  description: "",
  category: "",
  custom_category: "",
  price: "",
  stock_count: "0",
  is_available: true,
  images: [],
  existing_image_urls: [],
  remove_image: false,
};

type ProductsManagerProps = {
  initialProducts: ProductRecord[];
};

export function ProductsManager({ initialProducts }: ProductsManagerProps) {
  const [products, setProducts] = useState<ProductRecord[]>(initialProducts);
  const [allowedCategories, setAllowedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(initialForm);
  const [dragActive, setDragActive] = useState(false);
  const imagePreviewUrls = useMemo(
    () => form.images.map((file) => URL.createObjectURL(file)),
    [form.images],
  );

  useEffect(() => {
    return () => {
      for (const url of imagePreviewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [imagePreviewUrls]);

  useEffect(() => {
    void loadProducts();
  }, []);

  async function loadProducts() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      const payload = (await response.json()) as ProductsResponse;

      if (!response.ok) {
        setError(payload.error ?? "Could not load products.");
        return;
      }

      setProducts(payload.products ?? []);
      setAllowedCategories(payload.allowed_categories ?? []);
    } catch {
      setError("Network error while loading products.");
    } finally {
      setIsLoading(false);
    }
  }
  function fillFormForEdit(product: ProductRecord) {
    const rawCategory = product.category ?? "";
    const isCustomCategory =
      allowedCategories.length > 0 &&
      rawCategory.trim().length > 0 &&
      !allowedCategories.includes(rawCategory);
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      category: isCustomCategory ? "__other__" : rawCategory,
      custom_category: isCustomCategory ? rawCategory : "",
      price: String(product.price),
      stock_count: String(product.stock_count),
      is_available: product.is_available,
      images: [],
      existing_image_urls:
        (product.image_urls?.filter((url): url is string => Boolean(url?.trim())) ?? []).length > 0
          ? (product.image_urls?.filter((url): url is string => Boolean(url?.trim())) ?? [])
          : product.image_url
            ? [product.image_url]
            : [],
      remove_image: false,
    });
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingProductId(null);
    setForm(initialForm);
  }

  function addImages(nextFiles: File[]) {
    if (nextFiles.length === 0) return;
    setForm((prev) => ({
      ...prev,
      images: [...prev.images, ...nextFiles],
      remove_image: false,
    }));
  }

  function removeSelectedImage(index: number) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function moveSelectedImageToPrimary(index: number) {
    setForm((prev) => {
      if (index <= 0 || index >= prev.images.length) return prev;
      const next = [...prev.images];
      const [target] = next.splice(index, 1);
      next.unshift(target);
      return { ...prev, images: next };
    });
  }

  function removeExistingImage(index: number) {
    setForm((prev) => ({
      ...prev,
      existing_image_urls: prev.existing_image_urls.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
      remove_image: false,
    }));
  }

  function moveExistingImageToPrimary(index: number) {
    setForm((prev) => {
      if (index <= 0 || index >= prev.existing_image_urls.length) return prev;
      const next = [...prev.existing_image_urls];
      const [target] = next.splice(index, 1);
      next.unshift(target);
      return { ...prev, existing_image_urls: next };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    if (!form.name.trim()) {
      setError("Product name is required.");
      setIsSaving(false);
      return;
    }

    if (allowedCategories.length > 0 && !form.category.trim()) {
      setError("Select a category based on your store niches.");
      setIsSaving(false);
      return;
    }

    const priceNumber = Number(form.price);
    const stockNumber = Number(form.stock_count);

    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      setError("Price must be 0 or more.");
      setIsSaving(false);
      return;
    }

    if (!Number.isInteger(stockNumber) || stockNumber < 0) {
      setError("Stock count must be a whole number 0 or more.");
      setIsSaving(false);
      return;
    }

    const body = new FormData();
    const normalizedCategory =
      form.category === "__other__" ? form.custom_category.trim() : form.category.trim();

    if (allowedCategories.length > 0 && !normalizedCategory) {
      setError("Select a category or choose Others and enter your category.");
      setIsSaving(false);
      return;
    }

    body.append("name", form.name);
    body.append("description", form.description);
    body.append("category", normalizedCategory);
    body.append("category_is_other", String(form.category === "__other__"));
    body.append("price", String(priceNumber));
    body.append("stock_count", String(stockNumber));
    body.append("is_available", String(form.is_available));
    body.append("remove_image", String(form.remove_image));
    body.append("keep_image_urls", JSON.stringify(form.existing_image_urls));

    for (const image of form.images) {
      body.append("images", image);
    }

    const isEditing = Boolean(editingProductId);
    const endpoint = isEditing ? `/api/products/${editingProductId}` : "/api/products";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        body,
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Could not save product.");
        setIsSaving(false);
        return;
      }

      setMessage(payload.message ?? (isEditing ? "Product updated." : "Product created."));
      resetForm();
      await loadProducts();
    } catch {
      setError("Network error while saving product.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(productId: string) {
    const confirmDelete = window.confirm("Delete this product? This cannot be undone.");

    if (!confirmDelete) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Could not delete product.");
        return;
      }

      setMessage(payload.message ?? "Product deleted.");
      if (editingProductId === productId) {
        resetForm();
      }
      await loadProducts();
    } catch {
      setError("Network error while deleting product.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-emerald-700">Product Form</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          {editingProductId ? "Edit product" : "Add product"}
        </h2>
        <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          You can upload multiple product images. The first image is used as the cover image on cards.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Name</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
              placeholder="Jollof Rice"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Price (NGN)</span>
            <input
              type="number"
              min="0"
              required
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
              placeholder="1500"
            />
          </label>

          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Description</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
              placeholder="Short description for customers"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">
              Category {allowedCategories.length > 0 ? "" : "(optional)"}
            </span>
            {allowedCategories.length > 0 ? (
              <>
                <select
                  required
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                >
                  <option value="">Select a category</option>
                  {allowedCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value="__other__">Others</option>
                </select>
                <p className="text-xs text-slate-500">Can&apos;t find yours? Use Others.</p>
              </>
            ) : (
              <input
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                placeholder="Set niches in Store Setup to enable guided categories"
              />
            )}
          </label>
          {allowedCategories.length > 0 && form.category === "__other__" ? (
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Custom category</span>
              <input
                required
                value={form.custom_category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, custom_category: event.target.value }))
                }
                className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
                placeholder="Type your category"
              />
            </label>
          ) : null}

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Stock count</span>
            <input
              type="number"
              min="0"
              required
              value={form.stock_count}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, stock_count: event.target.value }))
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 outline-none ring-emerald-300 focus:ring-2"
            />
          </label>

          <div className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Product images</span>
            {editingProductId && form.existing_image_urls.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Current images</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {form.existing_image_urls.map((url, index) => (
                    <div key={`${url}-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                      <div className="relative h-24 overflow-hidden rounded-md bg-slate-100">
                        <Image
                          src={url}
                          alt={`Existing product image ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="200px"
                        />
                        {index === 0 ? (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Cover
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => moveExistingImageToPrimary(index)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Make cover
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="rounded-md border border-red-300 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                addImages(Array.from(event.dataTransfer.files ?? []).filter((file) => file.type.startsWith("image/")));
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition ${
                dragActive
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-300 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/40"
              }`}
            >
              <span className="text-sm font-semibold text-slate-800">Drag images here or click to upload</span>
              <span className="mt-1 text-xs text-slate-500">
                First selected image becomes cover image in cards.
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => addImages(Array.from(event.target.files ?? []))}
                className="hidden"
              />
            </label>
            {form.images.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">{form.images.length} image(s) selected.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {form.images.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                      <div className="relative h-24 overflow-hidden rounded-md bg-slate-100">
                        <Image
                          src={imagePreviewUrls[index] ?? ""}
                          alt={file.name}
                          fill
                          className="object-cover"
                          sizes="200px"
                          unoptimized
                        />
                        {index === 0 ? (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            Cover
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 line-clamp-1 text-[11px] text-slate-600">{file.name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        {index > 0 ? (
                          <button
                            type="button"
                            onClick={() => moveSelectedImageToPrimary(index)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Make cover
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeSelectedImage(index)}
                          className="rounded-md border border-red-300 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, is_available: event.target.checked }))
              }
            />
            Available for customers
          </label>

          {editingProductId ? (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.remove_image}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, remove_image: event.target.checked }))
                }
              />
              Remove existing image
            </label>
          ) : null}

          {error ? (
            <p className="md:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="md:col-span-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSaving
                ? "Saving..."
                : editingProductId
                  ? "Update product"
                  : "Add product"}
            </button>

            {editingProductId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-emerald-700">Products</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Your product list</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadProducts()}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {isLoading ? <p className="text-sm text-slate-500">Loading products...</p> : null}

        {!isLoading && products.length === 0 ? (
          <p className="text-sm text-slate-600">
            No products yet. Add your first product from the form above.
          </p>
        ) : null}

        {!isLoading && products.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="rounded-lg border border-slate-200 p-4">
                <div className="relative mb-3 h-40 w-full overflow-hidden rounded-md bg-slate-100">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">
                      No image
                    </div>
                  )}
                </div>

                <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {formatNaira(Number(product.price))}
                </p>
                {product.category ? (
                  <p className="mt-1 text-xs text-slate-500">Category: {product.category}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">Stock: {product.stock_count}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Status: {product.is_available ? "Available" : "Unavailable"}
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fillFormForEdit(product)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(product.id)}
                    className="rounded-md border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
