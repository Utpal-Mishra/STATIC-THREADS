declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): unknown };
import { handleImportRequest } from "./core.ts";
const env = (key: string) => Deno.env.get(key) ?? "";
Deno.serve(request => handleImportRequest(request, { supabaseUrl: env("SUPABASE_URL").replace(/\/$/, ""), anonKey: env("SUPABASE_ANON_KEY"), serviceKey: env("SUPABASE_SERVICE_ROLE_KEY"), providerKey: env("OPENAI_API_KEY"), model: env("OUTFIT_VISION_MODEL"), allowedOrigins: env("OUTFIT_ALLOWED_ORIGINS").split(",").map(v => v.trim()).filter(Boolean) }));
