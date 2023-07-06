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
        throw `ERROR: Event Type ${id} doesn't exist!`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRTdG9yYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXZlbnRTdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQWEsU0FBUztJQUlsQixZQUFZLFNBQWM7UUFDdEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFDM0IsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0NBQ0o7QUFSRCw4QkFRQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLFNBQWM7SUFDNUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFdEMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDN0MsQ0FBQztBQUpELDhDQUlDO0FBRUQsTUFBTSxnQkFBZ0IsR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUUzRCxTQUFnQixhQUFhLENBQUMsRUFBVSxFQUFFLFFBQWE7SUFDbkQsSUFBSSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BDLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtRQUNwQixNQUFNLHFCQUFxQixFQUFFLGlCQUFpQixDQUFDO0tBQ2xEO0lBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBUEQsc0NBT0M7QUFFRCxTQUFnQixTQUFTLENBQUMsRUFBVSxFQUFFLElBQVM7SUFDM0MsTUFBTSxJQUFJLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RDLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRTtRQUNwQixPQUFPLElBQUksQ0FBQztLQUNmO0lBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0UsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRTtRQUMzQixPQUFPLEdBQUcsQ0FBQztLQUNkO1NBQU07UUFDSCxPQUFPLElBQUksQ0FBQztLQUNmO0FBQ0wsQ0FBQztBQVpELDhCQVlDIn0=