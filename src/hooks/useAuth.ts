import { useState, useEffect, useCallback } from "react";
import type { AuthState } from "../lib/auth";
import { AUTH_STORAGE_KEY } from "../lib/auth";
import { captureError } from "../lib/sentry";

const DEFAULT_STATE: AuthState = { isAuthenticated: false, user: null, loading: true };

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(DEFAULT_STATE);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthState = useCallback(() => {
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, (response) => {
      if (chrome.runtime.lastError) {
        setAuthState({ isAuthenticated: false, user: null, loading: false });
        return;
      }
      setAuthState({
        isAuthenticated: response?.isAuthenticated ?? false,
        user: response?.user ?? null,
        loading: false,
      });
    });
  }, []);

  useEffect(() => {
    fetchAuthState();

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "session" && AUTH_STORAGE_KEY in changes) {
        fetchAuthState();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [fetchAuthState]);

  function signIn() {
    setError(null);
    setAuthState((prev) => ({ ...prev, loading: true }));
    chrome.runtime.sendMessage({ type: "SIGN_IN_GOOGLE" }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        const errorMsg = response?.error ?? chrome.runtime.lastError?.message ?? "Sign-in failed";
        captureError(new Error(`Sign-in failed: ${errorMsg}`));
        setError(errorMsg);
        setAuthState((prev) => ({ ...prev, loading: false }));
        return;
      }
      setAuthState({
        isAuthenticated: true,
        user: response.user,
        loading: false,
      });
    });
  }

  function signOut() {
    try {
      setAuthState((prev) => ({ ...prev, loading: true }));
      chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
        if (chrome.runtime.lastError) {
          captureError(new Error(`Sign-out failed: ${chrome.runtime.lastError.message}`));
        }
        setAuthState({ isAuthenticated: false, user: null, loading: false });
      });
    } catch (err) {
      captureError(err);
      setAuthState({ isAuthenticated: false, user: null, loading: false });
    }
  }

  return { ...authState, error, signIn, signOut };
}
