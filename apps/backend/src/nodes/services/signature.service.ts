import { Injectable, Logger } from '@nestjs/common';
import { createHash, createPublicKey, createVerify } from 'crypto';

@Injectable()
export class NodeSignatureService {
  private readonly logger: Logger = new Logger(NodeSignatureService.name);

  verifySignature(
    ecPublicKeyBase64: string,
    message: string,
    signatureBase64: string,
  ): boolean {
    try {
      // ecPublicKey is stored as base64(PEM PKCS#8) — decode before parsing
      const pem = Buffer.from(ecPublicKeyBase64, 'base64').toString('utf8');
      const publicKey = createPublicKey(pem);

      // The signature is base64(SSH signature file text)
      const signatureText = Buffer.from(signatureBase64, 'base64').toString(
        'utf8',
      );
      const signatureMatch = signatureText.match(
        /-----BEGIN SSH SIGNATURE-----\n([\s\S]+?)\n-----END SSH SIGNATURE-----/,
      );
      if (!signatureMatch) {
        return false;
      }

      const blob = Buffer.from(signatureMatch[1].replace(/\s/g, ''), 'base64');

      // Validate SSHSIG magic preamble (6 raw bytes, not length-prefixed)
      if (blob.subarray(0, 6).toString() !== 'SSHSIG') {
        return false;
      }

      const readUint32 = (buf: Buffer, off: number): number =>
        buf.readUInt32BE(off);
      const readBytes = (buf: Buffer, off: number): [Buffer, number] => {
        const len = readUint32(buf, off);
        return [buf.subarray(off + 4, off + 4 + len), off + 4 + len];
      };

      // SSHSIG blob layout after magic:
      //   uint32(version)       — 4 raw bytes, NOT a length-prefixed string
      //   string(public_key)    — 4-byte length + bytes
      //   string(namespace)     — 4-byte length + bytes
      //   string(reserved)      — 4-byte length + bytes (empty)
      //   string(hash_alg)      — 4-byte length + bytes (e.g., "sha512")
      //   string(sig_blob)      — 4-byte length + bytes
      let offset = 6;
      offset += 4; // skip uint32(version)
      [, offset] = readBytes(blob, offset); // skip public_key string
      const [namespace, nsOffset] = readBytes(blob, offset);
      offset = nsOffset;
      [, offset] = readBytes(blob, offset); // skip reserved (empty string)
      const [hashAlgBuf, hashOffset] = readBytes(blob, offset);
      offset = hashOffset;
      const hashAlg = hashAlgBuf.toString();
      const [sigBlob] = readBytes(blob, offset);

      // SSH signature blob: string(key_type) + string(sig_data)
      // For ecdsa-sha2-nistp384, sig_data = mpint(r) || mpint(s)
      const [, keyTypeOffset] = readBytes(sigBlob, 0);
      const [sigData] = readBytes(sigBlob, keyTypeOffset);

      // Convert SSH mpint(r) || mpint(s) to DER-encoded ECDSA signature
      const derSig = this.mpintPairToDer(sigData);
      if (!derSig) return false;

      // Reconstruct tosign — the data that ssh-keygen actually signs:
      //   "SSHSIG" (6 raw bytes)
      //   string(namespace)
      //   string("")             — reserved
      //   string(hash_alg)
      //   string(H(message))     — H is the hash_alg above (sha512 by default)
      // Note: the version field exists only in the SSHSIG envelope, NOT in the signed data.
      const encodeString = (b: Buffer): Buffer => {
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(b.length);
        return Buffer.concat([lenBuf, b]);
      };
      const hMessage = createHash(hashAlg)
        .update(Buffer.from(message, 'utf8'))
        .digest();
      const tosign = Buffer.concat([
        Buffer.from('SSHSIG'),
        encodeString(namespace),
        encodeString(Buffer.alloc(0)), // reserved ""
        encodeString(Buffer.from(hashAlg)),
        encodeString(hMessage),
      ]);

      // ECDSA P-384 uses SHA-384 for the signing operation
      const verify = createVerify('SHA384');
      verify.update(tosign);
      const isValid = verify.verify(publicKey, derSig);

      if (!isValid) {
        this.logger.warn(
          { action: 'signature.verify', issue: 'verification_failed' },
          'SSH signature verification failed',
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error(
        {
          action: 'signature.verify',
          err: error instanceof Error ? error : new Error(String(error)),
          issue: 'verification_error',
        },
        'Error during SSH signature verification',
      );
      return false;
    }
  }

  // Converts SSH mpint(r) || mpint(s) to DER SEQUENCE { INTEGER r, INTEGER s }
  private mpintPairToDer(sigData: Buffer): Buffer | null {
    try {
      const readUint32 = (buf: Buffer, off: number): number =>
        buf.readUInt32BE(off);
      const readMpint = (buf: Buffer, off: number): [Buffer, number] => {
        const len = readUint32(buf, off);
        return [buf.subarray(off + 4, off + 4 + len), off + 4 + len];
      };

      const encodeDerInt = (mpint: Buffer): Buffer => {
        // Strip leading zero bytes (mpint uses them for sign; DER only needs one)
        let start = 0;
        while (start < mpint.length - 1 && mpint[start] === 0) start++;
        const stripped = mpint.subarray(start);
        // Re-add leading 0x00 if high bit is set (to mark as positive)
        const content =
          stripped[0] & 0x80
            ? Buffer.concat([Buffer.from([0x00]), stripped])
            : stripped;
        // DER INTEGER: tag=0x02, length (1 byte, P-384 coords are <128), value
        return Buffer.concat([Buffer.from([0x02, content.length]), content]);
      };

      const [r, rOff] = readMpint(sigData, 0);
      const [s] = readMpint(sigData, rOff);

      const rDer = encodeDerInt(r);
      const sDer = encodeDerInt(s);
      const seqContent = Buffer.concat([rDer, sDer]);

      // DER SEQUENCE: tag=0x30, length (1 byte, P-384 sequence is <128), content
      return Buffer.concat([
        Buffer.from([0x30, seqContent.length]),
        seqContent,
      ]);
    } catch {
      return null;
    }
  }

  createChallenge(): string {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2);
    return `${timestamp}:${nonce}`;
  }
}
