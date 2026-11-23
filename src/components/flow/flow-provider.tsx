"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type FlowCustomer = {
  name: string;
  mobile: string;
  email: string;
};

type FlowState = {
  customer: FlowCustomer | null;
  acceptedTerms: boolean;
  reference: string | null;
};

type FlowContextValue = FlowState & {
  hydrated: boolean;
  saveCustomer: (customer: FlowCustomer, acceptedTerms: boolean) => void;
  setReference: (reference: string) => void;
  resetFlow: () => void;
};

const STORAGE_KEY = "spectra-gardens-flow-v1";

const EMPTY_STATE: FlowState = {
  customer: null,
  acceptedTerms: false,
  reference: null,
};

function readStoredState(): FlowState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_STATE;
    const candidate = parsed as Partial<FlowState>;
    const customer =
      candidate.customer &&
      typeof candidate.customer.name === "string" &&
      typeof candidate.customer.mobile === "string" &&
      typeof candidate.customer.email === "string"
        ? candidate.customer
        : null;
    return {
      customer,
      acceptedTerms: candidate.acceptedTerms === true,
      reference: typeof candidate.reference === "string" ? candidate.reference : null,
    };
  } catch {
    return EMPTY_STATE;
  }
}

/**
 * A tiny session-backed store keeps customer details across the route changes.
 * `useSyncExternalStore` renders the empty server snapshot first, then switches
 * to the stored browser snapshot after hydration, so no effect is needed.
 */
let state: FlowState = EMPTY_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function getSnapshot(): FlowState {
  if (!loaded && typeof window !== "undefined") {
    state = readStoredState();
    loaded = true;
  }
  return state;
}

function getServerSnapshot(): FlowState {
  return EMPTY_STATE;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function write(next: FlowState) {
  state = next;
  loaded = true;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Session storage can be unavailable in private browsing; the in-memory
    // state still keeps the prototype usable for the current page visit.
  }
  listeners.forEach((listener) => listener());
}

function saveCustomer(customer: FlowCustomer, acceptedTerms: boolean) {
  write({ ...getSnapshot(), customer, acceptedTerms });
}

function setReference(reference: string) {
  write({ ...getSnapshot(), reference });
}

function resetFlow() {
  write(EMPTY_STATE);
}

const subscribeToHydration = () => () => {};
const getHydrated = () => true;
const getServerHydrated = () => false;

const FlowContext = createContext<FlowContextValue | null>(null);

export function FlowProvider({ children }: { children: ReactNode }) {
  const flow = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(subscribeToHydration, getHydrated, getServerHydrated);

  const value = useMemo(
    () => ({
      ...flow,
      hydrated,
      saveCustomer,
      setReference,
      resetFlow,
    }),
    [flow, hydrated],
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowContextValue {
  const context = useContext(FlowContext);
  if (!context) throw new Error("useFlow must be used inside FlowProvider");
  return context;
}

export function makeReference(): string {
  return `SG-MP-${Math.floor(100000 + Math.random() * 900000)}`;
}
