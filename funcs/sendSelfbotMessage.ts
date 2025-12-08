export async function sendSelfbotMessage(token: string, guildId: string, channelId: string, content: string) {
    await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
        "credentials": "include",
        "headers": {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/json",
            // "X-Context-Properties": "eyJsb2NhdGlvbiI6ImNoYXRfaW5wdXQifQ==",
            "Authorization": token,
            "X-Super-Properties": "eyJvcyI6IkxpbnV4IiwiYnJvd3NlciI6IkZpcmVmb3giLCJkZXZpY2UiOiIiLCJzeXN0ZW1fbG9jYWxlIjoiZW4tVVMiLCJoYXNfY2xpZW50X21vZHMiOmZhbHNlLCJicm93c2VyX3VzZXJfYWdlbnQiOiJNb3ppbGxhLzUuMCAoWDExOyBMaW51eCB4ODZfNjQ7IHJ2OjE0NS4wKSBHZWNrby8yMDEwMDEwMSBGaXJlZm94LzE0NS4wIiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTQ1LjAiLCJvc192ZXJzaW9uIjoiIiwicmVmZXJyZXIiOiJodHRwczovL3Jlc3Vydml2LmJpei8iLCJyZWZlcnJpbmdfZG9tYWluIjoicmVzdXJ2aXYuYml6IiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjQ3NjE3OSwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbCwiY2xpZW50X2xhdW5jaF9pZCI6ImZmYzM1ZjZhLWJmMzQtNGMyYi05MWQ0LTcyNDkyN2NkOWZkNiIsImxhdW5jaF9zaWduYXR1cmUiOiJhMDM0MDZjOS02NTE3LTQ0YWMtOGM0YS0xODhhODg2YjUzZjIiLCJjbGllbnRfYXBwX3N0YXRlIjoiZm9jdXNlZCIsImNsaWVudF9oZWFydGJlYXRfc2Vzc2lvbl9pZCI6IjRkMDhiNDFiLWM2MDgtNDU5MS04Nzc0LTcwODNiOTM2ZDQ3YSJ9",
            // "X-Discord-Locale": "en-US",
            // "X-Discord-Timezone": "Europe/Paris",
            // "X-Debug-Options": "bugReporterEnabled",
            "Sec-GPC": "1",
            "Alt-Used": "discord.com",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "Priority": "u=0"
        },
        "referrer": `https://discord.com/channels/${guildId}/${channelId}`,
        "body": JSON.stringify({ content }),
        "method": "POST",
        "mode": "cors"
    });
}