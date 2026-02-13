"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CustomerInfo = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

type BookingFormProps = {
  initialValues: CustomerInfo;
  onSubmit: (values: CustomerInfo) => void;
  onBack?: () => void;
  /** When true, renders without navigation buttons (used in accordion confirm panel) */
  inline?: boolean;
  /** Called on every field change */
  onChange?: (values: CustomerInfo) => void;
};

export function BookingForm({
  initialValues,
  onSubmit,
  onBack,
  inline = false,
  onChange,
}: BookingFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [phone, setPhone] = useState(initialValues.phone);
  const [email, setEmail] = useState(initialValues.email);
  const [notes, setNotes] = useState(initialValues.notes);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Full name is required";
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+90 5\d{2} \d{3} \d{2} \d{2}$/.test(phone)) {
      newErrors.phone = "Format: +90 5XX XXX XX XX";
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const notifyChange = (values: CustomerInfo) => {
    if (onChange) {
      onChange(values);
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    notifyChange({ name: value, phone, email, notes });
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    notifyChange({ name, phone: value, email, notes });
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    notifyChange({ name, phone, email: value, notes });
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    notifyChange({ name, phone, email, notes: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ name, phone, email, notes });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Your full name"
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone *</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder="+90 5XX XXX XX XX"
          aria-required="true"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? "phone-error" : undefined}
        />
        {errors.phone && (
          <p id="phone-error" className="text-sm text-destructive">
            {errors.phone}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          placeholder="example@email.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Any special requests or notes..."
          rows={3}
        />
      </div>

      {!inline && (
        <div className="flex gap-3 pt-2">
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
          <Button type="submit">Continue</Button>
        </div>
      )}
    </form>
  );
}
