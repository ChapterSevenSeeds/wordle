export default class LocalStorage {
    public static readonly CURRENT_LEVEL_KEY = 'currentLevel';
    public static readonly USED_WORDS_KEY = 'usedWords';

    public static get currentLevel() {
        const storageResult = LocalStorage.unsafeGetItem(LocalStorage.CURRENT_LEVEL_KEY);
        const parsedInt = parseInt(storageResult);
        return isNaN(parsedInt) ? 1 : parsedInt;
    }

    public static set currentLevel(value: number) {
        localStorage.setItem(LocalStorage.CURRENT_LEVEL_KEY, value.toString());
    }

    public static get usedWords() {
        return new Set(LocalStorage.unsafeGetItem(LocalStorage.USED_WORDS_KEY).split(',').filter(Boolean));
    }

    public static set usedWords(value: Set<string>) {
        localStorage.setItem(LocalStorage.USED_WORDS_KEY, Array.from(value).join(','));
    }

    private static unsafeGetItem(key: string) {
        return localStorage.getItem(key) ?? "";
    }
}