import { ApiResponse } from '@/types';
import { API_CONFIG } from '@/config/api';

const { BASE_URL, TIMEOUT, MAX_RETRIES, RETRY_DELAY } = API_CONFIG;

class ApiClient {
  private async request<T>(
    url: string,
    options: RequestInit = {},
    retries = MAX_RETRIES
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(`${BASE_URL}${url}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data: ApiResponse<T> = await response.json();

      if (data.code !== 200) {
        throw new Error(data.message || 'API Error');
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (retries > 0 && this.shouldRetry(error)) {
        await this.delay(RETRY_DELAY * (MAX_RETRIES - retries + 1));
        return this.request(url, options, retries - 1);
      }

      throw error;
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
      return error.name === 'AbortError' || !error.message.includes('HTTP');
    }
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private buildQueryString(params: Record<string, string | number>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    return searchParams.toString();
  }

  async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      url += `?${this.buildQueryString(params)}`;
    }
    return this.request<T>(url, { method: 'GET' });
  }
}

export const apiClient = new ApiClient();
