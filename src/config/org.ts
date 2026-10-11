export const org = {
  legalName: 'The 6.25 Movement',
  program: 'Majirani Wetu',
  product: 'Jirani',
  tagline: 'Your neighbors, looking out for each other.',
  email: '6.25movement@gmail.com',
  whatsappNumber: '254783045226',
  whatsappDisplay: '+254 783 045226',
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
  legalUpdated: 'October 9, 2026',
} as const;

export const whatsappLink = `https://wa.me/${org.whatsappNumber}?text=${encodeURIComponent('Hello Jirani')}`;
