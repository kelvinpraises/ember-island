let graphQLEndpoint = "https://api.stokefiregame.com";

export const fetcher = async (query: string) => {
  const response = await fetch(graphQLEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  return await response.json();
};
