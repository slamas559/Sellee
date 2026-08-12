"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ChevronDown,
  LifeBuoy,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  type LucideIcon,
} from "lucide-react";
import { submitHelpCenterTicket } from "@/app/actions/emails";

const SUPPORT_EMAIL = "support@sellee.store";
const SUPPORT_PHONE_DISPLAY = "08100596007";
const SUPPORT_WHATSAPP = "2348100596007";

type HelpCategory = "All" | "Customers" | "Vendors" | "Orders" | "Account" | "WhatsApp";

type FaqItem = {
  id: string;
  category: Exclude<HelpCategory, "All">;
  question: string;
  answer: string;
};

const categories: HelpCategory[] = ["All", "Customers", "Vendors", "Orders", "Account", "WhatsApp"];

const faqs: FaqItem[] = [
  // ── Customers ──────────────────────────────────────────────────────────
  {
    id: "order-whatsapp",
    category: "Customers",
    question: "How do I order from a vendor?",
    answer:
      "Open a product or store page, review the details, then use the WhatsApp order action to continue with the vendor. The conversation happens directly with the seller so you can confirm availability, delivery, pickup, and payment details.",
  },
  {
    id: "nearby-vendors",
    category: "Customers",
    question: "How do nearby vendor results work?",
    answer:
      "Sellee uses store location details and, when allowed, your selected location to help surface vendors close to you. You can still browse the full marketplace if you do not want to use location-based discovery.",
  },
  {
    id: "verified-seller-meaning",
    category: "Customers",
    question: "What does the \"Verified\" badge on a store mean?",
    answer:
      "A verified badge means the vendor confirmed ownership of their store's WhatsApp number through a one-time code sent by the Sellee bot. Not being verified doesn't automatically mean a store is untrustworthy — many genuine vendors just haven't completed the optional step yet — but a verified badge is a stronger signal that messages to that number reach a real, confirmed business.",
  },
  {
    id: "know-seller-legit",
    category: "Customers",
    question: "How do I know a seller is legitimate before ordering?",
    answer:
      "Check for the Verified badge, read the store's rating and reviews, and look at its completed orders count where shown. Ask the vendor questions directly on WhatsApp before paying, and be cautious of any seller who pressures you to pay immediately without answering questions.",
  },
  {
    id: "save-follow-vendors",
    category: "Customers",
    question: "Can I save products or follow a vendor?",
    answer:
      "Yes. Use the save/wishlist action on a product to find it again later from your account, and use the follow action on a store page to keep up with a vendor you like. Both are available from your account menu once you're signed in.",
  },
  {
    id: "leave-review",
    category: "Customers",
    question: "Can I leave a review after ordering?",
    answer:
      "Yes, you can rate and review both the product and the store after an order. Honest reviews help other shoppers and help good vendors build a track record on Sellee.",
  },
  {
    id: "cancel-order",
    category: "Customers",
    question: "How do I cancel an order?",
    answer:
      "Sellee doesn't have an in-app cancel button today — since the order conversation and payment happen directly with the vendor on WhatsApp, message the vendor as soon as possible to cancel or change your order. Most vendors will confirm and adjust the order status on their end.",
  },
  {
    id: "seller-not-responding",
    category: "Customers",
    question: "What happens if a seller doesn't respond?",
    answer:
      "Give the vendor a reasonable amount of time to reply, especially outside business hours. If a seller stays unresponsive for an extended period, contact Sellee Support with the store name, product, and a screenshot of your WhatsApp conversation so the team can look into it.",
  },
  {
    id: "report-seller",
    category: "Customers",
    question: "How do I report a seller or a suspicious listing?",
    answer:
      "Sellee doesn't have a built-in \"report\" button yet. In the meantime, contact Sellee Support (email or WhatsApp, both linked below) with the store name, product link, and details of the issue, and the team will review it.",
  },
  {
    id: "refunds",
    category: "Customers",
    question: "How do refunds work?",
    answer:
      "Sellee doesn't process payments or hold funds, so refunds are arranged directly between you and the vendor, the same way payment was. If a vendor won't resolve a genuine issue, contact Sellee Support with your order details and the team can step in.",
  },
  // ── Vendors ────────────────────────────────────────────────────────────
  {
    id: "store-setup",
    category: "Vendors",
    question: "How do I set up my store?",
    answer:
      "Create an account, then choose \"Become a Vendor\" to open your store setup. Add your store name, WhatsApp number, location, logo, and your first products so buyers can discover you in the marketplace.",
  },
  {
    id: "product-uploads",
    category: "Vendors",
    question: "What should I include in product listings?",
    answer:
      "Use clear product names, accurate pricing, helpful descriptions, category information, current stock, and good photos. Where relevant, add the brand, condition, and any key specs (like RAM, size, or color) in the product form — structured details like these reduce repeated questions and help customers decide faster.",
  },
  {
    id: "receive-orders",
    category: "Vendors",
    question: "How do I receive and manage orders?",
    answer:
      "When a customer messages you through a Sellee product or store link, the order also appears in your dashboard. Keep its status updated (confirmed, delivered, etc.) as you fulfil it — this keeps your records straight and feeds your store's completed-orders count that shoppers can see.",
  },
  {
    id: "verify-whatsapp-number",
    category: "Vendors",
    question: "Do I have to verify my store's WhatsApp number?",
    answer:
      "No — adding a WhatsApp number is required to run a store, but verifying it is optional. If you skip verification, your store still works and can take orders, but it won't show the Verified badge to shoppers. You can verify anytime from Store settings, and if you later change your WhatsApp number, you'll need to verify the new one.",
  },
  {
    id: "promote-store",
    category: "Vendors",
    question: "How do I promote my store?",
    answer:
      "Share your store or product links directly — every store and product page has a share action for WhatsApp, social apps, or copying the link. Sellee doesn't have paid promotion or featured placement yet; the best lever right now is a complete, verified storefront with good photos and real reviews.",
  },
  {
    id: "one-store-per-account",
    category: "Vendors",
    question: "Can I run more than one store from one account?",
    answer:
      "Each vendor account currently manages one store. If you sell in genuinely different categories, you can still organize your catalogue with categories and niches within that single store.",
  },
  // ── Orders ─────────────────────────────────────────────────────────────
  {
    id: "order-status",
    category: "Orders",
    question: "Where can I track an order issue?",
    answer:
      "If you are a customer, contact the vendor first through the WhatsApp conversation attached to the order. If something still feels unresolved, contact Sellee Support with the store name, product, date, and screenshots where available.",
  },
  {
    id: "vendor-orders",
    category: "Orders",
    question: "How should vendors handle order updates?",
    answer:
      "Keep order status current in your dashboard and reply quickly on WhatsApp. Clear updates on availability, pickup, delivery, or delays make customers more likely to trust and return to your store.",
  },
  // ── Account ────────────────────────────────────────────────────────────
  {
    id: "login-phone",
    category: "Account",
    question: "Do I need to verify my phone number as a customer?",
    answer:
      "No. Adding a phone number at signup is optional and never blocks browsing, ordering, or checking out. Verification only ever applies to vendors, and only for the store's WhatsApp number, since that's the number customers actually message.",
  },
  {
    id: "delete-account",
    category: "Account",
    question: "How do I request account or data deletion?",
    answer:
      "Send a data deletion request to support@sellee.store from your account email. Include your registered phone number so the team can verify the request before processing it.",
  },
  // ── WhatsApp ───────────────────────────────────────────────────────────
  {
    id: "whatsapp-how-it-works",
    category: "WhatsApp",
    question: "Why does Sellee use WhatsApp instead of in-app checkout?",
    answer:
      "Most vendors on Sellee already sell through WhatsApp, so Sellee focuses on helping shoppers discover and compare sellers, then hands the actual conversation, payment, and delivery details to the existing WhatsApp relationship between you and the vendor.",
  },
  {
    id: "whatsapp-bot-verify",
    category: "WhatsApp",
    question: "What is the Sellee WhatsApp bot and the VERIFY command?",
    answer:
      "The Sellee bot is a WhatsApp number vendors message to complete actions like number verification. When you start verifying a store's WhatsApp number, Sellee gives you a one-time code — sending \"VERIFY <code>\" to the bot number from that WhatsApp number confirms you control it.",
  },
  {
    id: "whatsapp-number-privacy",
    category: "WhatsApp",
    question: "Is my WhatsApp number shown publicly?",
    answer:
      "A vendor's store WhatsApp number is shown publicly, since that's how customers message the store — vendors should use a number they're comfortable sharing. Customer phone numbers are not shown publicly; they're only visible to the vendor on the orders customers place with that store.",
  },
];

