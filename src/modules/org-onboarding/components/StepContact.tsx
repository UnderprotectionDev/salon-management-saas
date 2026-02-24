"use client";

import { useEffect, useRef, useState } from "react";
import { PhoneInput } from "@/components/reui/phone-input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CITY_NAMES, getDistricts } from "@/lib/data/turkey-cities";
import { loadNeighbourhoods } from "@/lib/data/neighbourhood-loader";
import { authClient } from "@/lib/auth-client";
import type { WizardFormData } from "../hooks/useOnboardingForm";
import { ONBOARDING_INPUT } from "../lib/constants";
import { SectionDivider } from "./SectionDivider";

export function StepContact({
  data,
  onChange,
  onPrefillEmail,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  onPrefillEmail: (email: string) => void;
}) {
  const districts = data.city ? getDistricts(data.city) : [];
  const [neighbourhoods, setNeighbourhoods] = useState<string[]>([]);
  const [districtHighlight, setDistrictHighlight] = useState(false);
  const [neighbourhoodHighlight, setNeighbourhoodHighlight] = useState(false);
  const prevCityRef = useRef(data.city);
  const prevDistrictRef = useRef(data.district);

  // Pre-fill email from auth session
  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user?.email) {
          onPrefillEmail(session.data.user.email);
        }
      } catch {
        // Session fetch failed; email will not be pre-filled
      }
    };
    fetchEmail();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight district when city changes
  useEffect(() => {
    if (data.city && data.city !== prevCityRef.current) {
      setDistrictHighlight(true);
      const timer = setTimeout(() => setDistrictHighlight(false), 1000);
      prevCityRef.current = data.city;
      return () => clearTimeout(timer);
    }
    prevCityRef.current = data.city;
  }, [data.city]);

  // Load neighbourhoods when district changes
  useEffect(() => {
    if (data.city && data.district) {
      loadNeighbourhoods(data.city, data.district).then(setNeighbourhoods);
      if (data.district !== prevDistrictRef.current) {
        setNeighbourhoodHighlight(true);
        const timer = setTimeout(() => setNeighbourhoodHighlight(false), 1000);
        prevDistrictRef.current = data.district;
        return () => clearTimeout(timer);
      }
    } else {
      setNeighbourhoods([]);
    }
    prevDistrictRef.current = data.district;
  }, [data.city, data.district]);

  // Contact fields completion
  const contactFields = [data.email, data.phone].filter(Boolean).length;
  const addressFields = [
    data.city,
    data.district,
    data.neighbourhood,
    data.street,
    data.postalCode,
  ].filter(Boolean).length;

  return (
    <div className="space-y-8">
      {/* Contact Section */}
      <SectionDivider
        title="Contact"
        badge="OPTIONAL"
        complete={contactFields === 2}
      />

      <div className="rounded-lg border border-border/50 p-5 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="hello@yoursalon.com"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
              className={ONBOARDING_INPUT}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <PhoneInput
              defaultCountry="TR"
              value={data.phone as never}
              onChange={(value) => onChange({ phone: (value as string) || "" })}
              maxInputLength={10}
              placeholder="506 123 12 12"
            />
          </Field>
        </div>
      </div>

      {/* Address Section */}
      <SectionDivider
        title="Address"
        badge="OPTIONAL"
        complete={addressFields >= 2}
      />

      <div className="rounded-lg border border-border/50 p-5 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel>City</FieldLabel>
            <SearchableSelect
              items={CITY_NAMES}
              value={data.city}
              onValueChange={(value) =>
                onChange({ city: value, district: "", neighbourhood: "" })
              }
              placeholder="Select city"
              searchPlaceholder="Search city..."
            />
          </Field>

          <Field>
            <FieldLabel>District</FieldLabel>
            <div
              className={`transition-all duration-300 rounded ${
                districtHighlight ? "ring-2 ring-brand/50" : ""
              }`}
            >
              <SearchableSelect
                items={districts}
                value={data.district}
                onValueChange={(value) =>
                  onChange({ district: value, neighbourhood: "" })
                }
                placeholder="Select district"
                searchPlaceholder="Search district..."
                disabled={!data.city}
              />
            </div>
          </Field>
        </div>

        <Field>
          <FieldLabel>Neighbourhood</FieldLabel>
          <div
            className={`transition-all duration-300 rounded ${
              neighbourhoodHighlight ? "ring-2 ring-brand/50" : ""
            }`}
          >
            <SearchableSelect
              items={neighbourhoods}
              value={data.neighbourhood}
              onValueChange={(value) => onChange({ neighbourhood: value })}
              placeholder={
                data.district
                  ? "Select neighbourhood"
                  : "Select district first"
              }
              searchPlaceholder="Search neighbourhood..."
              disabled={!data.district}
            />
          </div>
        </Field>

        <div className="grid gap-6 sm:grid-cols-[1fr_160px]">
          <Field>
            <FieldLabel htmlFor="street">Street Address</FieldLabel>
            <Input
              id="street"
              placeholder="123 Main Street, Floor 2"
              value={data.street}
              onChange={(e) => onChange({ street: e.target.value })}
              className={ONBOARDING_INPUT}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="postalCode">Postal Code</FieldLabel>
            <Input
              id="postalCode"
              placeholder="34000"
              value={data.postalCode}
              onChange={(e) => onChange({ postalCode: e.target.value })}
              className={ONBOARDING_INPUT}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
