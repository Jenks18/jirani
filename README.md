# Jirani

**Jirani** is a community safety and incident reporting platform that enables citizens to report and track local incidents in real-time through WhatsApp integration and an interactive map interface.

🌐 **Website**: [jirani.the625movement.com](https://jirani.the625movement.com)  
🗺️ **Live Map**: [maps.the625movement.com](https://maps.the625movement.com)

## About Majirani Wetu 🇰🇪

**Jirani** is a program of the **Majirani Wetu** (“our neighbors”) initiative of [The 6.25 Movement](https://www.the625movement.com), a U.S.-based nonprofit.

## Domain Structure

This project uses subdomain routing:
- **jirani.the625movement.com** → Landing page only
- **maps.the625movement.com** → Map application only

The `/maps` route is NOT accessible on the main domain. Only the subdomain `maps.the625movement.com` serves the map application.
Both domains point to the same Vercel deployment, with middleware handling the routing.

## Features

- 📍 **Real-time Incident Mapping** - Interactive Mapbox-powered map displaying community reports
- 💬 **WhatsApp Integration** - Report incidents directly through WhatsApp messaging
- 🤖 **AI-Powered Processing** - Intelligent report categorization and location extraction using LLM
- 📊 **Event Tracking** - Comprehensive incident management and tracking system
- 🔒 **Privacy-First** - GDPR-compliant data handling and user privacy protection

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Mapbox GL JS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI/LLM**: Groq, Google Gemini, OpenAI
- **Messaging**: WhatsApp Cloud API
- **Deployment**: Vercel
- **Domain Structure**: 
  - `jirani.the625movement.com` - Main landing page
  - `maps.the625movement.com` - Interactive map application

## Privacy Policy

The privacy policy is available at:
- Production: [https://jirani.the625movement.com/privacy-policy.pdf](https://jirani.the625movement.com/privacy-policy.pdf)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- WhatsApp Business API access
- Mapbox account
- LLM API key (Groq/Gemini/OpenAI)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Jenks18/jirani.git
cd jirani
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your API keys and credentials.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

See `API_SETUP.md` and `WHATSAPP_SETUP.md` for detailed setup instructions for:
- WhatsApp Cloud API configuration
- LLM provider setup
- Supabase database schema
- Mapbox integration

## API Routes

- `/api/whatsapp` - WhatsApp Cloud API webhook (GET verification, signed POST)
- `/api/events` - Public, anonymized report feed used by the map
- `/api/store-report` - Admin-only report insertion (`x-admin-token`)
- `/api/status` - Health/config check

## Database Schema

The application uses Supabase with the following main tables:
- `reports` - User-submitted incident reports
- `events` - Processed and categorized incidents
- `messages` - WhatsApp conversation history

See `supabase/migrations/` for the complete schema.

## Deployment

The application is deployed on Vercel. To deploy your own instance:

```bash
vercel deploy
```

Make sure to configure all environment variables in your Vercel project settings.

## Data protection

- **Reports carry no reporter.** A stored report has no phone number, name or account id. Do not add one.
- **Public data is blurred.** Coordinates snap to a ~330 m grid, times to the hour, pin text becomes an area name, and summaries are scrubbed of phones, emails, plates, IDs and links (`src/lib/anonymize.ts`). The feed re-applies this when serving.
- **Encryption at rest.** With `DATA_ENCRYPTION_KEY` set (`openssl rand -hex 32`), phone numbers, names, last location, check-in notes and chat history are encrypted before they are stored (`src/lib/vault.ts`). Plaintext rows keep working and are upgraded when touched; `npx tsx scripts/seal-existing-data.ts --apply` converts the rest. Keep a copy of the key outside Vercel: without it the data cannot be read.
- **Retention.** Chats are kept until the person asks for deletion. Nothing purges by age or size.
- **Erasure.** Account deletion on the web removes the account, chats and contact rows. For an emailed request run `npx tsx scripts/erase-phone.ts <number>` (dry run), then add `--apply`.
- **Checks.** `npm test` runs the anonymization and data-flow tests. `supabase/migrations/20261021000000_privacy_hardening.sql` ends with a query that must return no rows.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please open an issue on GitHub.

