/**
 * useHiveKeychain Hook
 * 
 * Provides integration with Hive Keychain browser extension.
 * Hive Keychain is used for secure transaction signing without exposing private keys.
 * 
 * @see https://hive-keychain.com/
 */

import { useState, useEffect, useCallback } from "react";

export interface KeychainResponse {
  success: boolean;
  error?: string;
  result?: unknown;
  data?: {
    type: string;
    username: string;
    message?: string;
    method?: string;
    key?: string;
  };
  message?: string;
  publicKey?: string;
}

export interface UseHiveKeychainReturn {
  /** Whether Hive Keychain extension is installed */
  isInstalled: boolean;
  /** Whether user is connected via Keychain */
  isConnected: boolean;
  /** Connected username */
  username: string | null;
  /** Loading state for operations */
  loading: boolean;
  /** Current error message */
  error: string | null;
  /** Request login via Keychain */
  login: () => Promise<boolean>;
  /** Disconnect from Keychain */
  logout: () => void;
  /** Sign a custom JSON operation */
  signCustomJson: (
    id: string,
    json: string,
    keyType: "Posting" | "Active"
  ) => Promise<KeychainResponse | null>;
  /** Transfer tokens via Keychain */
  transfer: (
    to: string,
    amount: string,
    currency: string,
    memo: string
  ) => Promise<KeychainResponse | null>;
  /** Clear error state */
  clearError: () => void;
}

// Type for window with Hive Keychain
declare global {
  interface Window {
    hive_keychain?: {
      requestHandshake: (callback: (response: KeychainResponse) => void) => void;
      requestSignBuffer: (
        username: string,
        message: string,
        keyType: string,
        callback: (response: KeychainResponse) => void
      ) => void;
      requestCustomJson: (
        username: string | null,
        id: string,
        keyType: string,
        json: string,
        displayName: string,
        callback: (response: KeychainResponse) => void
      ) => void;
      requestTransfer: (
        username: string,
        to: string,
        amount: string,
        memo: string,
        currency: string,
        callback: (response: KeychainResponse) => void
      ) => void;
      requestVerifyKey: (
        username: string,
        memo: string,
        keyType: string,
        callback: (response: KeychainResponse) => void
      ) => void;
    };
  }
}

/**
 * Hook for Hive Keychain browser extension integration.
 * Currently a placeholder - keychain operations are not wired yet.
 */
export function useHiveKeychain(): UseHiveKeychainReturn {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if Keychain is installed on mount
  useEffect(() => {
    const checkKeychain = () => {
      if (typeof window !== "undefined" && window.hive_keychain) {
        setIsInstalled(true);
      }
    };

    // Check immediately
    checkKeychain();

    // Also check after a delay (Keychain may inject later)
    const timeout = setTimeout(checkKeychain, 1000);

    return () => clearTimeout(timeout);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Request login via Hive Keychain.
   * TODO: Wire to actual Keychain requestSignBuffer
   */
  const login = useCallback(async (): Promise<boolean> => {
    if (!isInstalled) {
      setError("Hive Keychain is not installed. Please install it from hive-keychain.com");
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("[useHiveKeychain] Login requested");
      
      // Placeholder: Will use requestSignBuffer to verify ownership
      // For now, just simulate the login process
      
      await new Promise((resolve) => setTimeout(resolve, 500));

      // In production, this would be set from Keychain response
      // setUsername(response.data.username);
      // setIsConnected(true);
      
      return false; // Return false since not actually connected
    } catch (err) {
      console.error("[useHiveKeychain] Login error:", err);
      setError("Failed to connect to Hive Keychain");
      return false;
    } finally {
      setLoading(false);
    }
  }, [isInstalled]);

  /**
   * Disconnect from Keychain
   */
  const logout = useCallback(() => {
    setUsername(null);
    setIsConnected(false);
  }, []);

  /**
   * Sign a custom JSON operation via Keychain.
   * TODO: Wire to actual Keychain requestCustomJson
   */
  const signCustomJson = useCallback(
    async (
      id: string,
      json: string,
      keyType: "Posting" | "Active"
    ): Promise<KeychainResponse | null> => {
      if (!isInstalled) {
        setError("Hive Keychain is not installed");
        return null;
      }

      if (!username) {
        setError("Not connected to Keychain");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        console.log("[useHiveKeychain] Signing custom JSON:", { id, json, keyType });
        
        // Placeholder: Will use window.hive_keychain.requestCustomJson
        await new Promise((resolve) => setTimeout(resolve, 500));

        return { success: false, error: "Not implemented" };
      } catch (err) {
        console.error("[useHiveKeychain] Sign error:", err);
        setError("Failed to sign transaction");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isInstalled, username]
  );

  /**
   * Transfer tokens via Keychain.
   * TODO: Wire to actual Keychain requestTransfer
   */
  const transfer = useCallback(
    async (
      to: string,
      amount: string,
      currency: string,
      memo: string
    ): Promise<KeychainResponse | null> => {
      if (!isInstalled) {
        setError("Hive Keychain is not installed");
        return null;
      }

      if (!username) {
        setError("Not connected to Keychain");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        console.log("[useHiveKeychain] Transfer:", { to, amount, currency, memo });
        
        // Placeholder: Will use window.hive_keychain.requestTransfer
        await new Promise((resolve) => setTimeout(resolve, 500));

        return { success: false, error: "Not implemented" };
      } catch (err) {
        console.error("[useHiveKeychain] Transfer error:", err);
        setError("Failed to process transfer");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isInstalled, username]
  );

  return {
    isInstalled,
    isConnected,
    username,
    loading,
    error,
    login,
    logout,
    signCustomJson,
    transfer,
    clearError,
  };
}
