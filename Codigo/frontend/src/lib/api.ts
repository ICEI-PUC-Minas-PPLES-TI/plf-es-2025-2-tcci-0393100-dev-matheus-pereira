import axios, { type AxiosError } from "axios";
import type { ApiErrorBody } from "@/types/api";
import { createMockClient, isMockEnabled } from "./mockApi";

export { isMockEnabled } from "./mockApi";

/** URL base do backend. Evita requisições irem para o servidor do front (Vite). */
const baseURL =
  import.meta.env.VITE_API_URL !== undefined && String(import.meta.env.VITE_API_URL).trim() !== ""
    ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "")
    : "http://localhost:8080";

const axiosInstance = axios.create({
  baseURL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Em modo mock (VITE_USE_MOCK=true) usa dados em memória; senão usa o backend real */
export const api = isMockEnabled()
  ? (createMockClient() as typeof axiosInstance)
  : axiosInstance;

/** Chave onde o token de autenticação é guardado (quando o backend exigir) */
export const AUTH_TOKEN_KEY = "sgi_token";

/** Chave onde o login/nome do usuário é guardado para exibir na sidebar */
export const USER_DISPLAY_KEY = "sgi_user_display";
/** Login do usuário autenticado (para comparação com a API, ex.: revogar) */
export const USER_LOGIN_KEY = "sgi_user_login";
/** Chave onde o perfil do usuário autenticado é guardado */
export const USER_PROFILE_KEY = "sgi_user_profile";

if (!isMockEnabled()) {
  axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorBody>) => {
      if (error.response?.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_DISPLAY_KEY);
        localStorage.removeItem(USER_LOGIN_KEY);
        localStorage.removeItem(USER_PROFILE_KEY);
      }
      return Promise.reject(error);
    }
  );
}

/**
 * Extrai mensagem de erro amigável a partir da resposta da API ou do erro de rede.
 * Ajuste conforme o formato de erro do backend.
 */
const MSG_RELATORIO_INDISPONIVEL = "Este relatório ainda não está disponível no servidor.";

export function getApiErrorMessage(error: unknown, fallback = "Ocorreu um erro. Tente novamente."): string {
  if (!error || typeof error !== "object") return fallback;
  const ax = error as AxiosError<ApiErrorBody>;
  const data = ax.response?.data;
  if (data) {
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (typeof data.error === "string" && data.error.trim()) return data.error;
    if (Array.isArray(data.errors) && data.errors[0]?.message) return data.errors[0].message;
  }
  if (ax.code === "ECONNABORTED" || ax.message?.includes("timeout")) return "Tempo esgotado. Verifique sua conexão.";
  if (ax.message === "Network Error") return "Erro de conexão. Verifique se o backend está em execução.";
  if (typeof (error as Error).message === "string" && (error as Error).message) return (error as Error).message;
  return fallback;
}

/** Retorna mensagem amigável quando o endpoint não existe (404/501). */
export function getRelatorioErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const status = (error as AxiosError<ApiErrorBody>).response?.status;
    if (status === 404 || status === 501) return MSG_RELATORIO_INDISPONIVEL;
  }
  return getApiErrorMessage(error, fallback);
}

/**
 * Garante que a resposta é um array (content paginado ou array direto).
 */
export function normalizeListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && "content" in data && Array.isArray((data as { content: T[] }).content)) {
    return (data as { content: T[] }).content;
  }
  return [];
}
