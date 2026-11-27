import { describe, expect, test } from 'bun:test';
import { installSystemCAs, type TlsCaSurface } from '../service/tls-defaults';

const DEFAULT_CAS = ['default-a', 'default-b'];
const SYSTEM_CAS = ['system-a', 'system-b'];
const MERGED = [...DEFAULT_CAS, ...SYSTEM_CAS];

type FakeOptions = {
  omitGet?: boolean;
  omitSet?: boolean;
};

/** A TLS seam of plain functions, recording what the setter received. */
function fakeTls(options: FakeOptions = {}): {
  surface: TlsCaSurface;
  setCalls: Array<readonly string[]>;
} {
  const setCalls: Array<readonly string[]> = [];
  const surface: TlsCaSurface = {};

  if (!options.omitGet) {
    surface.getCACertificates = (type) => (type === 'default' ? [...DEFAULT_CAS] : [...SYSTEM_CAS]);
  }
  if (!options.omitSet) {
    surface.setDefaultCACertificates = (certificates) => {
      setCalls.push(certificates);
    };
  }

  return { surface, setCalls };
}

describe('installSystemCAs', () => {
  const cases: Array<{
    name: string;
    options?: FakeOptions;
    expectedSetCalls: Array<readonly string[]>;
  }> = [
    {
      name: 'sets the default certificates first, then the system ones',
      expectedSetCalls: [MERGED],
    },
    {
      name: 'is a no-op without getCACertificates',
      options: { omitGet: true },
      expectedSetCalls: [],
    },
    {
      name: 'is a no-op without setDefaultCACertificates',
      options: { omitSet: true },
      expectedSetCalls: [],
    },
  ];

  test.each(cases)('$name', ({ options, expectedSetCalls }) => {
    const { surface, setCalls } = fakeTls(options);

    installSystemCAs(surface);

    expect(setCalls).toEqual(expectedSetCalls);
  });
});
