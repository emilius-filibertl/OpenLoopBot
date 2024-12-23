import axios from "axios";
import chalk from "chalk";
import { HttpsProxyAgent } from "https-proxy-agent";

import { readProxy } from "./readConfig.js";

const { red } = chalk;

const retry = async (retryCount) => {
  console.log(
    red(`Wait 2.5 seconds before retrying... (Retry #${retryCount})\n`)
  );

  await new Promise((resolve) => setTimeout(resolve, 2500));
};

const nodeInfo = async (token) => {
  const headers = {
    accept: "*/*",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9",
    authorization: `Bearer ${token}`,
    origin: "chrome-extension://effapmdildnpkiaeghlkicpfflpiambm",
    priority: "u=1, i",
    "sec-ch-ua": `"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"`,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": `"Windows"`,
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "sec-gpc": "1",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };

  const { username, password, hostname, port } = await readProxy();

  const proxy = `http://${username}:${password}@${hostname}:${port}`;

  const proxyAgent = new HttpsProxyAgent(proxy);

  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const response = await axios.get(
        "https://api.openloop.so/bandwidth/info",
        {
          headers: headers,
          httpsAgent: proxyAgent,
        }
      );

      const { status, data } = response;

      if (status === 200) {
        const { todayEarning, balances } = data.data;
        const { POINT } = balances;
        console.log(`Today's Earning: ${todayEarning}`);
        console.log(`Total: ${POINT}\n`);

        return;
      } else {
        // Error response 2xx
        console.log(red(`Error encountered during nodeInfo:`));
        console.log(red(`Status: ${status}`));
        console.log(red(`Message: ${data?.message || "Unknown error"}`));

        await retry(++retryCount);
      }
    } catch (error) {
      // Error response 4xx and 5xx etc
      console.log(red(`Error encountered during nodeInfo:`));

      if (error.response) {
        const { status, data } = error.response;

        // Response from server, handle error response status
        if (status === 401 || status === 403) {
          console.log(red(`Authentication Error: ${status}`));
          console.log(red(`Please check your token or credentials.\n`));
          // Stop retrying after authentication error
          return;
        }

        console.log(red(`Status: ${status}`));
        console.log(red(`Message: ${data?.message || "Unknown error"}`));
      } else {
        // Network or unknown error
        console.log(red(`Network or unknown error: ${error.message}`));
      }

      await retry(++retryCount);
    }
  }

  console.log(red(`Max retries reached. Giving up :(\n`));
};

export { nodeInfo };
