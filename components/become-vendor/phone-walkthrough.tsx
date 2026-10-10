"use client";

import { useEffect, useState } from "react";
import { Camera, CheckCheck, MapPin, Rocket, Store } from "lucide-react";
import { Reveal } from "./reveal";
import { useReducedMotion } from "./use-reduced-motion";

const STEP_MS = 4800;

const steps = [
  {
    icon: Store,
    title: "Set up your storefront",
    description:
      "Add your store name, category, location, and a few details. It only takes a few minutes.",
  },
  {
    icon: Camera,
    title: "List your products",
    description:
      "Upload clear photos, prices, and descriptions so shoppers know exactly what you're offering.",
  },
  {
    icon: Rocket,
    title: "Go live and start selling",
    description:
      "Your store becomes discoverable on Sellee, and orders can flow straight into WhatsApp.",
  },
];

function delay(ms: number) {
  return { animationDelay: `${ms}ms` };
}

function PhoneScreen({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <p className="bv-fade-up text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          Step 1 · Your store
        </p>
        <div className="bv-fade-up" style={delay(100)}>
          <p className="text-[10px] font-semibold text-slate-500">Store name</p>
          <div className="mt-1 rounded-lg border border-emerald-400 bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-2 ring-emerald-100">
            <span className="bv-type inline-block">Ola&apos;s Gadgets</span>
          </div>
        </div>
        <div className="bv-fade-up" style={delay(500)}>
          <p className="text-[10px] font-semibold text-slate-500">Category</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white">
              Gadgets
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              Fashion
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              Groceries
            </span>
          </div>
        </div>
        <div className="bv-fade-up" style={delay(800)}>
          <p className="text-[10px] font-semibold text-slate-500">Location</p>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Lagos
          </div>
        </div>
        <div
          className="bv-fade-up mt-auto rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-bold text-white"
          style={delay(1100)}
        >
          Create store
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <p className="bv-fade-up text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          Step 2 · Add a product
        </p>
        <div
          className="bv-fade-up flex aspect-[4/3] items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400"
          style={delay(100)}
        >
          <Camera className="h-7 w-7" />
        </div>
        <div className="bv-fade-up" style={delay(350)}>
          <p className="text-[10px] font-semibold text-slate-500">Product name</p>
          <div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
            Wireless earbuds
          </div>
        </div>
        <div className="bv-fade-up" style={delay(600)}>
          <p className="text-[10px] font-semibold text-slate-500">Price</p>
          <div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
            ₦12,500
          </div>
        </div>
        <div
          className="bv-fade-up mt-auto rounded-lg bg-emerald-600 py-2.5 text-center text-sm font-bold text-white"
          style={delay(900)}
        >
          Add product
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="bv-fade-up bg-emerald-700 px-4 py-3 text-white">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
          Your store is live
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px]">sellee.store/v/olasgadgets</p>
      </div>
      <div className="flex flex-1 flex-col justify-end gap-2 bg-[#efeae2] p-3">
        <div
          className="bv-msg-in max-w-[90%] self-start rounded-2xl rounded-tl-sm border-l-4 border-emerald-500 bg-white px-3 py-2 text-xs shadow-sm"
          style={delay(400)}
        >
          <p className="font-bold text-emerald-700">New order · #1043</p>
          <p className="mt-0.5 text-slate-800">1 × Wireless earbuds</p>
          <p className="font-semibold text-slate-900">₦12,500 · Yaba, Lagos</p>
        </div>
        <div
          className="bv-msg-in flex max-w-[85%] items-end gap-1.5 self-end rounded-2xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-xs text-slate-800 shadow-sm"
          style={delay(1500)}
        >
          <span>Confirmed. On its way today.</span>
          <CheckCheck className="h-3.5 w-3.5 shrink-0 text-sky-500" />
        </div>
      </div>
    </div>
  );
}

export function PhoneWalkthrough() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const playing = !reduced && !paused;

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % steps.length), STEP_MS);
    return () => clearTimeout(id);
  }, [active, playing]);

  return (
    <section className="mt-20 sm:mt-28">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
          Getting started
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Three steps between you and your first order.
        </h2>
      </Reveal>

      <div
        className="mt-10 grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-14"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div className="space-y-3">
          {steps.map(({ icon: Icon, title, description }, i) => {
            const isActive = i === active;
            return (
              <button
                key={title}
                type="button"
                onClick={() => setActive(i)}
                aria-current={isActive ? "step" : undefined}
                className={`relative block w-full overflow-hidden rounded-xl border p-4 text-left transition sm:p-5 ${
                  isActive
                    ? "border-emerald-300 bg-white shadow-md"
                    : "border-transparent bg-slate-50 opacity-70 hover:opacity-100"
                }`}
              >
                <div className="flex gap-4">
                  <div
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition ${
                      isActive ? "bg-emerald-500 text-slate-950" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                      Step {i + 1}
                    </span>
                    <h3 className="mt-0.5 text-base font-bold text-slate-950">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                </div>
                {isActive && !reduced ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-100">
                    <span
                      key={`${active}-${paused}`}
                      className={`block h-full bg-emerald-500 ${
                        paused ? "w-full opacity-40" : "bv-progress"
                      }`}
                    />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="relative mx-auto">
          <div className="absolute -inset-8 -z-10 rounded-full bg-emerald-100/60 blur-3xl" />
          <div className="relative h-[480px] w-[250px] rounded-[2.4rem] border-[7px] border-slate-900 bg-white shadow-2xl ring-1 ring-black/10">
            <div className="absolute left-1/2 top-0 z-10 h-4 w-20 -translate-x-1/2 rounded-b-xl bg-slate-900" />
            <div className="h-full overflow-hidden rounded-[1.8rem] bg-slate-50 pt-5">
              <PhoneScreen key={active} step={active} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
