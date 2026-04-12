export async function sendSelfbotMessage(
    token: string,
    guildId: string,
    channelId: string,
    content: string
): Promise<void> {
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/json",
            "Authorization": token,
            // "X-Super-Properties": "eyJvcyI6IkxpbnV4IiwiYnJvd3NlciI6IkZpcmVmb3giLCJkZXZpY2UiOiIiLCJzeXN0ZW1fbG9jYWxlIjoiZW4tVVMiLCJoYXNfY2xpZW50X21vZHMiOmZhbHNlLCJicm93c2VyX3VzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoWDExOyBMaW51eCB4ODZfNjQ7IHJ2OjE0NS4wKSBHZWNrby8yMDEwMDEwMSBGaXJlZm94LzE0NS4wIiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTQ1LjAiLCJvc192ZXJzaW9uIjoiIiwicmVmZXJyZXIiOiJodHRwczovL2Rpc2NvcmQuY29tLyIsInJlZmVycmluZ19kb21haW4iOiJkaXNjb3JkLmNvbSIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjQ3NjE3OSwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=",
            "Sec-GPC": "1",
            "Alt-Used": "discord.com",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Priority": "u=0"
        },
        referrer: `https://discord.com/channels/${guildId}/${channelId}`,
        body: JSON.stringify({ content }),
        mode: "cors"
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Discord selfbot message failed (${response.status}): ${body}`);
    }
}
