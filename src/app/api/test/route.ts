export async function GET() {
  return new Response('test123', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
