
import { describe, it, equals } from "../src/Spec.ts";
import { sh } from "../src/Shell.ts";


// =============================================================================
describe('da.ts --help');

it('runs: da.ts --help', async () => {
  const actual = await sh('da.ts --help', 'piped', 'inherit', false);

  equals(actual.code, 0)
});
