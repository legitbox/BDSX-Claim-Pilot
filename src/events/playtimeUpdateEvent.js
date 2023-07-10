"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaytimeUpdateEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var PlaytimeUpdateEvent;
(function (PlaytimeUpdateEvent) {
    PlaytimeUpdateEvent.ID = 'PlaytimeUpdateEvent';
    PlaytimeUpdateEvent.CANCELABLE = false;
    PlaytimeUpdateEvent.ASYNC_ALLOWED = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(PlaytimeUpdateEvent.ID, callback);
    }
    PlaytimeUpdateEvent.register = register;
    async function handleFireCallbacks(callbacks, data) {
        for (const callback of callbacks) {
            const callbackResult = callback(data.xuid, data.playtimeInfo);
            if (callbackResult instanceof Promise) {
                await callbackResult;
            }
        }
    }
    PlaytimeUpdateEvent.handleFireCallbacks = handleFireCallbacks;
})(PlaytimeUpdateEvent = exports.PlaytimeUpdateEvent || (exports.PlaytimeUpdateEvent = {}));
(0, eventStorage_1.registerEventType)(PlaytimeUpdateEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxheXRpbWVVcGRhdGVFdmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBsYXl0aW1lVXBkYXRlRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsaURBQWdFO0FBRWhFLElBQWlCLG1CQUFtQixDQWtCbkM7QUFsQkQsV0FBaUIsbUJBQW1CO0lBQ25CLHNCQUFFLEdBQUcscUJBQXFCLENBQUM7SUFDM0IsOEJBQVUsR0FBRyxLQUFLLENBQUM7SUFDbkIsaUNBQWEsR0FBRyxJQUFJLENBQUM7SUFHbEMsU0FBZ0IsUUFBUSxDQUFDLFFBQWtCO1FBQ3ZDLElBQUEsNEJBQWEsRUFBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUZlLDRCQUFRLFdBRXZCLENBQUE7SUFFTSxLQUFLLFVBQVUsbUJBQW1CLENBQUMsU0FBcUIsRUFBRSxJQUFTO1FBQ3RFLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQzlCLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM5RCxJQUFJLGNBQWMsWUFBWSxPQUFPLEVBQUU7Z0JBQ25DLE1BQU0sY0FBYyxDQUFDO2FBQ3hCO1NBQ0o7SUFDTCxDQUFDO0lBUHFCLHVDQUFtQixzQkFPeEMsQ0FBQTtBQUNMLENBQUMsRUFsQmdCLG1CQUFtQixHQUFuQiwyQkFBbUIsS0FBbkIsMkJBQW1CLFFBa0JuQztBQUVELElBQUEsZ0NBQWlCLEVBQUMsbUJBQW1CLENBQUMsQ0FBQyJ9