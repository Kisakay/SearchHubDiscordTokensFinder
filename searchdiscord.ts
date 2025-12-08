export async function searchDiscord(userId: string): Promise<any> {
  const cookieHeader = await Bun.file("cookies.txt").text();

  const res = await fetch("https://searchhub.vip/api/search/discord", {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Content-Type": "application/json",
      "Origin": "https://searchhub.vip",
      "DNT": "1",
      "Sec-GPC": "1",
      "Connection": "keep-alive",
      "Referer": "https://searchhub.vip/search",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "Priority": "u=0",
      "Cookie": cookieHeader.trim(),
    },
    body: JSON.stringify({
      userId,
      timezoneOffsetMinutes: -60,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json();
}