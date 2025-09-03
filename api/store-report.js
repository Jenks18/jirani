// Stores data (MVP: just returns success)
export default function handler(req, res) {
  // TODO: Store report in DB or file
  res.status(200).json({ status: 'Report stored' });
}
