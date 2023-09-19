"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimPilotLoadedEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var ClaimPilotLoadedEvent;
(function (ClaimPilotLoadedEvent) {
    ClaimPilotLoadedEvent.ID = 'ClaimPilotLoadedEvent';
    ClaimPilotLoadedEvent.CANCELABLE = false;
    ClaimPilotLoadedEvent.ASYNC_ALLOWED = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(ClaimPilotLoadedEvent.ID, callback);
    }
    ClaimPilotLoadedEvent.register = register;
    async function handleFireCallbacks(callbacks, data) {
        for (const callback of callbacks) {
            const callbackResult = callback();
            if (callbackResult instanceof Promise) {
                await callbackResult;
            }
        }
    }
    ClaimPilotLoadedEvent.handleFireCallbacks = handleFireCallbacks;
})(ClaimPilotLoadedEvent = exports.ClaimPilotLoadedEvent || (exports.ClaimPilotLoadedEvent = {}));
(0, eventStorage_1.registerEventType)(ClaimPilotLoadedEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25Mb2FkZWRFdmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm9uTG9hZGVkRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsaURBQWdFO0FBRWhFLElBQWlCLHFCQUFxQixDQWtCckM7QUFsQkQsV0FBaUIscUJBQXFCO0lBQ3JCLHdCQUFFLEdBQUcsdUJBQXVCLENBQUM7SUFDN0IsZ0NBQVUsR0FBRyxLQUFLLENBQUM7SUFDbkIsbUNBQWEsR0FBRyxJQUFJLENBQUM7SUFHbEMsU0FBZ0IsUUFBUSxDQUFDLFFBQWtCO1FBQ3ZDLElBQUEsNEJBQWEsRUFBQyxzQkFBQSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUZlLDhCQUFRLFdBRXZCLENBQUE7SUFFTSxLQUFLLFVBQVUsbUJBQW1CLENBQUMsU0FBcUIsRUFBRSxJQUFTO1FBQ3RFLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQzlCLE1BQU0sY0FBYyxHQUFHLFFBQVEsRUFBRSxDQUFDO1lBQ2xDLElBQUksY0FBYyxZQUFZLE9BQU8sRUFBRTtnQkFDbkMsTUFBTSxjQUFjLENBQUM7YUFDeEI7U0FDSjtJQUNMLENBQUM7SUFQcUIseUNBQW1CLHNCQU94QyxDQUFBO0FBQ0wsQ0FBQyxFQWxCZ0IscUJBQXFCLEdBQXJCLDZCQUFxQixLQUFyQiw2QkFBcUIsUUFrQnJDO0FBRUQsSUFBQSxnQ0FBaUIsRUFBQyxxQkFBcUIsQ0FBQyxDQUFDIn0=