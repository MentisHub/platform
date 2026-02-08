import { Injectable } from '@nestjs/common';
import { createVerify } from 'crypto';
import { parseKey } from 'sshpk';

@Injectable()
export class NodeSignatureService {
  verifySignature(
    publicKeySSH: string,
    message: string,
    signatureBase64: string,
  ): boolean {
    try {
      const key = parseKey(publicKeySSH, 'ssh');
      const publicKeyPEM = key.toString('pem');

      const signatureData = Buffer.from(signatureBase64, 'base64').toString(
        'utf8',
      );

      const signatureMatch = signatureData.match(
        /-----BEGIN SSH SIGNATURE-----\n([\s\S]+?)\n-----END SSH SIGNATURE-----/,
      );
      if (!signatureMatch) {
        return false;
      }

      const signatureContent = signatureMatch[1].replace(/\s/g, '');
      const decodedSignature = Buffer.from(signatureContent, 'base64');

      const magicBytes = decodedSignature.subarray(0, 6).toString();
      if (magicBytes !== 'SSHSIG') {
        return false;
      }

      let offset = 6;

      const readUint32 = (buf: Buffer, off: number): number =>
        buf.readUInt32BE(off);
      const readString = (buf: Buffer, off: number): [string, number] => {
        const len = readUint32(buf, off);
        const str = buf.subarray(off + 4, off + 4 + len).toString();
        return [str, off + 4 + len];
      };

      const readBytes = (buf: Buffer, off: number): [Buffer, number] => {
        const len = readUint32(buf, off);
        const bytes = buf.subarray(off + 4, off + 4 + len);
        return [bytes, off + 4 + len];
      };

      [, offset] = readString(decodedSignature, offset);
      [, offset] = readString(decodedSignature, offset);
      [, offset] = readString(decodedSignature, offset);
      [, offset] = readBytes(decodedSignature, offset);

      const [signatureBytes] = readBytes(decodedSignature, offset);

      const [, sigOffset] = readString(signatureBytes, 0);
      const [rawSignature] = readBytes(signatureBytes, sigOffset);

      const verify = createVerify('SHA256');
      verify.update(Buffer.from(message, 'utf8'));
      verify.end();

      return verify.verify(publicKeyPEM, rawSignature);
    } catch {
      return false;
    }
  }

  createChallenge(): string {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2);
    return `${timestamp}:${nonce}`;
  }
}
