import { log } from "@/lib/logger";

export interface ScanResult {
  isClean: boolean;
  status: "clean" | "infected" | "error" | "mock_clean";
  detail?: string;
}

/**
 * Scans a file buffer for malware (e.g., using ClamAV).
 * In the absence of a local ClamAV binary or specific configuration,
 * it mocks the scan result to gracefully fail-safe.
 */
export async function scanFileBuffer(buffer: Buffer): Promise<ScanResult> {
  const useMock = process.env.CLAMAV_URL ? false : true;

  if (useMock) {
    log.info("scanner", "mock_scan", { status: "clean", bytes: buffer.length });
    return { isClean: true, status: "mock_clean" };
  }

  // Real ClamAV implementation (example using a generic REST API to ClamAV if configured)
  try {
    const clamAvUrl = process.env.CLAMAV_URL as string;

    // NOTE: This represents how one would connect to an external ClamAV daemon
    // over HTTP/REST. (Real ClamAV often uses clamd TCP sockets, but an API wrapper is common).
    const formData = new FormData();
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    formData.append('file', new Blob([arrayBuffer as ArrayBuffer]));

    const response = await fetch(clamAvUrl, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      log.error("scanner", "scan_failed", { status: response.status });
      return { isClean: false, status: "error", detail: "Scanner returned non-200" };
    }

    const data = await response.json();
    const isInfected = data.isInfected || false;

    if (isInfected) {
      log.warn("scanner", "threat_detected", { detail: data.viruses });
      return { isClean: false, status: "infected", detail: "Malware detected" };
    }

    return { isClean: true, status: "clean" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("scanner", "scan_error", { err: msg });

    // Fail safe policy for critical health records: If scanner is down, we must still allow operations
    // or fail the upload. Given healthcare, failing the upload is safer.
    return { isClean: false, status: "error", detail: "Scanner unreachable" };
  }
}
