"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { WizardFormData } from "./useOnboardingForm";

export function useSalonCreation() {
  const [isCreating, setIsCreating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");

  const createOrganization = useMutation(api.organizations.create);
  const updateSettings = useMutation(api.organizations.updateSettings);
  const updateSalonType = useMutation(api.organizations.updateSalonType);
  const updateOrg = useMutation(api.organizations.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveOrganizationLogo = useMutation(api.files.saveOrganizationLogo);

  const handleCreateSalon = async (
    formData: WizardFormData,
    logoFile: File | null,
  ) => {
    setIsCreating(true);
    try {
      const result = await createOrganization({
        name: formData.name,
        slug: formData.slug,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      });

      const promises: Promise<unknown>[] = [];
      const hasAddress =
        formData.street ||
        formData.city ||
        formData.district ||
        formData.neighbourhood ||
        formData.postalCode;

      promises.push(
        updateSettings({
          organizationId: result.organizationId,
          businessHours: formData.businessHours,
          ...(hasAddress
            ? {
                address: {
                  street: formData.street || undefined,
                  city: formData.city || undefined,
                  state: formData.district || undefined,
                  neighbourhood: formData.neighbourhood || undefined,
                  postalCode: formData.postalCode || undefined,
                  country: "Turkey",
                },
              }
            : {}),
        }),
      );

      if (formData.salonType.length > 0) {
        promises.push(
          updateSalonType({
            organizationId: result.organizationId,
            salonType: formData.salonType,
          }),
        );
      }

      if (formData.description) {
        promises.push(
          updateOrg({
            organizationId: result.organizationId,
            description: formData.description,
          }),
        );
      }

      if (logoFile) {
        promises.push(
          (async () => {
            const uploadUrl = await generateUploadUrl({});
            const res = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": logoFile.type },
              body: logoFile,
            });
            const { storageId } = await res.json();
            await saveOrganizationLogo({
              organizationId: result.organizationId,
              storageId,
              fileName: logoFile.name,
              fileType: logoFile.type,
              fileSize: logoFile.size,
            });
          })(),
        );
      }

      await Promise.all(promises);
      setCreatedSlug(result.slug);
      setIsComplete(true);
    } catch (error) {
      console.error("Failed to create salon:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create salon";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  return { isCreating, isComplete, createdSlug, handleCreateSalon };
}
