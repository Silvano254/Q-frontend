/**
 * Utility functions for native WebAuthn (biometric / hardware key) registration and login.
 */

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials;
}

/**
 * Registers a new biometric credential using native WebAuthn API.
 */
export async function registerBiometric(userEmail: string): Promise<string> {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn / Biometric authentication is not supported by this browser or device, or requires HTTPS.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: { name: "Binti Events Corporate", id: window.location.hostname },
    user: {
      id: userId,
      name: userEmail,
      displayName: userEmail.split("@")[0]
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "preferred" },
    timeout: 60000
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions
  });

  if (!credential) {
    throw new Error("Biometric registration was cancelled or failed.");
  }

  return (credential as any).id || "bio_passkey_" + Date.now();
}

/**
 * Authenicates a user using native WebAuthn API.
 */
export async function loginBiometric(): Promise<string> {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn / Biometric authentication is not supported by this browser or device, or requires HTTPS.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge,
      timeout: 60000,
      userVerification: "preferred"
    }
  });

  if (!credential) {
    throw new Error("Biometric authentication was cancelled or failed.");
  }

  return (credential as any).id;
}
