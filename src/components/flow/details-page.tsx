"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AssetSitePlan } from "@/components/inventory/asset-site-plan";

import {
  ArrowRightIcon,
  CheckoutScenery,
  ChevronDownIcon,
  MailIcon,
  PersonIcon,
  SelectionWave,
} from "./checkout-art";
import { FlowPageHead } from "./flow-chrome";
import { FLOW_STEPS, flowCrumbs, formatSqFt, type Plot } from "./flow-data";
import { useFlow } from "./flow-provider";
import { FlowShell } from "./flow-shell";

type FieldErrors = { name?: string; mobile?: string; email?: string };

type Draft = {
  name: string;
  mobile: string;
  email: string;
  accepted: boolean;
};

function validateField(field: "name" | "mobile" | "email", value: string): string | undefined {
  if (field === "name" && value.trim().length < 2) return "Enter your full name.";
  if (field === "mobile" && !/^\d{10}$/.test(value)) {
    return "Enter a valid 10-digit mobile number.";
  }
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return "Enter a valid email address.";
  }
  return undefined;
}

export function DetailsPage({ plot }: { plot: Plot }) {
  const router = useRouter();
  const { hydrated, customer, acceptedTerms, saveCustomer } = useFlow();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");

  const values: Draft = draft ?? {
    name: hydrated ? (customer?.name ?? "") : "",
    mobile: hydrated ? (customer?.mobile ?? "") : "",
    email: hydrated ? (customer?.email ?? "") : "",
    accepted: hydrated ? acceptedTerms : false,
  };

  const update = (patch: Partial<Draft>) => {
    setDraft({ ...values, ...patch });
  };

  const updateField = (field: "name" | "mobile" | "email", value: string) => {
    const nextValue = field === "mobile" ? value.replace(/\D/g, "").slice(0, 10) : value;
    update({ [field]: nextValue });
    setFieldErrors((current) => ({
      ...current,
      [field]: validateField(field, nextValue),
    }));
    setFormError("");
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: FieldErrors = {};
    const nameError = validateField("name", values.name);
    const mobileError = validateField("mobile", values.mobile);
    const emailError = validateField("email", values.email);
    if (nameError) errors.name = nameError;
    if (mobileError) errors.mobile = mobileError;
    if (emailError) errors.email = emailError;
    const messages: string[] = [];

    if (nameError) messages.push(nameError);
    if (mobileError) messages.push(mobileError);
    if (emailError) messages.push(emailError);
    if (!values.accepted) messages.push("Accept the booking terms to continue.");

    setFieldErrors(errors);
    if (messages.length) {
      setFormError(messages.join(" "));
      return;
    }

    setFormError("");
    saveCustomer(
      { name: values.name.trim(), mobile: values.mobile, email: values.email.trim() },
      true,
    );
    router.push(`/plots/${plot.id}/review`);
  };

  return (
    <FlowShell step={FLOW_STEPS.details} crumbs={flowCrumbs("details", plot.id)} variant="checkout">
      <CheckoutScenery />
      <FlowPageHead
        backHref={`/plots/${plot.id}/summary`}
        backLabel="Back to summary"
        title="Customer details"
      />

      <div className="checkout-grid details-checkout-grid">
        <form className="checkout-form" noValidate onSubmit={submit}>
          <div className="checkout-field">
            <label htmlFor="details-name">Full name</label>
            <div className="checkout-input">
              <PersonIcon />
              <input
                id="details-name"
                className="checkout-control"
                type="text"
                autoComplete="name"
                placeholder="Enter your name"
                value={values.name}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "details-name-error" : undefined}
                aria-label="Full name"
                onChange={(event) => updateField("name", event.target.value)}
              />
            </div>
            {fieldErrors.name ? (
              <em id="details-name-error" className="field-error">
                {fieldErrors.name}
              </em>
            ) : null}
          </div>

          <div className="checkout-field">
            <label htmlFor="details-mobile">Mobile number</label>
            <div className="checkout-phone">
              <span className="checkout-country">
                +91
                <ChevronDownIcon />
              </span>
              <input
                id="details-mobile"
                className="checkout-control"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                placeholder="Enter mobile number"
                value={values.mobile}
                aria-invalid={Boolean(fieldErrors.mobile)}
                aria-describedby={fieldErrors.mobile ? "details-mobile-error" : undefined}
                aria-label="Mobile number"
                onChange={(event) => updateField("mobile", event.target.value)}
              />
            </div>
            {fieldErrors.mobile ? (
              <em id="details-mobile-error" className="field-error">
                {fieldErrors.mobile}
              </em>
            ) : null}
          </div>

          <div className="checkout-field">
            <label htmlFor="details-email">Email address</label>
            <div className="checkout-input">
              <MailIcon />
              <input
                id="details-email"
                className="checkout-control"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={values.email}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "details-email-error" : undefined}
                aria-label="Email address"
                onChange={(event) => updateField("email", event.target.value)}
              />
            </div>
            {fieldErrors.email ? (
              <em id="details-email-error" className="field-error">
                {fieldErrors.email}
              </em>
            ) : null}
          </div>

          <label className="checkout-terms">
            <input
              type="checkbox"
              checked={values.accepted}
              onChange={(event) => update({ accepted: event.target.checked })}
            />
            <span>
              I accept the{" "}
              <Link className="inline-text-link" href={`/plots/${plot.id}/summary`}>
                booking terms and conditions
              </Link>
              .
            </span>
          </label>

          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <button className="sg-cta checkout-submit" type="submit">
            Review payment
            <ArrowRightIcon />
          </button>
        </form>

        <aside className="selection-card" aria-label="Your selection">
          <span className="checkout-eyebrow">YOUR SELECTION</span>
          <div className="selection-head">
            <div>
              <h2>Plot {plot.id}</h2>
              <p>
                {plot.area} <span aria-hidden="true">•</span> {formatSqFt(plot.areaSqFt)}
              </p>
            </div>
            <AssetSitePlan
              readOnly
              selectedOnly
              selectedPlotId={plot.id}
              label={`Plot ${plot.id} from the Moolaparambu site plan`}
              onSelect={() => {}}
              onPreview={() => {}}
              onPlots={() => {}}
            />
          </div>
          <div className="selection-rows">
            <div className="selection-row">
              <span>Property price</span>
              <b>Price on request</b>
            </div>
            <div className="selection-row">
              <span>Pay now</span>
              <b>To be confirmed</b>
            </div>
            <div className="selection-row">
              <span>Availability</span>
              <b>
                <span className="status available">On request</span>
              </b>
            </div>
          </div>
          <SelectionWave />
        </aside>
      </div>
    </FlowShell>
  );
}
