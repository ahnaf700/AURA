export async function sendWhatsAppMessage(to, text) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v21.0'}/${process.env.META_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          text: { body: String(text).slice(0, 3500) },
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) console.error('Gagal kirim WA:', res.status, await res.text());
  } catch (err) {
    console.error('Gagal kirim WA:', err.message);
  }
}
