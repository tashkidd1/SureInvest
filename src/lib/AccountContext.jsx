import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
const AccountContext = createContext(null);
// Two account spaces: 'demo' (virtual simulation) and 'real' (live account
// view — trading and goals are not enabled there yet). The active choice is
// stored per user so it survives reloads, and every data hook scopes its
// records to it so the two spaces never mix.
export function AccountProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.id || null;
  const [accountType, setAccountType] = useState("demo");
  useEffect(() => {
    if (!uid) return;
    try {
      const saved = localStorage.getItem(`investbw_account_${uid}`);
      setAccountType(saved === "real" ? "real" : "demo");
    } catch (_) {
      /* keep the default demo account */
    }
  }, [uid]);
  const changeAccount = (type) => {
    const next = type === "real" ? "real" : "demo";
    setAccountType(next);
    if (uid) {
      try {
        localStorage.setItem(`investbw_account_${uid}`, next);
      } catch (_) {
        /* preference is best-effort */
      }
    }
  };
  return (
    <AccountContext.Provider
      value={{ accountType, isDemo: accountType === "demo", setAccountType: changeAccount }}
    >
      {children}
    </AccountContext.Provider>
  );
}
export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return ctx;
}
