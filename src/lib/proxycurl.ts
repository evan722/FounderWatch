interface ProxycurlExperience {
  title?: string;
  company?: string;
  company_name?: string;
  ends_at?: {
    year?: number;
    month?: number;
  };
}

interface ProxycurlPersonResponse {
  occupation?: string;
  headline?: string;
  experiences?: ProxycurlExperience[];
}

function getCurrentExperience(experiences: ProxycurlExperience[] = []) {
  return experiences.find((exp) => !exp.ends_at?.year) || experiences[0];
}

export async function fetchLinkedInSnapshot(linkedinUrl: string) {
  const apiKey = process.env.PROXYCURL_API_KEY;

  if (!apiKey) {
    throw new Error("PROXYCURL_API_KEY is missing");
  }

  const endpoint = new URL("https://nubela.co/proxycurl/api/v2/linkedin");
  endpoint.searchParams.set("url", linkedinUrl);
  endpoint.searchParams.set("fallback_to_cache", "on-error");
  endpoint.searchParams.set("use_cache", "if-present");

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Proxycurl request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as ProxycurlPersonResponse;
  const current = getCurrentExperience(data.experiences);

  return {
    role: current?.title || data.occupation || data.headline || null,
    company: current?.company || current?.company_name || null,
  };
}
