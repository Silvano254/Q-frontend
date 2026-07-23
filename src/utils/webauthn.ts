/**
 * Utility functions for native WebAuthn (biometric / hardware key) registration and login.
 */

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential && !!navigator.credentials;
}

function parseWebAuthnError(err: any): Error {
  const errMsg = err.message || "";
  const errName = err.name || "";
  
  if (
    errName === "NotAllowedError" || 
    errMsg.includes("not allowed") || 
    errMsg.includes("timed out") || 
    errMsg.includes("cancelled") || 
    errMsg.includes("abort")
  ) {
    return new Error("Fingerprint verification cancelled, timed out, or not allowed.");
  }
  if (errName === "SecurityError" || errName === "NotSupportedError") {
    return new Error("Biometric authentication is blocked or unsupported.");
  }
  return new Error(errMsg || "Biometric verification failed.");
}

/**
 * Registers a new biometric credential using native WebAuthn API.
 */
export async function registerBiometric(userEmail: string): Promise<string> {
  if (!isWebAuthnSupported()) {
    throw new Error("Biometric authentication is not supported or requires HTTPS.");
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

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    });

    if (!credential) {
      throw new Error("Biometric registration was cancelled or failed.");
    }

    return (credential as any).id || "bio_passkey_" + Date.now();
  } catch (err: any) {
    throw parseWebAuthnError(err);
  }
}

/**
 * Authenicates a user using native WebAuthn API.
 */
export async function loginBiometric(): Promise<string> {
  if (!isWebAuthnSupported()) {
    throw new Error("Biometric authentication is not supported or requires HTTPS.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  try {
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
  } catch (err: any) {
    throw parseWebAuthnError(err);
  }
}
