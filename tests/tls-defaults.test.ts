import { describe, expect, test } from 'bun:test';
import { installSystemCAs, type TlsCaSurface } from '../service/tls-defaults';

const DEFAULT_CAS = ['default-a', 'default-b'];
const SYSTEM_CAS = ['system-a', 'system-b'];
const MERGED = [...DEFAULT_CAS, ...SYSTEM_CAS];

type FakeOptions = {
  omitGet?: boolean;
  omitSet?: boolean;
  /** 'throws' simulates a platform trust store that cannot be read. */
  system?: 'ok' | 'throws';
  /** 'throws' simulates the setter rejecting the merged list. */
  set?: 'ok' | 'throws';
};

/** A TLS seam of plain functions, recording what the setter received. */
function fakeTls(options: FakeOptions = {}): {
  surface: TlsCaSurface;
  setCalls: Array<readonly string[]>;
  reports: string[];
} {
  const setCalls: Array<readonly string[]> = [];
  const reports: string[] = [];
  const surface: TlsCaSurface = {};

  if (!options.omitGet) {
    surface.getCACertificates = (type) => {
      if (type === 'system' && options.system === 'throws') {
        throw new Error('could not read the platform trust store');
      }
      return type === 'default' ? [...DEFAULT_CAS] : [...SYSTEM_CAS];
    };
  }
  if (!options.omitSet) {
    surface.setDefaultCACertificates = (certificates) => {
      setCalls.push(certificates);
      if (options.set === 'throws') throw new Error('could not install the certificates');
    };
  }

  return { surface, setCalls, reports };
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
    {
      name: 'keeps Node’s defaults when the system store cannot be read',
      options: { system: 'throws' },
      expectedSetCalls: [],
    },
    {
      name: 'does not throw when the setter rejects the merged list',
      options: { set: 'throws' },
      expectedSetCalls: [MERGED],
    },
  ];

  test.each(cases)('$name', ({ options, expectedSetCalls }) => {
    const { surface, setCalls, reports } = fakeTls(options);

    expect(() => installSystemCAs(surface, (line) => reports.push(line))).not.toThrow();

    expect(setCalls).toEqual(expectedSetCalls);
    expect(reports.length).toBeLessThanOrEqual(1);
    // A diagnostic is fixed text: it never carries a certificate.
    expect(reports.join('')).not.toContain('default-a');
    expect(reports.join('')).not.toContain('system-a');
  });

  test('a throwing diagnostic reporter never reaches the caller', () => {
    const { surface } = fakeTls({ system: 'throws' });

    expect(() =>
      installSystemCAs(surface, () => {
        throw new Error('stderr is gone');
      }),
    ).not.toThrow();
  });
});
