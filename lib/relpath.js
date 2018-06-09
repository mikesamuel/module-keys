/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview
 * Path twiddling utilities like {@code require('path')}
 * but decoupled from monkeypatchable intrinsics like
 * {@code String.prototype.charCodeAt}.
 * This makes them a better basis for granting decisions.
 */

'use strict';

const { sep } = require('path');
const { apply } = Reflect;
const { indexOf, lastIndexOf, substring } = String.prototype;
const { max, min } = Math;

function basename(path) {
  path = `${ path }`;
  return apply(substring, path, [ apply(lastIndexOf, path, [ sep ]) + 1 ]);
}

function dirname(path) {
  path = `${ path }`;
  const i = apply(lastIndexOf, path, [ sep ]);
  return i >= 0 ? apply(substring, path, [ 0, i ]) : '';
}

/** foo/./bar/..///baz -> foo/baz */
function dedot(path) { // eslint-disable-line complexity
  const inpath = `${ path }`;
  let outpath = '';
  const len = inpath.length;

  // Walk over segment by segment.
  // Accumulate output onto outpath.

  // i is the index past last sep considered.
  let i = 0;
  if (len && inpath[0] === sep) {
    outpath = sep;
    i = 1;
  }
  const rootLength = outpath.length;

  for (let nextSep; i < len; i = nextSep + 1) {
    nextSep = apply(indexOf, inpath, [ sep, i ]);
    if (nextSep < 0) {
      nextSep = len;
    }
    const segmentLen = nextSep - i;
    switch (segmentLen) {
      case 0:
        continue;
      case 1:
        if (inpath[i] === '.') {
          continue;
        }
        break;
      case 2:
        if (inpath[i] === '.' && inpath[i + 1] === '.') {
          const lastOutSep = apply(lastIndexOf, outpath, [ sep ]);
          outpath = apply(substring, outpath, [ 0, max(rootLength, lastOutSep) ]);
          continue;
        }
        break;
      default:
        break;
    }
    const segment = apply(substring, inpath, [ i, nextSep ]);
    outpath = outpath + (outpath.length > rootLength ? sep : '') + segment;
  }

  return outpath;
}

// Longest common prefix that ends on a path element boundary.
// Each input is assumed to end with an implicit path separator.
function longestCommonPathPrefix(stra, strb) {
  const minlen = min(stra.length, strb.length);
  let common = 0;
  let lastSep = -1;
  for (; common < minlen; ++common) {
    const chr = stra[common];
    if (chr !== strb[common]) {
      break;
    }
    if (chr === sep) {
      lastSep = common;
    }
  }
  if (common === minlen &&
      (stra.length === minlen ?
        strb.length === minlen || strb[minlen] === sep :
        stra[minlen] === sep)) {
    return minlen + 1;
  }
  return lastSep + 1;
}

/**
 * A path to absFile relative to base.
 * This is a string transform so is independent of the
 * symlink and hardlink structure of the file-system.
 *
 * @param {string} base an absolute path
 * @param {string} absPath an absolute path
 * @return {string} a relative path that starts with '.'
 *     such that {@code path.join(base, output) === absPath}
 *     modulo dot path segments in absPath.
 */
function relpath(basePath, absPath) {
  let base = dedot(basePath);
  let abs = dedot(absPath);
  // Find the longest common prefix that ends with a separator.
  const commonPrefix = longestCommonPathPrefix(base, abs);
  // Remove the common path elements.
  base = apply(substring, base, [ commonPrefix ]);
  abs = apply(substring, abs, [ commonPrefix ]);
  // For each path element in base, output "/..".
  let rel = '.';
  if (base) {
    rel = '..';
    for (let i = 0; (i = apply(indexOf, base, [ sep, i ])) >= 0; ++i) {
      rel = `${ rel }/..`;
    }
  }
  // Append abs.
  if (abs) {
    rel += sep + abs;
  }
  return rel;
}

module.exports = Object.freeze({
  basename,
  dedot,
  dirname,
  relpath,
});
