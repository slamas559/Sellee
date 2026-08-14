import {
  Button,
  Heading,
  Hr,
  Img,
  Link,
  Section,
  Text,
} from "@react-email/components";
import { EmailShell } from "./components/EmailShell";

export interface UpdateEmailBlock {
  heading?: string;
  body: string;
}

export interface UpdateEmailProps {
  headline: string;
  previewText?: string;
  intro?: string;
  heroImageUrl?: string;
  heroAlt?: string;
  blocks?: UpdateEmailBlock[];
  actionLabel?: string;
  actionUrl?: string;
  footerNote?: string;
}

export default function UpdateEmail({
  headline,
  previewText = "A new update from Sellee.",
  intro = "Here is what is new across the Sellee marketplace.",
  heroImageUrl,
  heroAlt = "Sellee platform update",
  blocks = [],
  actionLabel = "Learn more",
  actionUrl = "https://sellee.store",
  footerNote = "You are receiving this because you use Sellee.",
}: UpdateEmailProps) {
  return (
    <EmailShell previewText={previewText} width={440} radius={18}>
      <Section className="px-6 py-7">
        <Text className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Sellee update
        </Text>
        <Heading className="mb-0 mt-3 text-[25px] font-black leading-[1.15] text-slate-950">
          {headline}
        </Heading>
        <Text className="mb-0 mt-4 text-[13px] leading-7 text-slate-600">
          {intro}
        </Text>
      </Section>

      {heroImageUrl ? (
        <Section className="px-6">
          <Img
            src={heroImageUrl}
            alt={heroAlt}
            className="h-auto w-full rounded-[16px] object-cover"
          />
        </Section>
      ) : (
        <Section className="px-6">
          <Section className="rounded-[19px] bg-gradient-to-br from-emerald-600 to-sky-600 px-6 py-9">
            <Text className="m-0 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
              Feature news
            </Text>
            <Text className="mb-0 mt-3 text-[22px] font-black leading-[1.2]">
              Marketplace improvements, vendor tools, and customer
              experience updates.
            </Text>
          </Section>
        </Section>
      )}

      <Section className="px-6 py-7">
        {blocks.length > 0 ? (
          blocks.map((block, index) => (
            <Section key={`${block.heading ?? "update"}-${index}`} className="pb-5">
              {block.heading ? (
                <Heading className="m-0 text-[19px] font-bold text-slate-950">
                  {block.heading}
                </Heading>
              ) : null}
              <Text className="mb-0 mt-2 text-[13px] leading-7 text-slate-700">
                {block.body}
              </Text>
            </Section>
          ))
        ) : (
          <Section className="rounded-[15px] bg-slate-50 px-5 py-4">
            <Text className="m-0 text-[11px] leading-7 text-slate-700">
              Use this template for feature announcements, policy
              revisions, community news, product education, or marketplace
              operations notices.
            </Text>
          </Section>
        )}

        <Section className="pt-2">
          <Button
            href={actionUrl}
            className="rounded-full bg-emerald-600 px-6 py-3 text-[12px] font-bold text-white"
          >
            {actionLabel}
          </Button>
        </Section>

        <Hr className="my-6 border-slate-200" />
        <Text className="m-0 text-[10px] leading-5 text-slate-500">
          {footerNote} Need help?{" "}
          <Link href="mailto:support@sellee.store" className="text-emerald-700">
            Contact Sellee Support
          </Link>
          .
        </Text>
      </Section>
    </EmailShell>
  );
}