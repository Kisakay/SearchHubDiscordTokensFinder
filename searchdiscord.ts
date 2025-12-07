import { spawn } from 'child_process';

export async function searchDiscord(userId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      'https://searchhub.vip/api/search/discord',
      '--compressed',
      '-X', 'POST',
      '-H', 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0',
      '-H', 'Accept: application/json, text/plain, */*',
      '-H', 'Accept-Language: en-US,en;q=0.5',
      '-H', 'Accept-Encoding: gzip, deflate, br, zstd',
      '-H', 'Content-Type: application/json',
      '-H', 'Origin: https://searchhub.vip',
      '-H', 'DNT: 1',
      '-H', 'Sec-GPC: 1',
      '-H', 'Connection: keep-alive',
      '-H', 'Referer: https://searchhub.vip/search',
      '-H', `Cookie: cf_clearance=F3R.GggP95x79jANdxm0WEktSOccZGNdHv41Zpz3vbU-1765125005-1.2.1.1-51_f6xJtMFzgrYBwex8WrtUKFSLC.s0gJx9S_wNfi6z.G6gSwXsgNlYbexwh2vwEibPlrTTMbdXDSpgzMbRiWn671oUA1VGXkZax_UqHV4hLliJGfFB2d_OogolFaxdTGTIowN_KWuI9tZj4yNDLFMeEXixOaRmy6jAkUf7I2wgr4XMT80csYGcRCjLY.JN_Og.8ax8ZfDkErZhZsPEm6soDpVTixtXgiHH0GpL6wtVWaCXw9p_pSUxCIlTJZQOn; twk_uuid_68f6babba86dab1951b9aee2=%7B%22uuid%22%3A%221.1vXbHIVuyH40gItNtykKcP21AlFYUIZOJkjJHyOZlm1qFFnphPLnnAVeiwsXGSqDNEtgj71KhQWAEoVFNUv1HDE17wQRZecNDpNvyQhBv0vN8JMKAJuQ9Tn%22%2C%22version%22%3A3%2C%22domain%22%3A%22searchhub.vip%22%2C%22ts%22%3A1765127915108%7D; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTI5ODhjMDQzNDA2YTA0MTZkYjUwMDUiLCJpc0FkbWluIjpmYWxzZSwidG9rZW5JZCI6IjJiNmQ0MGFjLWQ1MmYtNDJjZi05NzIzLTJjMWJhYTk2N2Q0MSIsImlhdCI6MTc2NTAxNTA4NCwiZXhwIjoxNzY1NjE5ODg0fQ.C05jnBPBD3dss7ALpHbagTt_Y_-qtYInYojHMfMhqAk; twk_idm_key=eA13zyfS8XXEpFg_qQQR6; TawkConnectionTime=0`,
      '-H', 'Sec-Fetch-Dest: empty',
      '-H', 'Sec-Fetch-Mode: cors',
      '-H', 'Sec-Fetch-Site: same-origin',
      '-H', 'Priority: u=0',
      '--data-raw', JSON.stringify({ userId, timezoneOffsetMinutes: -60 }),
      '-s' // Silent mode (pas de progress bar)
    ]);

    let stdout = '';
    let stderr = '';

    curl.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    curl.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    curl.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`curl exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (e) {
        const error = e as Error;
        reject(new Error(`Failed to parse JSON: ${error.message}\nRaw output: ${stdout}`));
      }
    });

    curl.on('error', (err) => {
      reject(new Error(`Failed to spawn curl: ${err.message}`));
    });
  });
}
