import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolveLocale, translate, messages, itemCount } from '../src/lib/i18n';
import { errorCode, localizedError, errors } from '../src/lib/error-messages';

test('saved locale wins; browser preferences respect language priorities',()=>{
  assert.equal(resolveLocale('uk','en-US,en;q=0.9'),'uk');
  assert.equal(resolveLocale('en','uk-UA'),'en');
  assert.equal(resolveLocale(undefined,'uk-UA,uk;q=0.9,en;q=0.8'),'uk');
  assert.equal(resolveLocale(undefined,'en;q=0.3,uk;q=0.9'),'uk');
  assert.equal(resolveLocale('invalid','de-DE,en;q=0.8'),'en');
  assert.equal(resolveLocale(undefined,'uk;q=0,en;q=0.9'),'en');
  assert.equal(resolveLocale(undefined,''),'en');
});
test('every message has both languages and matching interpolation placeholders',()=>{
  for(const [key,[uk,en]] of Object.entries(messages)){
    assert.ok(uk.length&&en.length,key);
    assert.deepEqual(uk.match(/\{\w+\}/g)||[],en.match(/\{\w+\}/g)||[],key);
  }
  assert.equal(translate('en','editNamed',{name:'Пазли'}),'Edit: Пазли');
  assert.equal(translate('uk','editNamed',{name:'Puzzle'}),'Редагувати: Puzzle');
  assert.equal(itemCount('en',1),'1 item');assert.equal(itemCount('en',5),'5 items');
  assert.equal(itemCount('uk',1),'1 річ');assert.equal(itemCount('uk',2),'2 речі');assert.equal(itemCount('uk',5),'5 речей');
});
test('server error codes can change language without losing specific meaning',()=>{
  for(const [code,[uk,en]] of Object.entries(errors)){
    assert.equal(errorCode(uk),code);
    assert.equal(localizedError('uk',code),uk);
    assert.equal(localizedError('en',code),en);
    assert.equal(localizedError('en',uk),en);
  }
  assert.equal(localizedError('en','unknown internal error'),errors.OPERATION_FAILED[1]);
});
test('all explicitly exposed server and photo-validation errors have translations',async()=>{
  const root=new URL('../src/server/',import.meta.url);
  const files=(await readdir(root)).filter(name=>name.endsWith('.ts')).map(name=>new URL(name,root));
  files.push(new URL('../src/app/api/[...path]/route.ts',import.meta.url),new URL('../src/lib/image-compression.ts',import.meta.url));
  const originals=new Set(Object.values(errors).map(pair=>pair[0] as string));
  for(const file of files){
    const source=await readFile(file,'utf8');
    for(const match of source.matchAll(/(?:new AppError\(\d+,\s*|new Error\(|error:\s*)'([^']*[А-Яа-яІіЇїЄєҐґ][^']*)'/g))assert.ok(originals.has(match[1]),`${file.pathname}: ${match[1]}`);
  }
});
