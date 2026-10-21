import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'crypto';

const RANDOM_PREFIX = 'enc1.';
const STABLE_PREFIX = 'dtm1.';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class VaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultError';
  }
}

interface KeySet {
  random: Buffer;
  stable: Buffer;
  stableIv: Buffer;
}

let memo: { raw: string; keys: KeySet } | null = null;

function decodeMaster(raw: string): Buffer | null {
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
  const bytes = Buffer.from(raw, 'base64');
  return bytes.length === 32 ? bytes : null;
}

function keys(): KeySet | null {
  const raw = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  if (memo?.raw === raw) return memo.keys;
  const master = decodeMaster(raw);
  if (!master) throw new VaultError('DATA_ENCRYPTION_KEY must be 32 random bytes as 64 hex characters or base64');
  const derive = (label: string) => Buffer.from(hkdfSync('sha256', master, Buffer.alloc(32), `jirani/${label}`, 32));
  const keySet = { random: derive('random'), stable: derive('stable'), stableIv: derive('stable-iv') };
  memo = { raw, keys: keySet };
  return keySet;
}

export const vaultEnabled = (): boolean => keys() !== null;

export const isSealed = (value: unknown): value is string =>
  typeof value === 'string' && (value.startsWith(RANDOM_PREFIX) || value.startsWith(STABLE_PREFIX));

function encrypt(prefix: string, key: Buffer, iv: Buffer, plain: string, context: string): string {
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context));
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return prefix + Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

export function sealText(plain: string, context: string): string;
export function sealText(plain: string | null | undefined, context: string): string | null;
export function sealText(plain: string | null | undefined, context: string): string | null {
  if (plain == null) return null;
  const k = keys();
  if (!k) return plain;
  return encrypt(RANDOM_PREFIX, k.random, randomBytes(IV_BYTES), plain, context);
}

export function sealStable(plain: string, context: string): string {
  const k = keys();
  if (!k) return plain;
  const iv = createHmac('sha256', k.stableIv).update(context).update('\0').update(plain).digest().subarray(0, IV_BYTES);
  return encrypt(STABLE_PREFIX, k.stable, iv, plain, context);
}

export function openText(value: string, context: string): string;
export function openText(value: string | null | undefined, context: string): string | null;
export function openText(value: string | null | undefined, context: string): string | null {
  if (value == null) return null;
  if (!isSealed(value)) return value;
  const k = keys();
  if (!k) throw new VaultError('Encrypted data was found but DATA_ENCRYPTION_KEY is not set');
  const stable = value.startsWith(STABLE_PREFIX);
  const raw = Buffer.from(value.slice(RANDOM_PREFIX.length), 'base64url');
  if (raw.length < IV_BYTES + TAG_BYTES) throw new VaultError('Encrypted value is malformed');
  try {
    const decipher = createDecipheriv('aes-256-gcm', stable ? k.stable : k.random, raw.subarray(0, IV_BYTES));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8');
  } catch {
    throw new VaultError('Encrypted value could not be verified (wrong key or altered data)');
  }
}

export function sealJson<T>(value: T | null | undefined, context: string): T | string | null {
  if (value == null) return null;
  return keys() ? sealText(JSON.stringify(value), context) : value;
}

export function openJson<T>(value: unknown, context: string): T | null {
  if (value == null) return null;
  if (isSealed(value)) return JSON.parse(openText(value, context)) as T;
  return value as T;
}

export const sealPhone = (phone: string): string => sealStable(phone, 'phone');
export const openPhone = (value: string): string => openText(value, 'phone');
export const phoneKeys = (phone: string): string[] => (vaultEnabled() ? [sealPhone(phone), phone] : [phone]);
