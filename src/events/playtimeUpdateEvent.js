"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaytimeUpdateEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var PlaytimeUpdateEvent;
(function (PlaytimeUpdateEvent) {
    PlaytimeUpdateEvent.ID = 'PlaytimeUpdateEvent';
    PlaytimeUpdateEvent.CANCELABLE = false;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(PlaytimeUpdateEvent.ID, callback);
    }
    PlaytimeUpdateEvent.register = register;
    function handleFireCallbacks(callbacks, data) {
        for (const callback of callbacks) {
            callback(data.xuid, data.playtimeInfo);
        }
    }
    PlaytimeUpdateEvent.handleFireCallbacks = handleFireCallbacks;
})(PlaytimeUpdateEvent = exports.PlaytimeUpdateEvent || (exports.PlaytimeUpdateEvent = {}));
(0, eventStorage_1.registerEventType)(PlaytimeUpdateEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxheXRpbWVVcGRhdGVFdmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBsYXl0aW1lVXBkYXRlRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsaURBQWdFO0FBRWhFLElBQWlCLG1CQUFtQixDQWNuQztBQWRELFdBQWlCLG1CQUFtQjtJQUNuQixzQkFBRSxHQUFHLHFCQUFxQixDQUFDO0lBQzNCLDhCQUFVLEdBQUcsS0FBSyxDQUFDO0lBR2hDLFNBQWdCLFFBQVEsQ0FBQyxRQUFrQjtRQUN2QyxJQUFBLDRCQUFhLEVBQUMsbUJBQW1CLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFGZSw0QkFBUSxXQUV2QixDQUFBO0lBRUQsU0FBZ0IsbUJBQW1CLENBQUMsU0FBcUIsRUFBRSxJQUFTO1FBQ2hFLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQzlCLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUMxQztJQUNMLENBQUM7SUFKZSx1Q0FBbUIsc0JBSWxDLENBQUE7QUFDTCxDQUFDLEVBZGdCLG1CQUFtQixHQUFuQiwyQkFBbUIsS0FBbkIsMkJBQW1CLFFBY25DO0FBRUQsSUFBQSxnQ0FBaUIsRUFBQyxtQkFBbUIsQ0FBQyxDQUFDIn0=