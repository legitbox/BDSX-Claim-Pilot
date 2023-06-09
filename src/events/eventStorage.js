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
function registerEvent(id, callback) {
    let info = registeredEvents.get(id);
    if (info === undefined) {
        console.log(id);
        throw 'ERROR: Event Type doesn\'t exist!';
    }
    info.registeredCallbacks.push(callback);
}
exports.registerEvent = registerEvent;
function fireEvent(id, data) {
    const info = registeredEvents.get(id);
    if (info === undefined) {
        return true;
    }
    const res = info.namespace.handleFireCallbacks(info.registeredCallbacks, data);
    if (info.namespace.CANCELABLE) {
        return res;
    }
    else {
        return true;
    }
}
exports.fireEvent = fireEvent;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRTdG9yYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXZlbnRTdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQWEsU0FBUztJQUlsQixZQUFZLFNBQWM7UUFDdEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0NBQ0o7QUFSRCw4QkFRQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLFNBQWM7SUFDNUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFdEMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUpELDhDQUlDO0FBRUQsTUFBTSxnQkFBZ0IsR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUUzRCxTQUFnQixhQUFhLENBQUMsRUFBVSxFQUFFLFFBQWE7SUFDbkQsSUFBSSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BDLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtRQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hCLE1BQU0sbUNBQW1DLENBQUM7S0FDN0M7SUFFRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFSRCxzQ0FRQztBQUVELFNBQWdCLFNBQVMsQ0FBQyxFQUFVLEVBQUUsSUFBUztJQUMzQyxNQUFNLElBQUksR0FBRyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdEMsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFO1FBQ3BCLE9BQU8sSUFBSSxDQUFDO0tBQ2Y7SUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvRSxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFO1FBQzNCLE9BQU8sR0FBRyxDQUFDO0tBQ2Q7U0FBTTtRQUNILE9BQU8sSUFBSSxDQUFDO0tBQ2Y7QUFDTCxDQUFDO0FBWkQsOEJBWUMifQ==