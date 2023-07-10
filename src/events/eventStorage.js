"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fireEvent = exports.registerEvent = exports.registerEventType = exports.EventInfo = void 0;
class EventInfo {
    constructor(namespace) {
        this.namespace = namespace;
        this.registeredCallbacks = [];
    }
}
exports.EventInfo = EventInfo;
function registerEventType(namespace) {
    const info = new EventInfo(namespace);
    registeredEvents.set(namespace.ID, info);
}
exports.registerEventType = registerEventType;
const registeredEvents = new Map();
const cachedCallbacks = new Map();
function registerEvent(id, callback) {
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
exports.registerEvent = registerEvent;
function fireEvent(id, data) {
    const info = registeredEvents.get(id);
    if (info === undefined) {
        return true;
    }
    if (info.namespace.ASYNC_ALLOWED) {
        return new Promise(async (resolve) => {
            let res = await info.namespace.handleFireCallbacks(info.registeredCallbacks, data);
            if (info.namespace.CANCELABLE) {
                resolve(res);
            }
            else {
                resolve(true);
            }
        });
    }
    else {
        const res = info.namespace.handleFireCallbacks(info.registeredCallbacks, data);
        if (info.namespace.CANCELABLE) {
            return res;
        }
        else {
            return true;
        }
    }
}
exports.fireEvent = fireEvent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRTdG9yYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXZlbnRTdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQWEsU0FBUztJQUlsQixZQUFZLFNBQWM7UUFDdEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0NBQ0o7QUFSRCw4QkFRQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLFNBQWM7SUFDNUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFdEMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUpELDhDQUlDO0FBRUQsTUFBTSxnQkFBZ0IsR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUMzRCxNQUFNLGVBQWUsR0FBdUIsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUV0RCxTQUFnQixhQUFhLENBQUMsRUFBVSxFQUFFLFFBQWE7SUFDbkQsSUFBSSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BDLElBQUksS0FBSyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEMsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO1FBQ3BCLHVEQUF1RDtRQUN2RCxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7WUFDckIsS0FBSyxHQUFHLEVBQUUsQ0FBQztTQUNkO1FBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVyQixlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQixPQUFPO0tBQ1Y7SUFFRCxJQUFJLEtBQUssS0FBSyxTQUFTLEVBQUU7UUFDckIsS0FBSyxNQUFNLFFBQVEsSUFBSSxLQUFLLEVBQUU7WUFDMUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztTQUMzQztLQUNKO0lBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBdEJELHNDQXNCQztBQUVELFNBQWdCLFNBQVMsQ0FBQyxFQUFVLEVBQUUsSUFBUztJQUMzQyxNQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdEMsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO1FBQ3BCLE9BQU8sSUFBSSxDQUFDO0tBQ2Y7SUFFRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFO1FBQzlCLE9BQU8sSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ2pDLElBQUksR0FBRyxHQUF3QixNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3hHLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUU7Z0JBQzNCLE9BQU8sQ0FBQyxHQUFJLENBQUMsQ0FBQzthQUNqQjtpQkFBTTtnQkFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDakI7UUFDTCxDQUFDLENBQUMsQ0FBQTtLQUNMO1NBQU07UUFDSCxNQUFNLEdBQUcsR0FBd0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEcsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRTtZQUMzQixPQUFPLEdBQUksQ0FBQztTQUNmO2FBQU07WUFDSCxPQUFPLElBQUksQ0FBQztTQUNmO0tBQ0o7QUFDTCxDQUFDO0FBdkJELDhCQXVCQyJ9