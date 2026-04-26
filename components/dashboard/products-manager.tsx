"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
  price: string;
  stock_count: string;
  is_available: boolean;
  images: File[];
  remove_image: boolean;
};

const initialForm: ProductFormState = {
  name: "",
  description: "",
  category: "",
  price: "",
  stock_count: "0",
  is_available: true,
  images: [],
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
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      category: product.category ?? "",
      price: String(product.price),
      stock_count: String(product.stock_count),
      is_available: product.is_available,
      images: [],
      remove_image: false,
    });
    setMessage(null);
    setError(null);
  }

  function resetForm() {
    setEditingProductId(null);
    setForm(initialForm);
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
    body.append("name", form.name);
    body.append("description", form.description);
    body.append("category", form.category);
    body.append("price", String(priceNumber));
    body.append("stock_count", String(stockNumber));
    body.append("is_available", String(form.is_available));
    body.append("remove_image", String(form.remove_image));

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
              </select>
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

          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Product image (optional)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  images: Array.from(event.target.files ?? []),
                }))
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            {form.images.length > 0 ? (
              <p className="text-xs text-slate-500">{form.images.length} image(s) selected.</p>
            ) : null}
          </label>

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
