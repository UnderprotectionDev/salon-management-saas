import { Heading, Section, Text } from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import { EmailFooter } from "./components/EmailFooter";
import { EmailHeader } from "./components/EmailHeader";
import { EmailLayout } from "./components/EmailLayout";

export interface CancellationProps {
  organizationName: string;
  organizationLogo?: string;
  recipientName: string;
  recipientType: "customer" | "staff";
  appointmentDate: string;
  appointmentTime: string;
  services: string[];
  cancelledBy: "customer" | "staff" | "system";
  cancellationReason?: string;
  bookAgainUrl?: string;
}

export default function Cancellation({
  organizationName,
  organizationLogo,
  recipientName,
  recipientType,
  appointmentDate,
  appointmentTime,
  services,
  cancelledBy,
  cancellationReason,
  bookAgainUrl,
}: CancellationProps) {
  const isCustomer = recipientType === "customer";

  const headingText = isCustomer
    ? "Your appointment has been cancelled"
    : `Appointment cancelled by ${cancelledBy}`;

  const bodyText = isCustomer
    ? `Hi ${recipientName}, your appointment has been cancelled.`
    : `Hi ${recipientName}, the following appointment has been cancelled.`;

  return (
    <EmailLayout
      previewText={`Appointment cancelled for ${appointmentDate} at ${appointmentTime}`}
    >
      <EmailHeader
        organizationName={organizationName}
        organizationLogo={organizationLogo}
      />

      <Section className="px-10 py-8">
        <Heading as="h1" className="m-0 mb-4 text-xl font-bold text-gray-900">
          {headingText}
        </Heading>
        <Text className="m-0 mb-6 text-sm text-gray-600">{bodyText}</Text>

        <Section className="mb-6 rounded border-solid border border-gray-200 p-5">
          <Text className="m-0 text-xs font-medium uppercase text-muted">
            Date & Time
          </Text>
          <Text className="m-0 mt-1 text-sm font-semibold text-gray-900">
            {appointmentDate} at {appointmentTime}
          </Text>

          <Text className="m-0 mt-4 text-xs font-medium uppercase text-muted">
            Services
          </Text>
          {services.map((service, index) => (
            <Text
              key={`${service}-${index}`}
              className="m-0 mt-1 text-sm text-gray-900"
            >
              {service}
            </Text>
          ))}

          {cancellationReason && (
            <>
              <Text className="m-0 mt-4 text-xs font-medium uppercase text-muted">
                Reason
              </Text>
              <Text className="m-0 mt-1 text-sm italic text-gray-600">
                {cancellationReason}
              </Text>
            </>
          )}
        </Section>

        {isCustomer && bookAgainUrl && (
          <Section className="text-center">
            <EmailButton href={bookAgainUrl}>Book Again</EmailButton>
          </Section>
        )}
      </Section>

      <EmailFooter organizationName={organizationName} />
    </EmailLayout>
  );
}

Cancellation.PreviewProps = {
  organizationName: "Luxe Hair Studio",
  recipientName: "Jane Doe",
  recipientType: "customer" as const,
  appointmentDate: "February 15, 2025",
  appointmentTime: "09:00 AM",
  services: ["Haircut", "Blow Dry"],
  cancelledBy: "staff" as const,
  cancellationReason: "Staff member unavailable",
  bookAgainUrl: "https://example.com/luxe-hair/book",
} satisfies CancellationProps;
