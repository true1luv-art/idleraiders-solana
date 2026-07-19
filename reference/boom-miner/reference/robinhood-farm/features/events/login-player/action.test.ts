import { describe, it, expect, vi, beforeEach } from "vitest";
import { execute } from "./action";

vi.mock("@/lib/config/database", () => ({
  connectDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/modules/players/repository.server", () => ({
  findPlayerByWallet: vi.fn(),
}));

vi.mock("@/lib/auth/jwt", () => ({
  signToken: vi.fn().mockResolvedValue("mock-jwt-token"),
}));

// viem signature verification — default to valid
vi.mock("viem", () => ({
  verifyMessage: vi.fn().mockResolvedValue(true),
}));

import { findPlayerByWallet } from "@/lib/modules/players/repository.server";

const MOCK_WALLET = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12";
const MOCK_PLAYER = { wallet: MOCK_WALLET.toLowerCase(), coins: 0 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("login-player", () => {
  it("returns ok with token when player is found", async () => {
    vi.mocked(findPlayerByWallet).mockResolvedValue(MOCK_PLAYER as never);

    const result = await execute({ wallet: MOCK_WALLET });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.token).toBe("mock-jwt-token");
      expect(result.player).toEqual(MOCK_PLAYER);
    }
  });

  it("returns not-registered when player does not exist", async () => {
    vi.mocked(findPlayerByWallet).mockResolvedValue(null);

    const result = await execute({ wallet: MOCK_WALLET });

    expect(result.status).toBe("not-registered");
  });

  it("returns invalid-wallet for a too-short address", async () => {
    const result = await execute({ wallet: "0xshort" });
    expect(result.status).toBe("invalid-wallet");
  });

  it("returns invalid-wallet for an empty wallet", async () => {
    const result = await execute({ wallet: "" });
    expect(result.status).toBe("invalid-wallet");
  });

  it("returns invalid-signature when viem rejects the signature", async () => {
    const { verifyMessage } = await import("viem");
    vi.mocked(verifyMessage).mockResolvedValueOnce(false);

    const result = await execute({
      wallet:    MOCK_WALLET,
      signature: "0xbadsig",
      message:   "Sign in to Robinhood Farm",
    });

    expect(result.status).toBe("invalid-signature");
  });

  it("normalises wallet to lowercase before lookup", async () => {
    vi.mocked(findPlayerByWallet).mockResolvedValue(MOCK_PLAYER as never);

    await execute({ wallet: MOCK_WALLET });

    expect(findPlayerByWallet).toHaveBeenCalledWith(MOCK_WALLET.toLowerCase());
  });
});
