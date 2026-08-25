/// <reference types="vite/client" />

interface Window {
  ENV?: {
    VITE_GOOGLE_CLIENT_ID?: string;
    [key: string]: string | undefined;
  };
}
