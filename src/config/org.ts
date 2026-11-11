export const org = {
  legalName: 'The 6.25 Movement',
  product: 'Jirani',
  tagline: 'Your neighbors, looking out for each other.',
  email: '6.25movement@gmail.com',
  whatsappNumber: '12025094959',
  whatsappDisplay: '+1 202 509 4959',
  mainUrl: 'https://jirani.the625movement.com',
  mapsUrl: 'https://maps.the625movement.com',
  parentUrl: 'https://www.the625movement.com',
  social: {
    x: 'https://x.com/625movement',
    instagram: 'https://instagram.com/6.25movement',
  },
  address: '' as string,
  ein: '' as string,
  incorporationState: '' as string,
  legalUpdated: 'October 21, 2026',
} as const;

export const whatsappLink = `https://wa.me/${org.whatsappNumber}?text=${encodeURIComponent('Hello Jirani')}`;

const p = (path: string) => `${org.parentUrl}${path}`;

export const parentNav = [
  { label: 'Home', href: p('/') },
  { label: 'Jirani', href: org.mainUrl, current: true },
  { label: 'Our Work', href: p('/our-work') },
  { label: 'Events', href: p('/events') },
  { label: 'Resources', href: p('/resources') },
  {
    label: 'Get Involved',
    children: [
      { label: 'Become a Partner', href: p('/become-a-partner') },
      { label: 'Become a Member', href: p('/become-a-member') },
      { label: 'Volunteer Sign Up', href: p('/volunteer-sign-up') },
      { label: 'Donations', href: p('/donate') },
    ],
  },
  {
    label: 'About 6.25',
    children: [
      { label: 'Our Story', href: p('/our-story') },
      { label: 'Our Team', href: p('/our-team') },
      { label: 'Contact Us', href: p('/contact') },
    ],
  },
] as const;

export const parentContact = { label: 'Contact Us', href: p('/contact') };
