"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Building2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../../convex/_generated/api";

type ProductPublic = FunctionReturnType<typeof api.products.listPublic>[number];

export default function ProductCatalogPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  const organization = useQuery(api.organizations.getBySlug, { slug });

  const products = useQuery(
    api.products.listPublic,
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

  const grouped = groupByCategory(products);

  return (
    <div className="min-h-screen bg-background">
      <Header
        slug={slug}
        orgName={organization.name}
        logo={organization.logo}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
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
          <div className="space-y-10">
            {grouped.map(({ category, items }) => (
              <section key={category ?? "__uncategorized"}>
                {category && (
                  <h3 className="mb-4 border-b pb-2 text-lg font-semibold">
                    {category}
                  </h3>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByCategory(products: ProductPublic[]) {
  const map = new Map<string, ProductPublic[]>();

  for (const product of products) {
    const key = product.categoryName ?? "";
    const list = map.get(key) ?? [];
    list.push(product);
    map.set(key, list);
  }

  // Named categories first (sorted), uncategorized last
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === "" && b !== "") return 1;
      if (a !== "" && b === "") return -1;
      return a.localeCompare(b, "tr");
    })
    .map(([category, items]) => ({ category: category || null, items }));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProductCard({ product }: { product: ProductPublic }) {
  return (
    <div className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{product.name}</p>
          {product.brand && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product.brand}
            </p>
          )}
        </div>
        <Badge
          variant={product.inStock ? "default" : "secondary"}
          className="shrink-0 text-xs"
        >
          {product.inStock ? "In Stock" : "Out of Stock"}
        </Badge>
      </div>

      {product.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {product.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        {product.categoryName ? (
          <Badge variant="outline" className="text-xs font-normal">
            {product.categoryName}
          </Badge>
        ) : (
          <span />
        )}
        <span className="ml-auto text-base font-semibold">
          {formatPrice(product.sellingPrice)}
        </span>
      </div>
    </div>
  );
}

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
    <div className="space-y-10">
      <div>
        <Skeleton className="mb-6 h-7 w-32" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items have no stable id
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
