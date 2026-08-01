import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export interface PasswordResetEmailProps {
  name?: string | null;
  resetUrl: string;
}

export default function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  const firstName = name?.trim()?.split(/\s+/)[0] ?? "there";

  return (
    <Html>
      <Head />
      <Preview>Reset your Sellee password</Preview>
      <Tailwind>
        <Body className="m-0 bg-slate-100 px-3 py-8 font-sans text-slate-700">
          <Container className="mx-auto w-full max-w-[400px] overflow-hidden rounded-[20px] bg-white shadow-sm">
            <Section className="bg-emerald-600 px-6 py-8 text-white">
              <Img src="https://sellee.store/icon2.png" alt="Sellee" className="mb-4 h-8 w-auto" />
              <Text className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">
                Hi, {firstName}
              </Text>
              <Heading className="mb-0 mt-3 text-[25px] font-black leading-[1.15] text-white">
                Reset your password
              </Heading>
            </Section>

            <Section className="px-6 py-7">
              <Text className="m-0 text-[12px] leading-7 text-slate-700">
                We received a request to reset the password for your Sellee account. Click the
                button below to choose a new one.
              </Text>

              <Section className="py-7 text-center">
                <Button href={resetUrl} className="rounded-full bg-emerald-600 px-6 py-3 text-[12px] font-bold text-white">
                  Reset Password
                </Button>
              </Section>

              <Section className="rounded-[14px] bg-amber-50 px-5 py-4">
                <Text className="m-0 text-[11px] font-bold text-amber-900">This link expires in 1 hour</Text>
                <Text className="mb-0 mt-2 text-[11px] leading-6 text-amber-900">
                  If you didn&apos;t request this, you can safely ignore this email - your password
                  won&apos;t be changed.
                </Text>
              </Section>

              <Hr className="my-6 border-slate-200" />
              <Text className="m-0 text-[10px] leading-5 text-slate-500">
                If the button doesn&apos;t work, copy and paste this link into your browser:
                <br />
                {resetUrl}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}