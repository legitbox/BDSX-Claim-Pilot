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

export function registerEvent(id: string, callback: any) {
    let info = registeredEvents.get(id);
    if (info === undefined) {
        console.log(id);
        throw 'ERROR: Event Type doesn\'t exist!';
    }

    info.registeredCallbacks.push(callback);
}

export function fireEvent(id: string, data: any): boolean {
    const info = registeredEvents.get(id);
    if (info === undefined) {
        return true;
    }

    const res = info.namespace.handleFireCallbacks(info.registeredCallbacks, data);
    if (info.namespace.CANCELABLE) {
        return res;
    } else {
        return true;
    }
}