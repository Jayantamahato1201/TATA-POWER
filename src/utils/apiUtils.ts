/**
 * Safe fetch utility that prevents "Unexpected token <" / "Unexpected token T" SyntaxErrors
 * when an API endpoint returns HTML or non-JSON responses.
 */
export async function safeJsonFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      return {
        ok: res.ok,
        status: res.status,
        data,
        error: res.ok ? undefined : data?.error || `Request failed with status ${res.status}`,
      };
    }

    const text = await res.text();
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `Server responded with ${res.status} (${res.statusText || 'Error'})`,
      };
    }

    try {
      const parsed = JSON.parse(text);
      return { ok: true, status: res.status, data: parsed };
    } catch {
      return { ok: true, status: res.status, data: text as unknown as T };
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err.message || 'Network request failed',
    };
  }
}

/**
 * Safely parse a response object, falling back to a structured object if HTML/plain text is returned.
 */
export async function safeParseResponse<T = any>(res: Response, fallbackValue: T): Promise<T> {
  if (!res.ok) {
    return fallbackValue;
  }
  try {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await res.json()) as T;
    }
    const text = await res.text();
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn('[SafeParse] Failed to parse JSON response:', err);
    return fallbackValue;
  }
}
