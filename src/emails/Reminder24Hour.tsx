import {
  Column,
  Heading,
  Hr,
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
}

export interface Reminder24HourProps {
  organizationName: string;
  organizationLogo?: string;
  customerName: string;
  confirmationCode: string;
  date: string;
  startTime: string;
  endTime: string;
  services: Service[];
  staffName: string;
  viewUrl: string;
}

export default function Reminder24Hour({
  organizationName,
  organizationLogo,
  customerName,
  confirmationCode,
  date,
  startTime,
  endTime,
  services,
  staffName,
  viewUrl,
}: Reminder24HourProps) {
  return (
    <EmailLayout previewText={`Reminder: Appointment tomorrow at ${startTime}`}>
      <EmailHeader
        organizationName={organizationName}
        organizationLogo={organizationLogo}
      />

      <Section className="px-10 py-8">
        <Heading as="h1" className="m-0 mb-4 text-xl font-bold text-gray-900">
          Your appointment is tomorrow
        </Heading>
        <Text className="m-0 mb-6 text-sm text-gray-600">
          Hi {customerName}, this is a friendly reminder about your upcoming
          appointment.
        </Text>

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
          {services.map((service) => (
            <Text key={service.name} className="m-0 mt-1 text-sm text-gray-900">
              {service.name}{" "}
              <span className="text-muted">({service.duration} min)</span>
            </Text>
          ))}

          <Hr className="border-t-solid my-3 border-t border-t-gray-100" />

          <Text className="m-0 text-xs font-medium uppercase text-muted">
            Staff
          </Text>
          <Text className="m-0 mt-1 text-sm text-gray-900">{staffName}</Text>
        </Section>

        <Section className="mb-6 rounded bg-gray-50 p-4 text-center">
          <Text className="m-0 text-xs font-medium uppercase text-muted">
            Confirmation Code
          </Text>
          <Text className="m-0 mt-1 font-mono text-2xl font-bold tracking-widest text-gray-900">
            {confirmationCode}
          </Text>
        </Section>

        <Text className="m-0 mb-6 text-center text-xs text-muted">
          Please arrive 5 minutes early.
        </Text>

        <Section className="text-center">
          <EmailButton href={viewUrl}>View Appointment</EmailButton>
        </Section>
      </Section>

      <EmailFooter organizationName={organizationName} />
    </EmailLayout>
  );
}

Reminder24Hour.PreviewProps = {
  organizationName: "Luxe Hair Studio",
  customerName: "Jane Doe",
  confirmationCode: "A3B7K9",
  date: "February 15, 2025",
  startTime: "09:00 AM",
  endTime: "10:00 AM",
  services: [
    { name: "Haircut", duration: 30 },
    { name: "Blow Dry", duration: 30 },
  ],
  staffName: "Sarah Johnson",
  viewUrl: "https://example.com/luxe-hair/appointment/A3B7K9",
} satisfies Reminder24HourProps;
