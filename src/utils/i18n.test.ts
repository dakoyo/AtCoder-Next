import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSystemLocale, getLocale, t } from './i18n';
import * as configStore from '../config';

describe('i18n utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getSystemLocale', () => {
    it('should return ja if process.env.LANG contains ja', () => {
      process.env.LANG = 'ja_JP.UTF-8';
      expect(getSystemLocale()).toBe('ja');
    });

    it('should return ja if process.env.LANGUAGE contains ja', () => {
      process.env.LANG = 'en_US.UTF-8';
      process.env.LANGUAGE = 'ja';
      expect(getSystemLocale()).toBe('ja');
    });

    it('should return en if no japanese env variable is found', () => {
      process.env.LANG = 'en_US.UTF-8';
      process.env.LANGUAGE = 'en';
      expect(getSystemLocale()).toBe('en');
    });
  });

  describe('getLocale', () => {
    it('should check configuration first', () => {
      const spy = vi.spyOn(configStore, 'loadConfig').mockReturnValue({
        defaultLanguage: 'cpp',
        languages: {},
        testDirName: 'tests',
        lang: 'ja'
      });

      const locale = getLocale('/some/root');
      expect(locale).toBe('ja');
      spy.mockRestore();
    });

    it('should fall back to system locale if config is empty', () => {
      const spy = vi.spyOn(configStore, 'loadConfig').mockReturnValue({
        defaultLanguage: 'cpp',
        languages: {},
        testDirName: 'tests'
      });
      process.env.LANG = 'ja_JP.UTF-8';

      const locale = getLocale('/some/root');
      expect(locale).toBe('ja');
      spy.mockRestore();
    });
  });

  describe('t translation helper', () => {
    it('should translate simple keys', () => {
      expect(t('initIntro', 'en')).toBe('AtCoder Next - Workspace Initialization');
      expect(t('initIntro', 'ja')).toBe('AtCoder Next - ワークスペース初期化');
    });

    it('should translate function keys with arguments', () => {
      expect(t('initCreatedConfig', 'en', 'cpp')).toContain('default language: cpp');
      expect(t('initCreatedConfig', 'ja', 'cpp')).toContain('デフォルト言語: cpp');
    });
  });
});
