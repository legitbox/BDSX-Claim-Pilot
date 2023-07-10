export class EventInfo {
    namespace: any;
    registeredCallbacks: any[];

    constructor(namespace: any) {
        this.namespace = namespace;
        this.registeredCallbacks = [];
    }
}

export function registerEventType(namespace: any) {
    const info = new EventInfo(namespace);

    registeredEvents.set(namespace.ID, info);
}

const registeredEvents: Map<string, EventInfo> = new Map();
const cachedCallbacks: Map<string, any[]> = new Map();

export function registerEvent(id: string, callback: any) {
    let info = registeredEvents.get(id);
    let cache = cachedCallbacks.get(id);
    if (info === undefined) {
        // Event Type hasn't been registered yet! Caching it...
        if (cache === undefined) {
            cache = [];
        }

        cache.push(callback);

        cachedCallbacks.set(id, cache);
        return;
    }

    if (cache !== undefined) {
        for (const callback in cache) {
            info.registeredCallbacks.push(callback);
        }
    }

    info.registeredCallbacks.push(callback);
}

export function fireEvent(id: string, data: any): boolean {
    const info = registeredEvents.get(id);
    if (info === undefined) {
        return true;
    }

    const res: boolean | undefined = info.namespace.handleFireCallbacks(info.registeredCallbacks, data);
    if (info.namespace.CANCELABLE) {
        return res!;
    } else {
        return true;
    }
}
