import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { bundleFiles } from './bundler';
import { AtcError } from './errors';

process.env.ATC_LOCALE = 'en';

describe('bundler', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'atc-bundler-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('basic C++ bundling and double-quote include expansion', () => {
    const headerPath = path.join(tempDir, 'header.hpp');
    const mainPath = path.join(tempDir, 'main.cpp');
    const outputPath = path.join(tempDir, 'bundle.cpp');

    fs.writeFileSync(headerPath, `
#pragma once
int add(int a, int b) {
    return a + b;
}
`.trim());

    fs.writeFileSync(mainPath, `
#include <iostream>
#include "header.hpp"

int main() {
    std::cout << add(2, 3) << std::endl;
}
`.trim());

    bundleFiles([mainPath], outputPath);

    const bundledContent = fs.readFileSync(outputPath, 'utf8');
    expect(bundledContent).toContain('int add(int a, int b)');
    expect(bundledContent).toContain('#include <iostream>');
    expect(bundledContent).not.toContain('#pragma once');
    expect(bundledContent).not.toContain('#include "header.hpp"');
  });

  test('prevents multiple inclusions (visited path check)', () => {
    const aPath = path.join(tempDir, 'a.hpp');
    const bPath = path.join(tempDir, 'b.hpp');
    const mainPath = path.join(tempDir, 'main.cpp');
    const outputPath = path.join(tempDir, 'bundle.cpp');

    fs.writeFileSync(aPath, `
#pragma once
struct A {};
`.trim());

    fs.writeFileSync(bPath, `
#pragma once
#include "a.hpp"
struct B {};
`.trim());

    fs.writeFileSync(mainPath, `
#include "a.hpp"
#include "b.hpp"
`.trim());

    bundleFiles([mainPath], outputPath);

    const bundledContent = fs.readFileSync(outputPath, 'utf8');
    // 'struct A {}' should appear exactly once
    const aCount = (bundledContent.match(/struct A \{\}/g) || []).length;
    expect(aCount).toBe(1);
    expect(bundledContent).toContain('struct B {};');
  });

  test('does not expand imports in comments', () => {
    const mainPath = path.join(tempDir, 'main.cpp');
    const outputPath = path.join(tempDir, 'bundle.cpp');

    fs.writeFileSync(mainPath, `
// #include "nonexistent.hpp"
/*
#include "nonexistent2.hpp"
*/
/* start */ #include "nonexistent3.hpp" /* end */ // wait, this contains code/comments. But it starts with '/* start */' which isn't '#' as first non-whitespace
`.trim());

    // Should not throw file-not-found errors since the includes are inside comments and shouldn't be expanded
    expect(() => bundleFiles([mainPath], outputPath)).not.toThrow();
  });

  test('throws circular dependency error', () => {
    const aPath = path.join(tempDir, 'a.hpp');
    const bPath = path.join(tempDir, 'b.hpp');

    fs.writeFileSync(aPath, '#include "b.hpp"');
    fs.writeFileSync(bPath, '#include "a.hpp"');

    expect(() => bundleFiles([aPath], path.join(tempDir, 'out.cpp'))).toThrow(AtcError);
    expect(() => bundleFiles([aPath], path.join(tempDir, 'out.cpp'))).toThrow(/Circular dependency detected/);
  });

  test('can bundle multiple input files sequentially', () => {
    const f1 = path.join(tempDir, 'f1.cpp');
    const f2 = path.join(tempDir, 'f2.cpp');
    const outputPath = path.join(tempDir, 'bundle.cpp');

    fs.writeFileSync(f1, 'int x = 1;');
    fs.writeFileSync(f2, 'int y = 2;');

    bundleFiles([f1, f2], outputPath);

    const bundledContent = fs.readFileSync(outputPath, 'utf8');
    expect(bundledContent).toBe('int x = 1;\nint y = 2;\n');
  });

  test('throws error for unsupported file types', () => {
    const unsupportedFile = path.join(tempDir, 'main.txt');
    fs.writeFileSync(unsupportedFile, 'some text');
    expect(() => bundleFiles([unsupportedFile], path.join(tempDir, 'out.cpp'))).toThrow(AtcError);
    expect(() => bundleFiles([unsupportedFile], path.join(tempDir, 'out.cpp'))).toThrow(/Unsupported file type/);
  });

  test('throws error if input file and output file paths are the same', () => {
    const f1 = path.join(tempDir, 'main.cpp');
    fs.writeFileSync(f1, 'int main() {}');
    expect(() => bundleFiles([f1], f1)).toThrow(AtcError);
    expect(() => bundleFiles([f1], f1)).toThrow(/cannot be the same/);
  });

  describe('JS/TS Bundling via esbuild', () => {
    test('basic TypeScript bundling with type stripping', () => {
      const mainPath = path.join(tempDir, 'main.ts');
      const outputPath = path.join(tempDir, 'bundle.js');

      fs.writeFileSync(mainPath, `
        interface User {
          name: string;
          age: number;
        }
        const greet = (u: User): string => {
          return \`Hello, \${u.name}!\`;
        };
        console.log(greet({ name: 'Alice', age: 20 }));
      `.trim());

      bundleFiles([mainPath], outputPath);

      const bundledContent = fs.readFileSync(outputPath, 'utf8');
      expect(bundledContent).toContain('console.log(greet({ name: "Alice", age: 20 }));');
      // Types should be stripped
      expect(bundledContent).not.toContain('interface User');
      expect(bundledContent).not.toContain('u: User');
    });

    test('bundles imported local modules', () => {
      const helperPath = path.join(tempDir, 'helper.ts');
      const mainPath = path.join(tempDir, 'main.ts');
      const outputPath = path.join(tempDir, 'bundle.js');

      fs.writeFileSync(helperPath, `
        export function add(a: number, b: number): number {
          return a + b;
        }
      `.trim());

      fs.writeFileSync(mainPath, `
        import { add } from './helper';
        console.log(add(10, 20));
      `.trim());

      bundleFiles([mainPath], outputPath);

      const bundledContent = fs.readFileSync(outputPath, 'utf8');
      expect(bundledContent).toContain('console.log(add(10, 20));');
      // Helper function content should be inline
      expect(bundledContent).toContain('function add(a, b)');
      expect(bundledContent).not.toContain("import { add } from './helper';");
    });

    test('externalizes Node.js built-in modules', () => {
      const mainPath = path.join(tempDir, 'main.ts');
      const outputPath = path.join(tempDir, 'bundle.js');

      fs.writeFileSync(mainPath, `
        import * as fs from 'fs';
        import * as path from 'path';
        console.log(fs.readFileSync(path.join('test.txt'), 'utf8'));
      `.trim());

      bundleFiles([mainPath], outputPath);

      const bundledContent = fs.readFileSync(outputPath, 'utf8');
      // Built-ins should be externalized (required)
      expect(bundledContent).toContain('require("fs")');
      expect(bundledContent).toContain('require("path")');
    });

    test('throws error on syntax or resolution error', () => {
      const mainPath = path.join(tempDir, 'main.ts');
      const outputPath = path.join(tempDir, 'bundle.js');

      // Syntax error
      fs.writeFileSync(mainPath, `
        const a = ;
      `.trim());

      expect(() => bundleFiles([mainPath], outputPath)).toThrow(AtcError);
      expect(() => bundleFiles([mainPath], outputPath)).toThrow(/Failed to bundle JS\/TS file/);
    });

    test('throws error if file not found', () => {
      const mainPath = path.join(tempDir, 'nonexistent.ts');
      const outputPath = path.join(tempDir, 'bundle.js');

      expect(() => bundleFiles([mainPath], outputPath)).toThrow(AtcError);
      expect(() => bundleFiles([mainPath], outputPath)).toThrow(/File not found/);
    });

    test('passes extra options to esbuild', () => {
      const mainPath = path.join(tempDir, 'main.ts');
      const outputPath = path.join(tempDir, 'bundle.js');

      fs.writeFileSync(mainPath, `
        console.log("Hello, world!");
      `.trim());

      // Minify should be applied via extraArgs
      bundleFiles([mainPath], outputPath, undefined, ['--minify']);

      const bundledContent = fs.readFileSync(outputPath, 'utf8');
      expect(bundledContent.trim().length).toBeLessThan(120);
      expect(bundledContent).toContain('console.log("Hello, world!");');
    });

    test('sourcemap is generated as inline when --sourcemap=inline is passed', () => {
      const mainPath = path.join(tempDir, 'main.ts');
      const outputPath = path.join(tempDir, 'bundle.js');

      fs.writeFileSync(mainPath, `
        console.log("Hello");
      `.trim());

      bundleFiles([mainPath], outputPath, undefined, ['--sourcemap=inline']);

      const bundledContent = fs.readFileSync(outputPath, 'utf8');
      expect(bundledContent).toContain('//# sourceMappingURL=data:application/json;base64');
    });
  });

  describe('Python Bundling', () => {
    test('basic module import and sys.modules injection', () => {
      const helperPath = path.join(tempDir, 'helper.py');
      const mainPath = path.join(tempDir, 'main.py');
      const outputPath = path.join(tempDir, 'bundle.py');

      fs.writeFileSync(helperPath, `
def add(a, b):
    return a + b
      `.trim());

      fs.writeFileSync(mainPath, `
import helper
print(helper.add(3, 5))
      `.trim());

      bundleFiles([mainPath], outputPath);

      const bundledContent = fs.readFileSync(outputPath, 'utf8');
      expect(bundledContent).toContain('import sys, base64');
      expect(bundledContent).toContain('sys.modules["helper"] =');
      expect(bundledContent).toContain('print(helper.add(3, 5))');

      // If python3 is available locally, run it to verify
      const { spawnSync } = require('child_process');
      const pyCheck = spawnSync('python3', ['--version']);
      if (pyCheck.status === 0) {
        const runResult = spawnSync('python3', [outputPath], { encoding: 'utf8' });
        expect(runResult.status).toBe(0);
        expect(runResult.stdout.trim()).toBe('8');
      }
    });

    test('nested module inside package and import from', () => {
      const pkgDir = path.join(tempDir, 'pkg');
      fs.mkdirSync(pkgDir);
      
      const initPath = path.join(pkgDir, '__init__.py');
      const subPath = path.join(pkgDir, 'sub.py');
      const mainPath = path.join(tempDir, 'main.py');
      const outputPath = path.join(tempDir, 'bundle.py');

      fs.writeFileSync(initPath, `
# package init
      `.trim());

      fs.writeFileSync(subPath, `
def greet(name):
    return f"Hello, {name}!"
      `.trim());

      fs.writeFileSync(mainPath, `
from pkg.sub import greet
print(greet("AtCoder"))
      `.trim());

      bundleFiles([mainPath], outputPath);

      const bundledContent = fs.readFileSync(outputPath, 'utf8');
      expect(bundledContent).toContain('sys.modules["pkg"] =');
      expect(bundledContent).toContain('sys.modules["pkg.sub"] =');
      expect(bundledContent).toContain('setattr(sys.modules["pkg"], "sub",');

      // Verify execution
      const { spawnSync } = require('child_process');
      const pyCheck = spawnSync('python3', ['--version']);
      if (pyCheck.status === 0) {
        const runResult = spawnSync('python3', [outputPath], { encoding: 'utf8' });
        expect(runResult.status).toBe(0);
        expect(runResult.stdout.trim()).toBe('Hello, AtCoder!');
      }
    });

    test('ignores standard library and external imports', () => {
      const mainPath = path.join(tempDir, 'main.py');
      const outputPath = path.join(tempDir, 'bundle.py');

      fs.writeFileSync(mainPath, `
import sys
import math
from collections import Counter
print(math.sqrt(16))
      `.trim());

      bundleFiles([mainPath], outputPath);

      const bundledContent = fs.readFileSync(outputPath, 'utf8');
      expect(bundledContent).not.toContain('sys.modules["sys"] =');
      expect(bundledContent).not.toContain('sys.modules["math"] =');
      expect(bundledContent).not.toContain('sys.modules["collections"] =');
    });

    test('throws circular dependency error', () => {
      const aPath = path.join(tempDir, 'a.py');
      const bPath = path.join(tempDir, 'b.py');

      fs.writeFileSync(aPath, 'import b');
      fs.writeFileSync(bPath, 'import a');

      expect(() => bundleFiles([aPath], path.join(tempDir, 'out.py'))).toThrow(AtcError);
      expect(() => bundleFiles([aPath], path.join(tempDir, 'out.py'))).toThrow(/Circular dependency detected/);
    });
  });

  describe('Rust Bundling', () => {
    test('basic module expansion', () => {
      const helperPath = path.join(tempDir, 'helper.rs');
      const mainPath = path.join(tempDir, 'main.rs');
      const outputPath = path.join(tempDir, 'bundle.rs');

      fs.writeFileSync(helperPath, `
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
      `.trim());

      fs.writeFileSync(mainPath, `
mod helper;

fn main() {
    println!("{}", helper::add(2, 3));
}
      `.trim());

      bundleFiles([mainPath], outputPath);

      const bundledContent = fs.readFileSync(outputPath, 'utf8');
      expect(bundledContent).toContain('pub fn add(a: i32, b: i32) -> i32');
      expect(bundledContent).toContain('mod helper {');
      expect(bundledContent).toContain('println!("{}", helper::add(2, 3));');
      expect(bundledContent).not.toContain('mod helper;');
    });

    test('nested module resolution in subdirectory', () => {
      const fooDir = path.join(tempDir, 'foo');
      fs.mkdirSync(fooDir);

      const fooInitPath = path.join(fooDir, 'mod.rs');
      const barPath = path.join(fooDir, 'bar.rs');
      const mainPath = path.join(tempDir, 'main.rs');
      const outputPath = path.join(tempDir, 'bundle.rs');

      fs.writeFileSync(fooInitPath, `
pub mod bar;
      `.trim());

      fs.writeFileSync(barPath, `
pub fn greet() {
    println!("Hello from bar");
}
      `.trim());

      fs.writeFileSync(mainPath, `
pub mod foo;

fn main() {
    foo::bar::greet();
}
      `.trim());

      bundleFiles([mainPath], outputPath);

      const bundledContent = fs.readFileSync(outputPath, 'utf8');
      expect(bundledContent).toContain('pub mod foo {');
      expect(bundledContent).toContain('pub mod bar {');
      expect(bundledContent).toContain('pub fn greet() {');
    });

    test('throws circular dependency error', () => {
      const mainPath = path.join(tempDir, 'main.rs');

      fs.writeFileSync(mainPath, 'mod main;');

      expect(() => bundleFiles([mainPath], path.join(tempDir, 'out.rs'))).toThrow(AtcError);
      expect(() => bundleFiles([mainPath], path.join(tempDir, 'out.rs'))).toThrow(/Circular dependency detected/);
    });

    test('ignores inline modules and external mod references without files', () => {
      const mainPath = path.join(tempDir, 'main.rs');
      const outputPath = path.join(tempDir, 'bundle.rs');

      fs.writeFileSync(mainPath, `
mod inline_mod {
    fn test() {}
}
// This mod does not exist, but should be ignored because no file is found and modRegex doesn't match inline
mod nonexistent_without_semicolon {
}
      `.trim());

      bundleFiles([mainPath], outputPath);

      const bundledContent = fs.readFileSync(outputPath, 'utf8');
      expect(bundledContent).toContain('mod inline_mod {');
      expect(bundledContent).toContain('mod nonexistent_without_semicolon {');
    });
  });
});
