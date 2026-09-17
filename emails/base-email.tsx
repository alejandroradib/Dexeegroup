import { Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";

export type BaseEmailProps = { preview: string; heading: string; body: string; ctaLabel?: string; ctaUrl?: string; footer: string; logoUrl: string };

/** Single branded layout for every transactional email (Dexee brand tokens). */
export function BaseEmail({ preview, heading, body, ctaLabel, ctaUrl, footer, logoUrl }: BaseEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#EEF2F6", fontFamily: "Inter, Arial, Helvetica, sans-serif", margin: 0, padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#FFFFFF", borderRadius: 12, padding: 32, maxWidth: 560 }}>
          <Img src={logoUrl} alt="Dexee" width={120} height={34} />
          <Heading style={{ color: "#011842", fontSize: 22, fontWeight: 700, margin: "24px 0 12px" }}>{heading}</Heading>
          <Text style={{ color: "#333333", fontSize: 15, lineHeight: "24px" }}>{body}</Text>
          {ctaLabel && ctaUrl ? (
            <Section style={{ margin: "24px 0" }}>
              <Button href={ctaUrl} style={{ backgroundColor: "#02AA86", color: "#011842", fontWeight: 600, fontSize: 14, padding: "12px 20px", borderRadius: 10, textDecoration: "none" }}>
                {ctaLabel}
              </Button>
            </Section>
          ) : null}
          <Hr style={{ borderColor: "#D5DBE3" }} />
          <Text style={{ color: "#6B7280", fontSize: 12, lineHeight: "18px" }}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
