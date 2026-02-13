"use client";

import { useMutation } from "convex/react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "../../../../convex/_generated/api";

type ConsentModalProps = {
  open: boolean;
};

export function ConsentModal({ open }: ConsentModalProps) {
  const [dataConsent, setDataConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const acceptConsent = useMutation(api.userProfile.acceptConsent);

  const handleAccept = async () => {
    if (!dataConsent) {
      toast.error("Devam etmek için veri işleme onayı gereklidir.");
      return;
    }

    setIsSubmitting(true);
    try {
      await acceptConsent({ marketingConsent });
      toast.success("Onayınız kaydedildi.");
    } catch {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            Kişisel Verilerin Korunması
          </DialogTitle>
          <DialogDescription className="text-center">
            Hizmetlerimizi kullanabilmek için kişisel verilerinizin işlenmesini
            onaylamanız gerekmektedir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Required: Data processing consent */}
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="data-consent"
              checked={dataConsent}
              onCheckedChange={(checked) => setDataConsent(checked === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor="data-consent"
                className="text-sm font-medium leading-tight cursor-pointer"
              >
                Kişisel verilerimin işlenmesini kabul ediyorum{" "}
                <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Randevu oluşturma, profil yönetimi ve hizmet sunumu için kişisel
                verileriniz KVKK kapsamında işlenecektir.{" "}
                <button
                  type="button"
                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                  onClick={() =>
                    window.open("/kvkk-aydinlatma-metni", "_blank")
                  }
                >
                  Aydınlatma Metni
                </button>
              </p>
            </div>
          </div>

          {/* Optional: Marketing consent */}
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="marketing-consent"
              checked={marketingConsent}
              onCheckedChange={(checked) =>
                setMarketingConsent(checked === true)
              }
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label
                htmlFor="marketing-consent"
                className="text-sm font-medium leading-tight cursor-pointer"
              >
                Kampanya ve bildirimlerden haberdar olmak istiyorum
              </Label>
              <p className="text-xs text-muted-foreground">
                İndirimler, yeni hizmetler ve özel teklifler hakkında email ile
                bilgilendirilirsiniz. İstediğiniz zaman iptal edebilirsiniz.
              </p>
            </div>
          </div>

          <Button
            onClick={handleAccept}
            disabled={!dataConsent || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              "Devam Et"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            6698 sayılı KVKK kapsamında haklarınız saklıdır.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
