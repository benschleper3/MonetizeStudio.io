import fetch from 'node-fetch';

const APIFY_BASE = 'https://api.apify.com/v2';

/**
 * Scrape an Instagram profile using Apify's instagram-profile-scraper actor.
 * Falls back to mock data if APIFY_API_KEY is not set.
 */
export async function scrapeInstagramProfile(handle) {
  const cleanHandle = handle.replace(/^@/, '');

  if (!process.env.APIFY_API_KEY) {
    console.warn('[instagramScraper] APIFY_API_KEY not set — returning mock data');
    return getMockProfile(cleanHandle);
  }

  try {
    // Start the actor run
    const runRes = await fetch(
      `${APIFY_BASE}/acts/apify~instagram-profile-scraper/runs?token=${process.env.APIFY_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernames: [cleanHandle],
          resultsLimit: 30,
        }),
      }
    );

    if (!runRes.ok) {
      throw new Error(`Apify run failed: ${runRes.status} ${runRes.statusText}`);
    }

    const runData = await runRes.json();
    const runId = runData.data.id;

    // Poll for completion
    let status = 'RUNNING';
    let attempts = 0;
    while (status === 'RUNNING' || status === 'READY') {
      await new Promise((r) => setTimeout(r, 3000));
      attempts++;
      if (attempts > 20) throw new Error('Apify run timed out');

      const statusRes = await fetch(
        `${APIFY_BASE}/actor-runs/${runId}?token=${process.env.APIFY_API_KEY}`
      );
      const statusData = await statusRes.json();
      status = statusData.data.status;
    }

    if (status !== 'SUCCEEDED') {
      throw new Error(`Apify run ended with status: ${status}`);
    }

    // Fetch dataset results
    const datasetId = runData.data.defaultDatasetId;
    const resultsRes = await fetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?token=${process.env.APIFY_API_KEY}`
    );
    const results = await resultsRes.json();

    if (!results || results.length === 0) {
      throw new Error('No profile data returned from Apify');
    }

    return normalizeProfile(results[0]);
  } catch (err) {
    console.error(`[instagramScraper] Error scraping @${cleanHandle}:`, err.message);
    console.warn('[instagramScraper] Falling back to mock data');
    return getMockProfile(cleanHandle);
  }
}

function normalizeProfile(raw) {
  return {
    handle: raw.username || raw.handle,
    fullName: raw.fullName || raw.full_name || '',
    bio: raw.biography || raw.bio || '',
    followers: raw.followersCount || raw.followers || 0,
    following: raw.followingCount || raw.following || 0,
    postsCount: raw.postsCount || raw.mediaCount || 0,
    isVerified: raw.verified || false,
    externalUrl: raw.externalUrl || raw.external_url || '',
    engagementRate: raw.engagementRate || null,
    recentPosts: (raw.latestPosts || raw.posts || []).slice(0, 20).map((p) => ({
      type: p.type || p.productType || 'unknown',
      likes: p.likesCount || p.likes || 0,
      comments: p.commentsCount || p.comments || 0,
      views: p.videoViewCount || p.views || null,
      caption: (p.caption || '').slice(0, 300),
      timestamp: p.timestamp || p.takenAt || null,
      url: p.url || p.shortCode ? `https://instagram.com/p/${p.shortCode}` : '',
    })),
  };
}

function getMockProfile(handle) {
  return {
    handle,
    fullName: `${handle} (Mock Data)`,
    bio: 'Helping creators build audiences that convert | UGC coaching | DM "READY" to start',
    followers: 12400,
    following: 843,
    postsCount: 187,
    isVerified: false,
    externalUrl: 'https://example.com/cohort',
    engagementRate: 3.8,
    recentPosts: [
      {
        type: 'VIDEO',
        likes: 1240,
        comments: 87,
        views: 45000,
        caption: 'How I went from 0 to 10k followers in 90 days without paid ads #ugc #contentcreator',
        timestamp: '2025-03-01T14:00:00Z',
        url: 'https://instagram.com/p/mock1',
      },
      {
        type: 'CAROUSEL_ALBUM',
        likes: 892,
        comments: 124,
        views: null,
        caption: '5 UGC mistakes that are killing your brand deal chances (swipe to see all)',
        timestamp: '2025-02-28T10:00:00Z',
        url: 'https://instagram.com/p/mock2',
      },
      {
        type: 'VIDEO',
        likes: 2100,
        comments: 203,
        views: 89000,
        caption: 'POV: you finally landed your first $500 brand deal',
        timestamp: '2025-02-25T16:00:00Z',
        url: 'https://instagram.com/p/mock3',
      },
      {
        type: 'IMAGE',
        likes: 340,
        comments: 22,
        views: null,
        caption: 'Monday motivation for every UGC creator out there',
        timestamp: '2025-02-24T09:00:00Z',
        url: 'https://instagram.com/p/mock4',
      },
      {
        type: 'VIDEO',
        likes: 1780,
        comments: 156,
        views: 62000,
        caption: 'This one email template got me 3 brand deals in one week',
        timestamp: '2025-02-20T13:00:00Z',
        url: 'https://instagram.com/p/mock5',
      },
    ],
  };
}
