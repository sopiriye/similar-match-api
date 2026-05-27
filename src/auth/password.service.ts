import { Injectable } from '@nestjs/common';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    // PasswordService hashing flow:
    // Generate a unique salt and derive the stored password hash that will be persisted for future login checks.
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

    return `${salt}:${derivedKey.toString('hex')}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    // PasswordService verification flow:
    // Split the stored password record into its salt and hash components before computing a comparison hash.
    const [salt, hash] = storedHash.split(':');

    if (!salt || !hash) {
      return false;
    }

    // PasswordService verification flow:
    // Derive the comparison hash and use a timing-safe equality check to prevent leaking credential validity through timing.
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const storedBuffer = Buffer.from(hash, 'hex');

    return timingSafeEqual(storedBuffer, derivedKey);
  }
}
