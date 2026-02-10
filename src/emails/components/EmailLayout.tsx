import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  pixelBasedPreset,
  Tailwind,
  type TailwindConfig,
} from "@react-email/components";
import type * as React from "react";

const tailwindConfig: TailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: "#18181b",
        "brand-foreground": "#ffffff",
        muted: "#71717a",
        border: "#e4e4e7",
      },
    },
  },
};

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
}

export function EmailLayout({ previewText, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Tailwind config={tailwindConfig}>
        <Head />
        <Body className="bg-gray-50 font-sans">
          <Preview>{previewText}</Preview>
          <Container className="mx-auto max-w-xl bg-white p-0">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
