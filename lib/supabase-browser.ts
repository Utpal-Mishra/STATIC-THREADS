export type CloudConfig = {
  url: string;
  anonKey: string;
};

export function getCloudConfig(): CloudConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

export async function requestMagicLink(email: string) {
  const config = getCloudConfig();
  if (!config) throw new Error("Cloud sync is not configured yet.");

  const redirectTo = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/account/`;
  const response = await fetch(`${config.url}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      create_user: true,
      options: { emailRedirectTo: redirectTo }
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to send sign-in link.");
  }
}

export function cloudEnabled() {
  return Boolean(getCloudConfig());
}
