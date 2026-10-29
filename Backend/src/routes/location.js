import { Router } from 'express';

export const locationRouter = Router();

const lookupRequests = new Map();
const lookupRateLimit = (req, res, next) => {
  const now = Date.now();
  const recent = (lookupRequests.get(req.ip) || []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= 10) {
    return res.status(429).json({ error: 'Too many address lookups. Please wait a minute before trying again.' });
  }
  recent.push(now);
  lookupRequests.set(req.ip, recent);
  next();
};

const caintaBounds = {
  minLat: 14.547851,
  minLon: 121.0946307,
  maxLat: 14.6365632,
  maxLon: 121.1450774
};
const caintaCenter = { lat: 14.5800, lon: 121.1100 };

locationRouter.post('/lookup', lookupRateLimit, async (req, res) => {
  const { address } = req.body || {};
  if (typeof address !== 'string' || address.trim().length < 3 || address.length > 200) {
    return res.status(400).json({ error: 'Enter a full address between 3 and 200 characters.' });
  }

  const query = new URLSearchParams({
    q: address.trim(),
    limit: '5',
    lat: String(caintaCenter.lat),
    lon: String(caintaCenter.lon),
    bbox: [caintaBounds.minLon, caintaBounds.minLat, caintaBounds.maxLon, caintaBounds.maxLat].join(',')
  });

  try {
    const response = await fetch(`https://photon.komoot.io/api/?${query}`, {
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) {
      return res.status(502).json({ error: 'Address lookup is temporarily unavailable. Please try again later.' });
    }
    const result = await response.json();
    if (!Array.isArray(result.features)) {
      return res.status(502).json({ error: 'Address lookup returned an invalid response. Please try again later.' });
    }
    const features = result.features.filter((feature) => {
      const [lon, lat] = feature.geometry?.coordinates || [];
      const properties = feature.properties || {};
      const caintaName = [properties.city, properties.county, properties.district, properties.locality]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return Number.isFinite(lon) &&
        Number.isFinite(lat) &&
        properties.countrycode?.toUpperCase() === 'PH' &&
        caintaName.includes('cainta') &&
        lat >= caintaBounds.minLat &&
        lat <= caintaBounds.maxLat &&
        lon >= caintaBounds.minLon &&
        lon <= caintaBounds.maxLon;
    });
    res.json({ features });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError';
    res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? 'Address lookup took too long. Please try again.'
        : 'Address lookup is temporarily unavailable. Please try again later.'
    });
  }
});

locationRouter.post('/reverse', lookupRateLimit, async (req, res) => {
  const { lat, lon } = req.body || {};
  if (
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < caintaBounds.minLat ||
    lat > caintaBounds.maxLat ||
    lon < caintaBounds.minLon ||
    lon > caintaBounds.maxLon
  ) {
    return res.status(400).json({ error: 'Choose a location within Cainta.' });
  }

  const query = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  try {
    const response = await fetch(`https://photon.komoot.io/reverse?${query}`, {
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) {
      return res.status(502).json({ error: 'Location lookup is temporarily unavailable. Please try again later.' });
    }
    const result = await response.json();
    if (!Array.isArray(result.features)) {
      return res.status(502).json({ error: 'Location lookup returned an invalid response. Please try again later.' });
    }
    res.json({ features: result.features });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError';
    res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? 'Location lookup took too long. Please try again.'
        : 'Location lookup is temporarily unavailable. Please try again later.'
    });
  }
});
