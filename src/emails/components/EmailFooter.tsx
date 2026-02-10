import { Hr, Section, Text } from "@react-email/components";

interface EmailFooterProps {
  organizationName: string;
}

export function EmailFooter({ organizationName }: EmailFooterProps) {
  return (
    <Section className="px-10 pb-8 pt-4">
      <Hr className="border-t-solid border-t border-t-gray-200" />
      <Text className="text-center text-xs text-muted">{organizationName}</Text>
    </Section>
  );
}
