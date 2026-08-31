export type ApiResult<T> = { data: T; error: null } | { data: null; error: { code: string; message: string } };
export interface ApiClient { get<T>(path: string): Promise<ApiResult<T>>; }
