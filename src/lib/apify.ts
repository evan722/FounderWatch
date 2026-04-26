export interface LinkedInSnapshot {
  role: string | null;
  company: string | null;
  headline: string | null;
  photo_url: string | null;
}

export async function fetchLinkedInSnapshot(linkedinUrl: string): Promise<LinkedInSnapshot> {
  const token = process.env.APIFY_API_TOKEN;
  const actorId = process.env.APIFY_ACTOR_ID || "net-webs/linkedin-profile-scraper";

  if (!token) {
    throw new Error("APIFY_API_TOKEN is missing");
  }

  // Apify "Run sync and get dataset items" endpoint
  // This triggers the actor and waits for it to complete (up to 300s normally)
  const endpoint = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      linkedinUrl, // Some actors use this
      profileUrl: linkedinUrl, // Some use this
      urls: [linkedinUrl], // Some use this
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Apify request failed (${response.status}): ${body}`);
  }

  const items = await response.json() as Record<string, unknown>[];

  if (!items || items.length === 0) {
    throw new Error("Apify returned no results for this LinkedIn URL");
  }

  // Map the first result. Fields vary by actor, so we check common mappings.
  const data = items[0];

  let role = (data.occupation || data.jobTitle || data.position) as string | null;
  let company = (data.company || data.currentCompany || data.companyName) as string | null;

  // Fallback to experience array if core fields are missing (common in some scrapers like dev_fusion)
  const experience = data.experience;
  if ((!role || !company) && Array.isArray(experience) && experience.length > 0) {
    const latest = experience[0] as Record<string, unknown>;
    role = role || (latest.title || latest.jobTitle || latest.position) as string | null;
    company = company || (latest.company || latest.companyName || latest.employer) as string | null;
  }

  return {
    role: role || null,
    company: company || null,
    headline: (data.headline || data.summary || data.about) as string | null || null,
    photo_url: (data.profilePicUrl || data.image || data.avatarUrl || data.profilePicture) as string | null || null,
  };
}
