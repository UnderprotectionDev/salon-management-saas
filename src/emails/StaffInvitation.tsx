import { Heading, Section, Text } from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import { EmailFooter } from "./components/EmailFooter";
import { EmailHeader } from "./components/EmailHeader";
import { EmailLayout } from "./components/EmailLayout";

export interface StaffInvitationProps {
  organizationName: string;
  organizationLogo?: string;
  inviteeName: string;
  inviterName: string;
  role: "staff";
  acceptUrl: string;
  expiresInDays: number;
}

export default function StaffInvitation({
  organizationName,
  organizationLogo,
  inviteeName,
  inviterName,
  role: _role,
  acceptUrl,
  expiresInDays,
}: StaffInvitationProps) {
  const roleLabel = "a team member";

  return (
    <EmailLayout
      previewText={`${inviterName} invited you to join ${organizationName}`}
    >
      <EmailHeader
        organizationName={organizationName}
        organizationLogo={organizationLogo}
      />

      <Section className="px-10 py-8">
        <Heading as="h1" className="m-0 mb-4 text-xl font-bold text-gray-900">
          You're invited!
        </Heading>
        <Text className="m-0 mb-2 text-sm text-gray-600">
          Hi {inviteeName},
        </Text>
        <Text className="m-0 mb-6 text-sm text-gray-600">
          {inviterName} has invited you to join{" "}
          <strong>{organizationName}</strong> as {roleLabel}. Accept the
          invitation to get started.
        </Text>

        <Section className="mb-6 text-center">
          <EmailButton href={acceptUrl}>Accept Invitation</EmailButton>
        </Section>

        <Text className="m-0 text-center text-xs text-muted">
          This invitation expires in {expiresInDays}{" "}
          {expiresInDays === 1 ? "day" : "days"}.
        </Text>
      </Section>

      <EmailFooter organizationName={organizationName} />
    </EmailLayout>
  );
}

StaffInvitation.PreviewProps = {
  organizationName: "Luxe Hair Studio",
  inviteeName: "Alex Smith",
  inviterName: "Sarah Johnson",
  role: "staff" as const,
  acceptUrl: "https://example.com/sign-in",
  expiresInDays: 7,
} satisfies StaffInvitationProps;
