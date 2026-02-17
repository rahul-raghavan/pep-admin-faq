const ALLOWED_DOMAINS = ['pepschoolv2.com', 'accelschool.in', 'ribbons.education'];

const SUPER_ADMINS = ['rahul@pepschoolv2.com', 'chetan@pepschoolv2.com'];

export function isAllowedEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}

export function isSuperAdmin(email: string): boolean {
  return SUPER_ADMINS.includes(email.toLowerCase());
}
