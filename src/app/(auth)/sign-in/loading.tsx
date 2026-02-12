import { Spinner } from "@/components/ui/spinner";

export default function SignInLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}
