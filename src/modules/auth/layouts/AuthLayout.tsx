import Image from "next/image";
import { BrandLogo } from "../components/BrandLogo";
import { FeatureList } from "../components/FeatureList";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Brand/Marketing (Dark) */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar text-sidebar-foreground flex-col p-8 font-mono">
        {/* Brand Logo */}
        <BrandLogo />

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center -mt-16">
          {/* Hero Headline */}
          <h1 className="font-serif font-bold italic text-5xl xl:text-6xl leading-[1.1] tracking-tight">
            MANAGE
            <br />
            YOUR SALON
            <br />
            WITH EASE
          </h1>

          {/* Salon Image */}
          <div className="mt-8 relative">
            <div className="aspect-[16/10] w-full max-w-xl overflow-hidden relative border border-sidebar-foreground/20">
              <Image
                src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=60"
                alt="Modern salon interior"
                fill
                className="grayscale object-cover"
                sizes="(max-width: 1024px) 0vw, 50vw"
                priority
              />
            </div>
          </div>

          {/* Feature List */}
          <FeatureList className="mt-8 max-w-xl" />

          {/* Testimonial */}
          <blockquote className="mt-8 max-w-lg">
            <p className="text-sm italic text-sidebar-foreground/70">
              "This platform transformed how we manage our salon."
            </p>
            <cite className="mt-2 block text-xs font-medium text-sidebar-foreground/50 not-italic">
              — John Doe, SALON OWNER
            </cite>
          </blockquote>
        </div>
      </div>

      {/* Right Panel - Form (White) */}
      <div className="flex-1 flex items-center justify-center bg-white text-black p-6 lg:p-12 font-mono">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
