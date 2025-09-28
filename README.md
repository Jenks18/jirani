# Jirani - Community Safety Platform

A real-time community safety and incident reporting platform built with Next.js, Mapbox GL JS, and Supabase.

## Features

- 📍 Live incident mapping and tracking
- 📱 Real-time report submissions
- 🗺️ Interactive map interface
- 📊 Data visualization (coming soon)
- 👥 Community engagement tools (coming soon)

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. A Supabase account and project
3. A Mapbox account and API token

### Environment Setup

1. Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

2. Fill in your environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
- `NEXT_PUBLIC_MAPBOX_TOKEN`: Your Mapbox access token

### Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) to view the app

### Deployment

1. Create a new project on [Vercel](https://vercel.com)
2. Connect your GitHub repository
3. Add the following environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
4. Deploy!

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
