import { Heading, Img, Section } from "@react-email/components";

interface EmailHeaderProps {
  organizationName: string;
  organizationLogo?: string;
}

export function EmailHeader({
  organizationName,
  organizationLogo,
}: EmailHeaderProps) {
  return (
    <Section className="border-b-solid border-b border-b-gray-200 px-10 py-6 text-center">
      {organizationLogo ? (
        <Img
          src={organizationLogo}
          width="48"
          height="48"
          alt={organizationName}
          className="mx-auto"
        />
      ) : (
        <Heading as="h2" className="m-0 text-lg font-semibold text-gray-900">
          {organizationName}
        </Heading>
      )}
    </Section>
  );
}
