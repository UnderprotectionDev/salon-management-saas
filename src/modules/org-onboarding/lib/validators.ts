import { z } from "zod";

export const nameSchema = z
  .string()
  .min(2, "Salon name must be at least 2 characters")
  .max(100, "Salon name cannot exceed 100 characters");

export const slugSchema = z
  .string()
  .min(2, "URL slug must be at least 2 characters")
  .max(50, "URL slug cannot exceed 50 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "URL slug can only contain lowercase letters, numbers, and hyphens",
  );

export const salonTypeSchema = z
  .array(
    z.enum([
      "hair_women",
      "hair_men",
      "children",
      "braiding",
      "blowout_bar",
      "hair_extensions",
      "nail",
      "makeup",
      "skincare",
      "lash_brow",
      "permanent_makeup",
      "threading",
      "head_spa",
      "spa",
      "massage",
      "hammam",
      "sauna",
      "ayurveda",
      "float_therapy",
      "waxing",
      "tanning",
      "laser",
      "electrolysis",
      "medspa",
      "aesthetic_clinic",
      "cryotherapy",
      "iv_therapy",
      "body_contouring",
      "hair_loss",
      "tattoo",
      "piercing",
      "henna",
      "pet_grooming",
      "beauty_center",
    ]),
  )
  .min(1, "Please select at least one salon type");

export const emailSchema = z
  .string()
  .email("Please enter a valid email address");
