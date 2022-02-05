import log from '../logger';

export async function postFetch(url: string, body: any, accessToken: any) {
  const requestInit: RequestInit = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authentication: accessToken },
  };

  return fetch(`${url}`, requestInit);
  // const response = await fetch(`${url}`, requestInit);
  // let jsonResponse;
  // try {
  //   jsonResponse = await response.json();
  // } catch (err) {
  //   log.error(`postFetch returned an invalid json response`);
  //   throw err;
  // }

  // return Promise.resolve(jsonResponse);
}

// export function putFetch(){

// }

// export function getFetch(){

// }
