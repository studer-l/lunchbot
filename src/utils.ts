import { Database } from './database/database';
import logger from './logger';
import { Solver } from './solver/solver';

export async function mkSolverFromDb(
  db: Database,
  seed: number,
): Promise<Solver> {
  const mrlp = await db.readMostRecentLunchPairing();
  return new Solver(mrlp, 6, seed);
}

export function zip<A, B>(arr0: readonly A[], arr1: readonly B[]): [A, B][] {
  if (arr0.length < arr1.length) {
    return arr0.map((a, idx) => {
      return [a, arr1[idx]];
    });
  }

  return arr1.map((b, idx) => {
    return [arr0[idx], b];
  });
}

function getPending<A>(
  generator: AsyncGenerator<A>,
  idx: number,
): Promise<[IteratorResult<A>, number]> {
  return new Promise<[IteratorResult<A>, number]>((resolve, reject) => {
    generator
      .next()
      .then((iterResult) => resolve([iterResult, idx]))
      .catch(reject);
  });
}

export async function* asyncGenReduce<A>(
  generators: AsyncGenerator<A>[],
): AsyncGenerator<A> {
  const genMap = new Map<number, AsyncGenerator<A>>();
  const pendings = new Map<number, Promise<[IteratorResult<A>, number]>>();
  generators.forEach((gen, idx) => {
    genMap.set(idx, gen);
    pendings.set(idx, getPending(gen, idx));
  });

  while (pendings.size > 0) {
    const [iterResult, idx] = await Promise.any(pendings.values());
    if (iterResult.done) {
      pendings.delete(idx);
      logger.info('single async generator done', {
        idx,
        iterResult,
        orginalSize: genMap.size,
        pendings,
      });
    } else {
      pendings.set(idx, getPending(genMap.get(idx)!, idx));
      yield iterResult.value;
    }
  }
  logger.silly('asyncGenReduce done');
}

export class CancelToken {
  private impl: Promise<void>;
  cancel: () => void;

  constructor() {
    this.cancel = () => {
      logger.error('logic error');
    };
    this.impl = new Promise((accept) => {
      this.cancel = accept;
    });
  }

  async done() {
    await this.impl;
  }
}
