// crypto.mjs
import { randomBytes, createCipheriv } from 'crypto';
import CryptoJS from 'crypto-js';
import { generateRandomString } from '../crypto/cr.js';

const secretKey = 'my-secret-key-123';


export const encrypt = (plainText) => {
    
    plainText = JSON.stringify(plainText)
    const encrypted = CryptoJS.AES.encrypt(plainText, secretKey).toString();
    return encrypted
}

export const decrypt = (encrypted) => {
    const decryptedBytes = CryptoJS.AES.decrypt(encrypted, secretKey);
    const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
    return
}



export function encryptWithAESKey(plaintext, aesKey) {
    plaintext = JSON.stringify(plaintext)
    const key = Buffer.isBuffer(aesKey) ? aesKey : Buffer.from(aesKey, 'hex');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
    };
}


export const encryptResponse = (formattedResponse) => {
    const aesKey = generateRandomString()
    let aesEncrypted = encryptWithAESKey(formattedResponse, aesKey)
    const encryptedAesKey = encrypt(aesKey)
    return {
        encryptedData: aesEncrypted.encryptedData,
        iv: aesEncrypted.iv,
        authTag: aesEncrypted.authTag,
        aesKey: encryptedAesKey
    }
}


