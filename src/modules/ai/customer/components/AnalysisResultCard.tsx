"use client";

import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AnalysisFeature {
  name: string;
  value: string;
  description: string;
}

export interface RecommendedService {
  serviceId?: string;
  reason: string;
}

export interface CareTip {
  title: string;
  description: string;
}

export interface ProductRecommendation {
  productName: string;
  reason: string;
}

export interface AnalysisResult {
  features: AnalysisFeature[];
  recommendedServices: RecommendedService[];
  careTips: CareTip[];
  productRecommendations: ProductRecommendation[];
  summary: string;
}

export function AnalysisResultCard({ result }: { result: AnalysisResult }) {
  const [showProducts, setShowProducts] = useState(false);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {result.features.map((feature) => (
              <div key={feature.name} className="rounded-md border p-3">
                <div className="font-medium text-sm">{feature.name}</div>
                <div className="text-primary text-sm">{feature.value}</div>
                <div className="mt-1 text-muted-foreground text-xs">
                  {feature.description}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Services */}
      {result.recommendedServices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4" />
              Recommended Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.recommendedServices.map((service, idx) => (
                <div
                  key={service.serviceId ?? idx}
                  className="flex items-start gap-2"
                >
                  <span className="text-muted-foreground text-sm">
                    {service.reason}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Care Tips */}
      {result.careTips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4" />
              Care Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.careTips.map((tip) => (
                <div key={tip.title}>
                  <div className="font-medium text-sm">{tip.title}</div>
                  <div className="text-muted-foreground text-sm">
                    {tip.description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Recommendations (collapsible) */}
      {result.productRecommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              type="button"
              className="flex w-full items-center justify-between"
              onClick={() => setShowProducts((prev) => !prev)}
            >
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-4 w-4" />
                Product Suggestions
              </CardTitle>
              {showProducts ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CardHeader>
          {showProducts && (
            <CardContent>
              <div className="space-y-2">
                {result.productRecommendations.map((product) => (
                  <div key={product.productName}>
                    <div className="font-medium text-sm">
                      {product.productName}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {product.reason}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
