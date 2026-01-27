import { API_BASE_URL } from '../config/constants';

export interface ApiError {
    message: string;
    details?: any;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 30000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = MAX_RETRIES
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;
        await sleep(RETRY_DELAY * (MAX_RETRIES - retries + 1));
        return retryWithBackoff(fn, retries - 1);
    }
}

export async function request<T>(
    url: string,
    options?: RequestInit
): Promise<Result<T, ApiError>> {
    try {
        const response = await retryWithBackoff(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

            const res = await fetch(`${API_BASE_URL}${url}`, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${res.status}`);
            }

            return res;
        });

        const data = await response.json();
        return { ok: true, value: data };
    } catch (error: any) {
        return {
            ok: false,
            error: { message: error.message, details: error },
        };
    }
}

export async function get<T>(url: string): Promise<Result<T, ApiError>> {
    return request<T>(url, { method: 'GET' });
}

export async function post<T>(url: string, body: any): Promise<Result<T, ApiError>> {
    return request<T>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

export async function put<T>(url: string, body: any): Promise<Result<T, ApiError>> {
    return request<T>(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

export async function del<T>(url: string): Promise<Result<T, ApiError>> {
    return request<T>(url, { method: 'DELETE' });
}