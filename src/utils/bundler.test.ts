import { describe, test, beforeEach, afterEach, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { bundleFiles } from './bundler';
import { AtcError } from './errors';

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
});
