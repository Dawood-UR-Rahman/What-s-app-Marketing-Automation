import crypto from "crypto";

export interface ApiTokenResult {
  token: string;
  hash: string;
}

export function generateApiToken(): ApiTokenResult {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = hashApiToken(token);
  
  return { token, hash };
}

export function hashApiToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyApiToken(providedToken: string, storedHash: string): boolean {
  const hashedProvidedToken = hashApiToken(providedToken);
  return crypto.timingSafeEqual(
    Buffer.from(hashedProvidedToken),
    Buffer.from(storedHash)
  );
}
