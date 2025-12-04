import { randomBytes } from "crypto";

export function generateRandomString(length = 12) {
    const aesKey = randomBytes(32);
  
    return aesKey;
  }
  