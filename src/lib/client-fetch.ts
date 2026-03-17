export async function readApiErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const payload = (await response.json()) as { error?: string } | null;
    if (payload?.error && payload.error.trim()) {
      return payload.error.trim();
    }
  } catch {
    // ignore invalid JSON body
  }
  return fallbackMessage;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  return response;
}

export async function apiFetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await apiFetch(input, init);

  if (!response.ok) {
    const message = await readApiErrorMessage(response, "Не удалось загрузить данные.");
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
