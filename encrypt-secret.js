const sodium = require('sodium-native');

// GitHub public key (base64)
const publicKeyBase64 = 'DqTEAaduhpPOdwYtHTt8GP6R0TE4sTJTcNh3cuQjMCM=';
const publicKey = Buffer.from(publicKeyBase64, 'base64');

// Secret to encrypt
const secret = 'd87f47150b756ee943784c6fb223a8bad9e476683c609a0593a3512a22269f0e01-29cdb2da-e9b4-48bd-a10f-3592f173a8960101614059673110';
const message = Buffer.from(secret);

// Encrypt using sealed box
const ciphertext = Buffer.alloc(message.length + sodium.crypto_box_SEALBYTES);
sodium.crypto_box_seal(ciphertext, message, publicKey);

console.log('Encrypted value:', ciphertext.toString('base64'));
