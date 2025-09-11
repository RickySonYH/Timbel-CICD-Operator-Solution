/// <reference types="vite/client" />

// [advice from AI] Vite 환경변수 타입 정의
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // 필요한 다른 환경변수들도 여기에 추가 가능
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
