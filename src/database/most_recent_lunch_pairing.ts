import { Client } from 'pg';
import {
  MostRecentLunchPairing,
  deserialize,
} from '../solver/most_recent_lunch_pairing';

export async function readMostRecentLunchPairing(
  client: Client,
): Promise<MostRecentLunchPairing> {
  const result = await client.query(
    'SELECT cache FROM most_recent_lunch_pairing_cache WHERE id = 0',
  );
  const cache = result.rows[0].cache;
  return deserialize(cache);
}

export async function writeMostRecentLunchPairing(
  client: Client,
  mrlp: MostRecentLunchPairing,
) {
  await client.query(
    `
    UPDATE
      most_recent_lunch_pairing_cache
    SET
      cache = $1
    WHERE
     id = 0
  `,
    [mrlp],
  );
}
