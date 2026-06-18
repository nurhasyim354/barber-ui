/** Kunci `tenantId` di query booking — ObjectId atau `tenantLinkSlug` jika di-set. */
export function bookingTenantUrlKey(tenantId: string, tenantLinkSlug?: string | null): string {
  const slug = tenantLinkSlug?.trim();
  return slug || tenantId;
}

export function buildBookingPageUrl(
  origin: string,
  tenantId: string,
  tenantLinkSlug?: string | null,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams({
    tenantId: bookingTenantUrlKey(tenantId, tenantLinkSlug),
    type: 'booking',
    ...extra,
  });
  return `${origin.replace(/\/$/, '')}/booking?${params.toString()}`;
}
