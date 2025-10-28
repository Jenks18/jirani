# Jirani

**Jirani** is a community safety and incident reporting platform that enables citizens to report and track local incidents in real-time through WhatsApp integration and an interactive map interface.

🌐 **Live Application**: [maps.majiraniwetu.org](https://maps.majiraniwetu.org)

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
- **Domain**: maps.majiraniwetu.org

## Privacy Policy

The privacy policy is available at:
- Production: [https://maps.majiraniwetu.org/privacy-policy.pdf](https://maps.majiraniwetu.org/privacy-policy.pdf)

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

- `/api/webhook` - WhatsApp webhook endpoint
- `/api/whatsapp` - WhatsApp message handling
- `/api/process-llm` - LLM processing endpoint
- `/api/reports` - Report management
- `/api/events` - Event data retrieval
- `/api/store-report` - Report storage

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please open an issue on GitHub.

