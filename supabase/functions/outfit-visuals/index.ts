declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): unknown };
import { handleVisualRequest } from "./core.ts";
const env = (name: string) => Deno.env.get(name) ?? "";
Deno.serve(request => handleVisualRequest(request, {
  supabaseUrl: env("SUPABASE_URL").replace(/\/$/, ""), anonKey: env("SUPABASE_ANON_KEY"), serviceKey: env("SUPABASE_SERVICE_ROLE_KEY"),
  providerKey: env("OPENAI_API_KEY"), searchModel: env("OUTFIT_SEARCH_MODEL"), imageModel: env("OUTFIT_IMAGE_MODEL"), signingSecret: env("OUTFIT_VISUAL_SIGNING_SECRET"),
  allowedOrigins: env("OUTFIT_ALLOWED_ORIGINS").split(",").map(value => value.trim()).filter(Boolean)
}));
