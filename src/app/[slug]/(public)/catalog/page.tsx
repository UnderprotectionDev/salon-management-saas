"use client";

import { useQuery } from "convex/react";
import {
  Building2,
  MessageCircle,
  Phone,
  Search,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { stripHtml } from "@/lib/html";
import { PublicProductCard } from "@/modules/products/components/PublicProductCard";
import { api } from "../../../../../convex/_generated/api";

type SortMode = "name_asc" | "name_desc" | "price_asc" | "price_desc";

export default function ProductCatalogPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const organization = useQuery(api.organizations.getBySlug, { slug });
  const products = useQuery(
    api.products.listPublic,
    organization ? { organizationId: organization._id } : "skip",
  );
  const categories = useQuery(
    api.productCategories.listPublic,
    organization ? { organizationId: organization._id } : "skip",
  );

  // URL param-based filter state
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    searchParams.get("category"),
  );
  const [sort, setSort] = useState<SortMode>(
    (searchParams.get("sort") as SortMode) ?? "name_asc",
  );
  const [inStockOnly, setInStockOnly] = useState(
    searchParams.get("inStock") === "true",
  );

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch org settings for phone (public query)
  const settings = useQuery(
    api.organizations.getPublicSettings,
    organization ? { organizationId: organization._id } : "skip",
  );

  // Org loading
  if (organization === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Header slug={slug} />
        <main className="container mx-auto px-4 py-8">
          <ProductsSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  // Org not found
  if (organization === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Salon not found</h2>
          <p className="mt-1 text-muted-foreground">
            The salon you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  // Products loading
  if (products === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          slug={slug}
          orgName={organization.name}
          logo={organization.logo}
        />
        <main className="container mx-auto px-4 py-8">
          <ProductsSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  // Apply filters
  let filtered = [...products];

  if (debouncedSearch) {
    const q = debouncedSearch.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        stripHtml(p.description ?? "")
          .toLowerCase()
          .includes(q),
    );
  }

  if (selectedCategoryId) {
    filtered = filtered.filter((p) => p.categoryId === selectedCategoryId);
  }

  if (inStockOnly) {
    filtered = filtered.filter((p) => p.inStock);
  }

  // Sort
  switch (sort) {
    case "name_asc":
      filtered.sort((a, b) => a.name.localeCompare(b.name, "tr"));
      break;
    case "name_desc":
      filtered.sort((a, b) => b.name.localeCompare(a.name, "tr"));
      break;
    case "price_asc":
      filtered.sort((a, b) => a.sellingPrice - b.sellingPrice);
      break;
    case "price_desc":
      filtered.sort((a, b) => b.sellingPrice - a.sellingPrice);
      break;
  }

  const phone = settings?.phone;
  const cleanPhone = phone?.replace(/\s/g, "");

  return (
    <div className="min-h-screen bg-background">
      <Header
        slug={slug}
        orgName={organization.name}
        logo={organization.logo}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="mt-1 text-muted-foreground">
            Products available at {organization.name}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingBag className="mb-4 size-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No products available yet.</p>
          </div>
        ) : (
          <>
            {/* Search + Filters */}
            <div className="mb-6 space-y-4">
              {/* Search bar */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category chips */}
              {categories && categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(null)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      selectedCategoryId === null
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat._id)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        selectedCategoryId === cat._id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Sort + In Stock toggle */}
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={sort}
                  onValueChange={(v) => setSort(v as SortMode)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">Name A-Z</SelectItem>
                    <SelectItem value="name_desc">Name Z-A</SelectItem>
                    <SelectItem value="price_asc">Price Low-High</SelectItem>
                    <SelectItem value="price_desc">Price High-Low</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  type="button"
                  onClick={() => setInStockOnly(!inStockOnly)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    inStockOnly
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  In Stock Only
                </button>
              </div>
            </div>

            {/* Product Grid */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="mb-3 size-8 text-muted-foreground/40" />
                <p className="text-muted-foreground">
                  No products match your search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((product) => (
                  <PublicProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* Floating contact buttons */}
      {cleanPhone && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
          <a
            href={`https://wa.me/${cleanPhone.replace("+", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110"
            aria-label="Contact via WhatsApp"
          >
            <MessageCircle className="size-5" />
          </a>
          <a
            href={`tel:${cleanPhone}`}
            className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
            aria-label="Call salon"
          >
            <Phone className="size-5" />
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Header({
  slug,
  orgName,
  logo,
}: {
  slug: string;
  orgName?: string;
  logo?: string;
}) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <Link
          href={`/${slug}/book`}
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <Avatar className="size-10 border">
            {logo ? (
              <AvatarImage src={logo} alt={orgName ?? "Organization logo"} />
            ) : (
              <AvatarFallback>
                <Building2 className="size-5" />
              </AvatarFallback>
            )}
          </Avatar>
          {orgName && (
            <div>
              <h1 className="text-lg font-semibold">{orgName}</h1>
              <p className="text-xs text-muted-foreground">Product Catalog</p>
            </div>
          )}
        </Link>

        <Link
          href={`/${slug}/book`}
          className="text-sm text-primary hover:underline"
        >
          Book appointment
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-12 border-t py-6 text-center text-sm text-muted-foreground">
      <p>
        Powered by{" "}
        <Link href="/" className="text-primary hover:underline">
          Salon Management
        </Link>
      </p>
    </footer>
  );
}

function ProductsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items have no stable id
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
