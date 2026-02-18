"use client";

import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import {
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import Cropper from "react-easy-crop";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

type OrgSalonType = "hair" | "nail" | "makeup" | "barber" | "spa" | "multi";
type DesignSalonType = "hair" | "nail" | "makeup" | "multi";

// Service areas shown in multi-service selector
const MULTI_SERVICE_AREAS: { value: DesignSalonType; label: string }[] = [
  { value: "hair", label: "Hair" },
  { value: "nail", label: "Nails" },
  { value: "makeup", label: "Makeup" },
];

// Category presets per salon type
const CATEGORY_PRESETS: Record<OrgSalonType, string[]> = {
  hair: [
    "Balayage",
    "Ombre",
    "Highlights",
    "Bob",
    "Pixie Cut",
    "Layers",
    "Braids",
    "Updo",
    "Color Correction",
    "Extensions",
  ],
  nail: [
    "French Tips",
    "Gel Art",
    "Acrylic",
    "Chrome Nails",
    "Marble",
    "Ombre Nails",
    "3D Art",
    "Minimalist",
    "Gel Polish",
  ],
  makeup: [
    "Bridal",
    "Smokey Eye",
    "Natural Glam",
    "Evening Look",
    "Cut Crease",
    "Editorial",
    "No-Makeup Look",
    "Special FX",
  ],
  barber: [
    "Fade",
    "Undercut",
    "Buzz Cut",
    "Pompadour",
    "Beard Trim",
    "Line Up",
    "Taper",
    "Textured Crop",
  ],
  spa: ["Facial", "Body Treatment", "Anti-Aging", "Deep Cleanse", "Relaxation"],
  multi: [
    "Balayage",
    "Ombre",
    "Highlights",
    "Bob",
    "Pixie Cut",
    "French Tips",
    "Gel Art",
    "Acrylic",
    "Chrome Nails",
    "Bridal",
    "Smokey Eye",
    "Natural Glam",
    "Fade",
    "Undercut",
    "Beard Trim",
  ],
};

// Map org salon type → design catalog salonType field
function toDesignSalonType(
  orgType: OrgSalonType | null | undefined,
  serviceArea?: DesignSalonType,
): DesignSalonType {
  if (orgType === "multi") return serviceArea ?? "hair";
  if (orgType === "barber" || orgType === "spa") return "hair";
  return (orgType as DesignSalonType | undefined) ?? "hair";
}

// Categories to show based on org type (and service area for multi)
function getCategories(
  orgType: OrgSalonType | null | undefined,
  serviceArea?: DesignSalonType,
): string[] {
  if (orgType === "multi" && serviceArea) {
    return CATEGORY_PRESETS[serviceArea] ?? CATEGORY_PRESETS.hair;
  }
  return CATEGORY_PRESETS[orgType ?? "hair"] ?? CATEGORY_PRESETS.hair;
}

// =============================================================================
// Form state
// =============================================================================

interface DesignFormState {
  name: string;
  category: string;
  description: string;
  tags: string[];
  serviceArea: DesignSalonType; // only relevant for multi
}

// =============================================================================
// Canvas crop utility
// =============================================================================

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

// =============================================================================
// Crop Dialog
// =============================================================================

function CropDialog({
  open,
  imageSrc,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onApply,
  onCancel,
}: {
  open: boolean;
  imageSrc: string | null;
  crop: { x: number; y: number };
  zoom: number;
  onCropChange: (c: { x: number; y: number }) => void;
  onZoomChange: (z: number) => void;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  // Local string state so user can type freely without interference
  const [zoomInput, setZoomInput] = useState(String(Math.round(zoom * 100)));
  const [isFocused, setIsFocused] = useState(false);

  // Sync input when zoom changes externally (e.g. slider), but only when not typing
  if (!isFocused && String(Math.round(zoom * 100)) !== zoomInput) {
    setZoomInput(String(Math.round(zoom * 100)));
  }

  function applyZoomInput(raw: string) {
    const pct = Number.parseInt(raw, 10);
    if (!Number.isNaN(pct)) {
      const clamped = Math.min(400, Math.max(50, pct));
      onZoomChange(clamped / 100);
      setZoomInput(String(clamped));
    } else {
      // Reset to current zoom if invalid
      setZoomInput(String(Math.round(zoom * 100)));
    }
  }

  if (!imageSrc) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>Choose visible area</DialogTitle>
          <DialogDescription>
            Drag to position. The square frame is what customers will see. Pinch
            or use the slider to zoom.
          </DialogDescription>
        </DialogHeader>

        {/* Cropper container — objectFit="cover" fills container, no black bars */}
        <div className="relative h-[420px] w-full bg-neutral-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            objectFit="cover"
            minZoom={0.5}
            maxZoom={4}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropComplete}
            showGrid={true}
            style={{
              containerStyle: { borderRadius: 0 },
            }}
          />
        </div>

        {/* Zoom slider + input */}
        <div className="flex items-center gap-3 px-5 py-3">
          <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="flex-1 accent-foreground"
            aria-label="Zoom"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex items-center shrink-0">
            <input
              type="text"
              inputMode="numeric"
              value={zoomInput}
              onChange={(e) =>
                setZoomInput(e.target.value.replace(/[^0-9]/g, ""))
              }
              onFocus={(e) => {
                setIsFocused(true);
                e.target.select();
              }}
              onBlur={() => {
                setIsFocused(false);
                applyZoomInput(zoomInput);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const next = Math.min(400, Math.round(zoom * 100) + 5);
                  onZoomChange(next / 100);
                  setZoomInput(String(next));
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = Math.max(50, Math.round(zoom * 100) - 5);
                  onZoomChange(next / 100);
                  setZoomInput(String(next));
                }
              }}
              className="w-14 rounded-md border border-input bg-background px-2 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Zoom percentage"
            />
            <span className="ml-1 text-muted-foreground text-sm">%</span>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onApply}>Use This Area</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================

