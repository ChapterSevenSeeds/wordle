export default class Bimap<K, V> {
    private keyToValue = new Map<K, V>();
    private valueToKey = new Map<V, K>();

    set(key: K, value: V) {
        this.keyToValue.set(key, value);
        this.valueToKey.set(value, key);
    }

    getByKey(key: K) {
        return this.keyToValue.get(key);
    }

    getByValue(value: V) {
        return this.valueToKey.get(value);
    }

    [Symbol.iterator]() {
        return this.keyToValue[Symbol.iterator]();
    }
}