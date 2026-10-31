/**
 * BridgeKey/Bridge Wallet integration boundary.
 * The official provider/SDK contract must be confirmed before implementing this adapter.
 * Intentionally does not fall back to window.ethereum or another wallet.
 */
export type WalletSession = { address: `0x${string}`; chainId: number };

export interface WalletAdapter {
  connect(): Promise<WalletSession>;
  getSession(): Promise<WalletSession | null>;
  disconnect(): Promise<void>;
}

export class BridgeWalletNotConfiguredError extends Error {
  constructor() {
    super("Bridge Wallet SDK/provider is not configured. Configure the verified BridgeKey integration before enabling wallet actions.");
    this.name = "BridgeWalletNotConfiguredError";
  }
}

export const bridgeWallet: WalletAdapter = {
  async connect() { throw new BridgeWalletNotConfiguredError(); },
  async getSession() { return null; },
  async disconnect() { return; }
};