const quickLinks: Array<{
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    title: "Shop the marketplace",
    description: "Search products, compare vendors, and start WhatsApp orders.",
    href: "/marketplace",
    icon: ShoppingBag,
  },
  {
    title: "Vendor directory",
    description: "Find active stores and open their public storefronts.",
    href: "/vendors",
    icon: Store,
  },
  {
    title: "How Sellee works",
    description: "Understand the vendor and customer flow in a few minutes.",
    href: "/how-it-works",
    icon: PackageCheck,
  },
  {
    title: "Legal and privacy",
    description: "Review privacy, terms, and data deletion information.",
    href: "/privacy",
    icon: ShieldCheck,
  },
];

function buildWhatsApp(category: string, details: string) {
  const message = [
    "Hello Sellee Support, I need help.",
    `Issue type: ${category}`,
    `Details: ${details || "I will share the details here."}`,
  ].join("\n");

  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function getErrorMessage(error: unknown) {
  if (!error) return "Could not send your support request. Please try again.";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  return "Could not send your support request. Please try again.";
}

export function HelpCenterClient() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<HelpCategory>("All");
  const [openId, setOpenId] = useState(faqs[0]?.id ?? "");
  const [issueType, setIssueType] = useState("Order issue");
  const [issueDetails, setIssueDetails] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [hasEditedRequesterName, setHasEditedRequesterName] = useState(false);
  const [hasEditedRequesterEmail, setHasEditedRequesterEmail] = useState(false);
  const [ticketNotice, setTicketNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredFaqs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === "All" || faq.category === activeCategory;
      const matchesQuery = normalizedQuery
        ? `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase().includes(normalizedQuery)
        : true;

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  const whatsappHref = buildWhatsApp(issueType, issueDetails);
  const requesterNameValue = hasEditedRequesterName
    ? requesterName
    : requesterName || session?.user?.name || "";
  const requesterEmailValue = hasEditedRequesterEmail
    ? requesterEmail
    : requesterEmail || session?.user?.email || "";

  function handleTicketSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTicketNotice(null);

    startTransition(async () => {
      const result = await submitHelpCenterTicket({
        requesterName: requesterNameValue,
        requesterEmail: requesterEmailValue,
        issueType,
        details: issueDetails,
      });

      if (!result.success) {
        setTicketNotice({
          tone: "error",
          message: getErrorMessage(result.error),
        });
        return;
      }

      setTicketNotice({
        tone: "success",
        message: `Request sent. Your ticket ID is ${result.data?.ticketId ?? "being prepared"}.`,
      });
      setIssueDetails("");
    });
  }

  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="p-5 sm:p-8 lg:p-10">
            <p className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Help center
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Get help with shopping, selling, orders, and account issues.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              Search common answers, jump into support channels, or prepare a
              clear issue report for the Sellee team.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <a
                href={`tel:${SUPPORT_PHONE_DISPLAY}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <Phone className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-slate-900">Call support</p>
                <p className="mt-1 text-xs text-slate-600">{SUPPORT_PHONE_DISPLAY}</p>
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <MessageCircle className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-slate-900">WhatsApp us</p>
                <p className="mt-1 text-xs text-slate-600">{SUPPORT_PHONE_DISPLAY}</p>
              </a>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50"
              >
                <Mail className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-slate-900">Email support</p>
                <p className="mt-1 break-all text-xs text-slate-600">{SUPPORT_EMAIL}</p>
              </a>
            </div>
          </div>

          <div className="bg-slate-950 p-5 text-white sm:p-8 lg:p-10">
            <form
              onSubmit={handleTicketSubmit}
              className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-sm backdrop-blur"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
                  <LifeBuoy className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Issue report helper</p>
                  <p className="mt-1 text-xs text-slate-300">Build a cleaner support message.</p>
                </div>
              </div>

              <label className="mt-5 block text-sm font-semibold text-white" htmlFor="requester-name">
                Name
              </label>
              <input
                id="requester-name"
                value={requesterNameValue}
                onChange={(event) => {
                  setHasEditedRequesterName(true);
                  setRequesterName(event.target.value);
                }}
                placeholder="Your name"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-3 py-3 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:ring-2"
              />

              <label className="mt-4 block text-sm font-semibold text-white" htmlFor="requester-email">
                Email address
              </label>
              <input
                id="requester-email"
                type="email"
                required
                value={requesterEmailValue}
                onChange={(event) => {
                  setHasEditedRequesterEmail(true);
                  setRequesterEmail(event.target.value);
                }}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-3 py-3 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:ring-2"
              />

              <label className="mt-5 block text-sm font-semibold text-white" htmlFor="issue-type">
                Issue type
              </label>
              <select
                id="issue-type"
                value={issueType}
                onChange={(event) => setIssueType(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white px-3 py-3 text-sm text-slate-900 outline-none ring-emerald-300 transition focus:ring-2"
              >
                <option>Order issue</option>
                <option>Vendor/store setup</option>
                <option>Payment or delivery complaint</option>
                <option>Account access</option>
                <option>Data deletion request</option>
                <option>Other support request</option>
              </select>

              <label className="mt-4 block text-sm font-semibold text-white" htmlFor="issue-details">
                Details
              </label>
              <textarea
                id="issue-details"
                value={issueDetails}
                onChange={(event) => setIssueDetails(event.target.value)}
                required
                rows={5}
                placeholder="Add your account email, store/product name, order details, and what went wrong."
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white px-3 py-3 text-sm text-slate-900 outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:ring-2"
              />

              {ticketNotice ? (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                    ticketNotice.tone === "success"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  {ticketNotice.message}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPending ? "Sending request..." : "Send support request"}
                </button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  WhatsApp instead
                </a>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-300">
                This form sends an email to {SUPPORT_EMAIL}. WhatsApp remains available for urgent
                follow-up.
              </p>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <Icon className="h-6 w-6 text-emerald-700" aria-hidden="true" />
              <h2 className="mt-4 text-base font-bold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </Link>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Common questions
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Search the support library.
            </h2>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search orders, vendors, WhatsApp, account..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none ring-emerald-300 transition placeholder:text-slate-400 focus:bg-white focus:ring-2"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeCategory === category
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <article key={faq.id} className="rounded-2xl border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? "" : faq.id)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                  >
                    <span>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        {faq.category}
                      </span>
                      <span className="mt-1 block text-sm font-bold text-slate-900 sm:text-base">
                        {faq.question}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen ? (
                    <p className="border-t border-slate-200 px-4 py-4 text-sm leading-7 text-slate-600">
                      {faq.answer}
                    </p>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              No answers matched your search. Send the issue through WhatsApp or email and the
              support team will help.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
