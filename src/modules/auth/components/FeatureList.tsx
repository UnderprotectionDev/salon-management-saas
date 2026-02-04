"use client";

import { PlusIcon } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

interface Feature {
  title: string;
  description: string;
}

interface FeatureListProps {
  features?: Feature[];
  className?: string;
}

const defaultFeatures: Feature[] = [
  {
    title: "AUTOMATED SCHEDULING",
    description:
      "Smart appointment booking with automatic reminders and conflict detection.",
  },
  {
    title: "CRM INTEGRATION",
    description:
      "Keep track of client preferences, history, and build lasting relationships.",
  },
  {
    title: "REAL-TIME INVENTORY",
    description:
      "Monitor stock levels, get low-stock alerts, and automate reorders.",
  },
];

export function FeatureList({
  features = defaultFeatures,
  className,
}: FeatureListProps) {
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      className={cn("w-full", className)}
    >
      {features.map((feature, index) => (
        <AccordionPrimitive.Item
          key={feature.title}
          value={`item-${index}`}
          className="border-t border-sidebar-foreground/30 last:border-b"
        >
          <AccordionPrimitive.Header className="flex">
            <AccordionPrimitive.Trigger className="group flex flex-1 items-center justify-between py-4 text-left outline-none">
              <span className="text-xs font-medium tracking-wider">
                {feature.title}
              </span>
              <PlusIcon
                className="size-4 shrink-0 transition-transform duration-300 ease-out group-data-[state=open]:rotate-45"
                strokeWidth={1.5}
              />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <p className="pb-4 text-sm text-sidebar-foreground/70 leading-relaxed">
              {feature.description}
            </p>
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
