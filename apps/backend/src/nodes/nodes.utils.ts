export function normalizeSerialNumber(serialNumber: string): string {
  return serialNumber.replace(/:/g, '').toLowerCase();
}
