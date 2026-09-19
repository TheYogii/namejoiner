/**
 * Outbound domain-search links. The registrar is Namecheap; every link is built here so swapping registrar
 * or adding affiliate tracking touches this one file.
 *
 * To monetise: set PUBLIC_REGISTRAR_AFFILIATE_TEMPLATE to your affiliate deep-link, using {url} where the
 * destination goes, e.g. https://your-tracking-link.example/?u={url}. The destination is URL-encoded before
 * it is inserted. With the variable unset, links go straight to Namecheap and carry no tracking ID.
 */

const TEMPLATE = (import.meta.env.PUBLIC_REGISTRAR_AFFILIATE_TEMPLATE as string | undefined)?.trim() ?? '';

/** True only when a usable affiliate template is configured. */
export const isMonetized = TEMPLATE.includes('{url}');

export const REGISTRAR_NAME = 'Namecheap';

const searchUrl = (domain: string) =>
  `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`;

export interface DomainLink {
  href: string;
  /** Sponsored links must be labelled as such for search engines. */
  rel: string;
}

/** Link that opens a .com availability search for a generated name. */
export function domainCheckLink(name: string): DomainLink {
  const label = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const destination = searchUrl(`${label}.com`);
  if (!isMonetized) return { href: destination, rel: 'noopener noreferrer' };
  return { href: TEMPLATE.replace('{url}', encodeURIComponent(destination)), rel: 'noopener noreferrer sponsored' };
}
