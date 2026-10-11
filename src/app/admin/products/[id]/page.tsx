"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { useProduct } from "@/lib/data";

export default function EditProductPage() {
  return (
    <Suspense
      fallback={<div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" /></div>}
    >
      <EditProduct />
    </Suspense>
  );
}

function EditProduct() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { product, loading } = useProduct(id);

  if (loading) {
    return <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" /></div>;
  }
  if (!product) {
    return <div className="px-5 py-10 text-center text-sm text-slate-400">Product not found.</div>;
  }
  return <ProductForm initial={product} id={id} />;
}
