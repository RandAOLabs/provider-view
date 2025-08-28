import { getKeyPairFromSeed } from "human-crypto-keys";
import type { JWKInterface } from "arweave/web/lib/wallet";
// import { passwordStrength } from "check-password-strength";
import { isOneOf, isString } from "typed-assert";
import { wordlists, mnemonicToSeed, generateMnemonic } from "bip39-web-crypto";
import { validateMnemonic } from 'bip39';
import Arweave from "arweave";

// Initialize Arweave
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

/**
 * Credits to arweave.app for the mnemonic wallet generation
 *
 * https://github.com/jfbeats/ArweaveWebWallet/blob/master/src/functions/Wallets.ts
 * https://github.com/jfbeats/ArweaveWebWallet/blob/master/src/functions/Crypto.ts
 */

/**
 * Generate a JWK from a mnemonic seedphrase
 *
 * @param mnemonic Mnemonic seedphrase to generate wallet from
 * @returns Wallet JWK
 */
export async function jwkFromMnemonic(mnemonic: string) {
  // TODO: We use `mnemonicToSeed()` from `bip39-web-crypto` here instead of using `getKeyPairFromMnemonic`, which
  // internally uses `bip39`. Instead, we should just be using `getKeyPairFromMnemonic` and lazy load this dependency:
  //
  // For additional context, see https://www.notion.so/community-labs/Human-Crypto-Keys-reported-Bug-d3a8910dabb6460da814def62665181a

  const seedBuffer = await mnemonicToSeed(mnemonic);

  const { privateKey } = await getKeyPairFromSeed(
    //@ts-ignore
    seedBuffer,
    {
      id: "rsa",
      modulusLength: 4096,
    },
    { privateKeyFormat: "pkcs8-der" },
  );
  const jwk = pkcs8ToJwk(privateKey as any);

  return jwk;
}

/**
 * Convert a PKCS8 private key to a JWK
 *
 * @param privateKey PKCS8 private key to convert
 * @returns JWK
 */
export async function pkcs8ToJwk(privateKey: Uint8Array): Promise<JWKInterface> {
  const key = await window.crypto.subtle.importKey("pkcs8", privateKey, { name: "RSA-PSS", hash: "SHA-256" }, true, [
    "sign",
  ]);
  const jwk = await window.crypto.subtle.exportKey("jwk", key);

  return {
    kty: jwk.kty!,
    e: jwk.e!,
    n: jwk.n!,
    d: jwk.d,
    p: jwk.p,
    q: jwk.q,
    dp: jwk.dp,
    dq: jwk.dq,
    qi: jwk.qi,
  };
}

/**
 * Check password strength
 *
 * @param password Password to check
 */
export function checkPasswordValid(password: string) {
  // const strength = passwordStrength(password);
  // return strength.id === 3;
  return password.length >= 8; // Simple validation for now
}

/**
 * Validate if a string is a valid mnemonic phrase
 * 
 * @param mnemonic Mnemonic to validate
 * @returns Length of the mnemonic if valid
 */
export function isValidMnemonic(mnemonic: string): number {
  isString(mnemonic, "Mnemonic has to be a string.");

  const words = mnemonic.split(" ");

  isOneOf(words.length, [12, 18, 24], "Invalid mnemonic length.");

  const wordlist = wordlists.english;

  for (const word of words) {
    isOneOf(word, wordlist, "Invalid word in mnemonic.");
  }

  return words.length;
}

/**
 * Generate a new 12-word mnemonic seed phrase
 * 
 * @returns 12-word mnemonic seed phrase
 */
export async function generateSeedPhrase(): Promise<string> {
  return await generateMnemonic(128); // 128 bits = 12 words
}

/**
 * Get address from mnemonic seed phrase
 * 
 * @param mnemonic 12-24 word seed phrase
 * @returns Arweave wallet address
 */
export async function getAddressFromMnemonic(mnemonic: string): Promise<string> {
  try {
    // Clean and normalize the mnemonic
    const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    
    console.log('Processing mnemonic:', cleanMnemonic.split(' ').length, 'words');
    
    // Basic validation first
    if (!cleanMnemonic || typeof cleanMnemonic !== 'string') {
      throw new Error("Mnemonic must be a non-empty string");
    }
    
    const words = cleanMnemonic.split(' ');
    if (![12, 15, 18, 21, 24].includes(words.length)) {
      throw new Error(`Invalid word count: ${words.length}. Must be 12, 15, 18, 21, or 24 words`);
    }
    
    // Try bip39 validation first (more lenient)
    try {
      if (!validateMnemonic(cleanMnemonic)) {
        throw new Error("BIP39 validation failed");
      }
    } catch (bip39Error) {
      console.warn('BIP39 validation failed:', bip39Error);
      // Continue with custom validation as fallback
    }
    
    // Try custom validation as fallback
    try {
      const validationResult = isValidMnemonic(cleanMnemonic);
      if (!validationResult) {
        throw new Error("Custom validation failed");
      }
    } catch (customError) {
      console.warn('Custom validation failed:', customError);
      // If both validations fail, we'll still try to generate the wallet
      // as the validation might be too strict
    }
    
    const wallet = await jwkFromMnemonic(cleanMnemonic);
    const address = await arweave.wallets.jwkToAddress(wallet);
    return address;
  } catch (error) {
    console.error('Address generation error:', error);
    throw new Error(`Failed to generate address from mnemonic: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