const DEFAULT_FORM: DesignFormState = {
  name: "",
  category: "",
  description: "",
  tags: [],
  serviceArea: "hair",
};

// =============================================================================
// Main component
// =============================================================================

export function DesignCatalogManager() {
  const { activeOrganization, currentRole, currentStaff } = useOrganization();
  const isOwner = currentRole === "owner";
  const orgSalonType = activeOrganization?.salonType as
    | OrgSalonType
    | null
    | undefined;
  const isMulti = orgSalonType === "multi";

  const designs = useQuery(
    api.designCatalog.listAllByOrg,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  const createDesign = useMutation(api.designCatalog.create);
  const updateDesign = useMutation(api.designCatalog.update);
  const setStatus = useMutation(api.designCatalog.setStatus);
  const removeDesign = useMutation(api.designCatalog.remove);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Sheet open state: null = closed, "create" = adding, design._id = editing
  const [sheetMode, setSheetMode] = useState<
    null | "create" | Id<"designCatalog">
  >(null);
  const [deleteId, setDeleteId] = useState<Id<"designCatalog"> | null>(null);
  const [form, setForm] = useState<DesignFormState>(DEFAULT_FORM);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop state
  const [cropOpen, setCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  if (!activeOrganization) return null;

  const organizationId = activeOrganization._id;

  // Unique categories from existing designs for the filter bar
  const existingCategories = designs
    ? [...new Set(designs.map((d) => d.category))].sort()
    : [];

  const filteredDesigns = designs
    ? categoryFilter === "all"
      ? designs
      : designs.filter((d) => d.category === categoryFilter)
    : [];

  function canEdit(design: NonNullable<typeof designs>[number]) {
    if (isOwner) return true;
    return design.createdByStaffId === currentStaff?._id;
  }

  // ---- File handling + crop ----

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }
    // Open crop dialog with raw image
    const rawUrl = URL.createObjectURL(file);
    setRawImageSrc(rawUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function applyCrop() {
    if (!rawImageSrc || !croppedAreaPixels) return;

    const blob = await getCroppedBlob(rawImageSrc, croppedAreaPixels);
    const croppedFile = new File([blob], "design.jpg", { type: "image/jpeg" });

    // Revoke old imagePreview blob URL (if any) before replacing
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(croppedFile);
    setImagePreview(URL.createObjectURL(blob));
    setCropOpen(false);

    // Revoke rawImageSrc now that cropping is complete
    URL.revokeObjectURL(rawImageSrc);
    setRawImageSrc(null);
  }

  function clearImage() {
    // Revoke blob URLs before clearing state
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    if (rawImageSrc) {
      URL.revokeObjectURL(rawImageSrc);
    }
    setImageFile(null);
    setImagePreview(null);
    setRawImageSrc(null);
    setCropOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImage(file: File): Promise<Id<"_storage">> {
    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) {
      throw new Error("Failed to upload image");
    }
    const result = (await response.json()) as { storageId: Id<"_storage"> };
    return result.storageId;
  }

  // ---- Tag handling ----

  function addTag(value: string) {
    const trimmed = value.trim().toLowerCase();
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm((f) => ({ ...f, tags: [...f.tags, trimmed] }));
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1]);
    }
  }

  // ---- Sheet open/close ----

  function openCreate() {
    setForm({
      ...DEFAULT_FORM,
      serviceArea: isMulti ? "hair" : toDesignSalonType(orgSalonType),
    });
    clearImage();
    setTagInput("");
    setSheetMode("create");
  }

  function openEdit(design: NonNullable<typeof designs>[number]) {
    setForm({
      name: design.name,
      category: design.category,
      description: design.description ?? "",
      tags: design.tags,
      serviceArea:
        design.salonType === "hair" ||
        design.salonType === "nail" ||
        design.salonType === "makeup"
          ? design.salonType
          : "hair",
    });
    // Show existing image as preview
    setImagePreview(design.thumbnailUrl ?? design.imageUrl ?? null);
    setImageFile(null);
    setTagInput("");
    setSheetMode(design._id);
  }

  function closeSheet() {
    setSheetMode(null);
    setForm(DEFAULT_FORM);
    clearImage();
    setTagInput("");
  }

  // ---- Submit handlers ----

  async function handleCreate() {
    if (!imageFile) {
      toast.error("Please select an image");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.category) {
      toast.error("Category is required");
      return;
    }

    setUploading(true);
    try {
      const storageId = await uploadImage(imageFile);
      await createDesign({
        organizationId,
        name: form.name.trim(),
        category: form.category,
        imageStorageId: storageId,
        description: form.description.trim() || undefined,
        tags: form.tags,
        salonType: toDesignSalonType(
          orgSalonType,
          isMulti ? form.serviceArea : undefined,
        ),
      });
      toast.success("Design added to catalog");
      closeSheet();
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? ((error.data as { message?: string }).message ?? "Error")
          : "Failed to create design",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleUpdate() {
    const editingId = sheetMode as Id<"designCatalog">;
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!form.category) {
      toast.error("Category is required");
      return;
    }

    setUploading(true);
    try {
      let newStorageId: Id<"_storage"> | undefined;
      if (imageFile) {
        newStorageId = await uploadImage(imageFile);
      }

      await updateDesign({
        organizationId,
        designId: editingId,
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim() || undefined,
        tags: form.tags,
        salonType: toDesignSalonType(
          orgSalonType,
          isMulti ? form.serviceArea : undefined,
        ),
        ...(newStorageId ? { imageStorageId: newStorageId } : {}),
      });
      toast.success("Design updated");
      closeSheet();
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? ((error.data as { message?: string }).message ?? "Error")
          : "Failed to update design",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleStatus(
    id: Id<"designCatalog">,
    currentStatus: string,
  ) {
    try {
      await setStatus({
        organizationId,
        designId: id,
        status: currentStatus === "active" ? "inactive" : "active",
      });
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await removeDesign({
        organizationId,
        designId: deleteId,
      });
      toast.success("Design deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete design");
    }
  }

  // ---- Derived form state ----
  const isEditing = sheetMode !== null && sheetMode !== "create";
  const categoryOptions = getCategories(
    orgSalonType,
    isMulti ? form.serviceArea : undefined,
  );

  // ---- Empty state ----
  if (designs && designs.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed py-20">
          <ImagePlus className="h-12 w-12 text-muted-foreground" />
          <h3 className="font-medium text-lg">No designs yet</h3>
          <p className="text-muted-foreground text-sm">
            Upload designs for customers to browse and virtually try on
          </p>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add First Design
          </Button>
        </div>
        <DesignSheet
          open={sheetMode !== null}
          onOpenChange={(open) => {
            if (!open) closeSheet();
          }}
          isEditing={isEditing}
          isMulti={isMulti}
          form={form}
          setForm={setForm}
          imagePreview={imagePreview}
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
          onClearImage={clearImage}
          tagInput={tagInput}
          setTagInput={setTagInput}
          onTagKeyDown={handleTagKeyDown}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          categoryOptions={categoryOptions}
          onSubmit={isEditing ? handleUpdate : handleCreate}
          uploading={uploading}
        />
        <CropDialog
          open={cropOpen}
          imageSrc={rawImageSrc}
          crop={crop}
          zoom={zoom}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          onApply={applyCrop}
          onCancel={clearImage}
        />
      </>
    );
  }

  return (
    <>
      {/* Header: filter tabs + add button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === "all"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          {existingCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Design
        </Button>
      </div>

      {/* Staff notice */}
      {!isOwner && (
        <p className="mb-3 text-muted-foreground text-xs">
          You can add and edit your own designs. Owners manage status and
          deletion.
        </p>
      )}

      {/* Uniform grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filteredDesigns.map((design) => {
          const editable = canEdit(design);
          return (
            <div key={design._id}>
              <div className="group relative overflow-hidden rounded-md border bg-muted">
                {design.imageUrl ? (
                  // biome-ignore lint/performance/noImgElement: storage URL, not static asset
                  <img
                    src={design.thumbnailUrl ?? design.imageUrl}
                    alt={design.name}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center">
                    <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}

                {/* Status badge */}
                <div className="absolute right-2 top-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      design.status === "active"
                        ? "bg-green-500/90 text-white"
                        : "bg-black/60 text-white"
                    }`}
                  >
                    {design.status}
                  </span>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate font-semibold text-sm text-white">
                    {design.name}
                  </p>
                  <p className="text-white/70 text-xs">{design.category}</p>

                  <div className="mt-2 flex items-center gap-1.5">
                    {isOwner && (
                      <Switch
                        checked={design.status === "active"}
                        onCheckedChange={() =>
                          handleToggleStatus(design._id, design.status)
                        }
                        aria-label={`Toggle ${design.name}`}
                        className="scale-75"
                      />
                    )}
                    {editable && (
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(design)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isOwner && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDeleteId(design._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Sheet */}
      <DesignSheet
        open={sheetMode !== null}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        isEditing={isEditing}
        isMulti={isMulti}
        form={form}
        setForm={setForm}
        imagePreview={imagePreview}
        fileInputRef={fileInputRef}
        onFileSelect={handleFileSelect}
        onClearImage={clearImage}
        tagInput={tagInput}
        setTagInput={setTagInput}
        onTagKeyDown={handleTagKeyDown}
        onAddTag={addTag}
        onRemoveTag={removeTag}
        categoryOptions={categoryOptions}
        onSubmit={isEditing ? handleUpdate : handleCreate}
        uploading={uploading}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Design</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The design will be permanently
              removed from the catalog.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crop Dialog */}
      <CropDialog
        open={cropOpen}
        imageSrc={rawImageSrc}
        crop={crop}
        zoom={zoom}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={onCropComplete}
        onApply={applyCrop}
        onCancel={clearImage}
      />
    </>
  );
}

// =============================================================================
// Design Sheet (Add / Edit)
// =============================================================================

function DesignSheet({
  open,
  onOpenChange,
  isEditing,
  isMulti,
  form,
  setForm,
  imagePreview,
  fileInputRef,
  onFileSelect,
  onClearImage,
  tagInput,
  setTagInput,
  onTagKeyDown,
  onAddTag,
  onRemoveTag,
  categoryOptions,
  onSubmit,
  uploading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  isMulti: boolean;
  form: DesignFormState;
  setForm: React.Dispatch<React.SetStateAction<DesignFormState>>;
  imagePreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  tagInput: string;
  setTagInput: (v: string) => void;
  onTagKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddTag: (v: string) => void;
  onRemoveTag: (tag: string) => void;
  categoryOptions: string[];
  onSubmit: () => void;
  uploading: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{isEditing ? "Edit Design" : "Add Design"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the design details below."
              : "Upload a photo and fill in the details."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 p-6 flex-1">
          {/* Image upload */}
          <div>
            <Label className="mb-2 block">
              Image{!isEditing && <span className="text-destructive"> *</span>}
            </Label>
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-md border">
                {/* biome-ignore lint/performance/noImgElement: blob/storage URL preview */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-64 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={onClearImage}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-white text-xs hover:bg-black/80"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed py-10 text-muted-foreground transition-colors hover:bg-muted/50"
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm">Click to upload</span>
                <span className="text-xs">JPEG, PNG or WebP · max 5MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileSelect}
              className="hidden"
            />
          </div>

          {/* Service area — only for multi-service */}
          {isMulti && (
            <div>
              <Label htmlFor="service-area" className="mb-1.5 block">
                Service Area
              </Label>
              <Select
                value={form.serviceArea}
                onValueChange={(v) => {
                  setForm((f) => ({
                    ...f,
                    serviceArea: v as DesignSalonType,
                    category: "", // reset category when area changes
                  }));
                }}
              >
                <SelectTrigger id="service-area">
                  <SelectValue placeholder="Select service area" />
                </SelectTrigger>
                <SelectContent>
                  {MULTI_SERVICE_AREAS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Name */}
          <div>
            <Label htmlFor="design-name" className="mb-1.5 block">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="design-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. French Tips"
              disabled={uploading}
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="design-category" className="mb-1.5 block">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              disabled={uploading}
            >
              <SelectTrigger id="design-category">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="design-description" className="mb-1.5 block">
              Description{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="design-description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Brief description of the design..."
              rows={2}
              disabled={uploading}
            />
          </div>

          {/* Tags — chip input */}
          <div>
            <Label className="mb-1.5 block">
              Tags{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
              {form.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onRemoveTag(tag)}
                    className="rounded-full hover:bg-muted"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={() => {
                  if (tagInput.trim()) onAddTag(tagInput);
                }}
                placeholder={
                  form.tags.length === 0 ? "Type tag, press Enter..." : ""
                }
                className="flex-1 min-w-16 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                disabled={uploading}
              />
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              Press Enter or comma to add a tag
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={uploading}>
            {uploading
              ? "Uploading..."
              : isEditing
                ? "Save Changes"
                : "Add Design"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
