import {
  Column,
  Heading,
  Hr,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { EmailButton } from "./components/EmailButton";
import { EmailFooter } from "./components/EmailFooter";
import { EmailHeader } from "./components/EmailHeader";
import { EmailLayout } from "./components/EmailLayout";

interface Service {
  name: string;
  duration: number;
  price: number;
}

export interface BookingConfirmationProps {
  organizationName: string;
  organizationLogo?: string;
  customerName: string;
  confirmationCode: string;
  date: string;
  startTime: string;
  endTime: string;
  services: Service[];
  staffName: string;
  total: number;
  customerNotes?: string;
  viewUrl: string;
  address?: string;
}

function formatPrice(kurus: number): string {
  return `₺${(kurus / 100).toFixed(2)}`;
}

export default function BookingConfirmation({
  organizationName,
  organizationLogo,
  customerName,
  confirmationCode,
  date,
  startTime,
  endTime,
  services,
  staffName,
  total,
  customerNotes,
  viewUrl,
  address,
}: BookingConfirmationProps) {
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : undefined;
  return (
    <EmailLayout
      previewText={`Your appointment is confirmed for ${date} at ${startTime}`}
    >
      <EmailHeader
        organizationName={organizationName}
        organizationLogo={organizationLogo}
      />

      <Section className="px-10 py-8">
        <Heading as="h1" className="m-0 mb-4 text-xl font-bold text-gray-900">
          Your appointment is confirmed!
        </Heading>
        <Text className="m-0 mb-6 text-sm text-gray-600">
          Hi {customerName}, your booking has been confirmed. Here are the
          details:
        </Text>

        {/* Appointment Details Card */}
        <Section className="mb-6 rounded border-solid border border-gray-200 p-5">
          <Row className="mb-3">
            <Column className="w-1/2">
              <Text className="m-0 text-xs font-medium uppercase text-muted">
                Date
              </Text>
              <Text className="m-0 mt-1 text-sm font-semibold text-gray-900">
                {date}
              </Text>
            </Column>
            <Column className="w-1/2">
              <Text className="m-0 text-xs font-medium uppercase text-muted">
                Time
              </Text>
              <Text className="m-0 mt-1 text-sm font-semibold text-gray-900">
                {startTime} - {endTime}
              </Text>
            </Column>
          </Row>

          <Hr className="border-t-solid my-3 border-t border-t-gray-100" />

          <Text className="m-0 text-xs font-medium uppercase text-muted">
            Services
          </Text>
          {services.map((service, index) => (
            <Row key={`${service.name}-${index}`} className="mt-1">
              <Column>
                <Text className="m-0 text-sm text-gray-900">
                  {service.name}{" "}
                  <span className="text-muted">({service.duration} min)</span>
                </Text>
              </Column>
              <Column className="text-right">
                <Text className="m-0 text-sm text-gray-900">
                  {formatPrice(service.price)}
                </Text>
              </Column>
            </Row>
          ))}

          <Hr className="border-t-solid my-3 border-t border-t-gray-100" />

          <Row>
            <Column>
              <Text className="m-0 text-xs font-medium uppercase text-muted">
                Staff
              </Text>
              <Text className="m-0 mt-1 text-sm text-gray-900">
                {staffName}
              </Text>
            </Column>
            <Column className="text-right">
              <Text className="m-0 text-xs font-medium uppercase text-muted">
                Total
              </Text>
              <Text className="m-0 mt-1 text-sm font-bold text-gray-900">
                {formatPrice(total)}
              </Text>
            </Column>
          </Row>

          {address && (
            <>
              <Hr className="border-t-solid my-3 border-t border-t-gray-100" />
              <Text className="m-0 text-xs font-medium uppercase text-muted">
                Location
              </Text>
              <Text className="m-0 mt-1 text-sm text-gray-900">
                <Link
                  href={mapsUrl}
                  className="text-gray-900 underline"
                >
                  {address}
                </Link>
              </Text>
            </>
          )}
        </Section>

        {customerNotes && (
          <Section className="mb-6">
            <Text className="m-0 text-xs font-medium uppercase text-muted">
              Your Notes
            </Text>
            <Text className="m-0 mt-1 text-sm italic text-gray-600">
              {customerNotes}
            </Text>
          </Section>
        )}

        {/* Confirmation Code */}
        <Section className="mb-6 rounded bg-gray-50 p-4 text-center">
          <Text className="m-0 text-xs font-medium uppercase text-muted">
            Confirmation Code
          </Text>
          <Text className="m-0 mt-1 font-mono text-2xl font-bold tracking-widest text-gray-900">
            {confirmationCode}
          </Text>
        </Section>

        {/* CTA */}
        <Section className="text-center">
          <EmailButton href={viewUrl}>View or Cancel Appointment</EmailButton>
        </Section>
      </Section>

      <EmailFooter organizationName={organizationName} />
    </EmailLayout>
  );
}

BookingConfirmation.PreviewProps = {
  organizationName: "Luxe Hair Studio",
  customerName: "Jane Doe",
  confirmationCode: "A3B7K9",
  date: "February 15, 2025",
  startTime: "09:00 AM",
  endTime: "10:00 AM",
  services: [
    { name: "Haircut", duration: 30, price: 15000 },
    { name: "Blow Dry", duration: 30, price: 10000 },
  ],
  staffName: "Sarah Johnson",
  total: 25000,
  customerNotes: "Please use organic products",
  viewUrl: "https://example.com/luxe-hair/appointment/A3B7K9",
  address: "123 Main St, Istanbul, Turkey",
} satisfies BookingConfirmationProps;
