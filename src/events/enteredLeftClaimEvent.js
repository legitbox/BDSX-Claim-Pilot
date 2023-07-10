"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnteredLeftClaimEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var EnteredLeftClaimEvent;
(function (EnteredLeftClaimEvent) {
    EnteredLeftClaimEvent.ID = 'EnteredLeftClaimEvent';
    EnteredLeftClaimEvent.CANCELABLE = false;
    EnteredLeftClaimEvent.ASYNC_ALLOWED = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(EnteredLeftClaimEvent.ID, callback);
    }
    EnteredLeftClaimEvent.register = register;
    async function handleFireCallbacks(callbacks, data) {
        for (const callback of callbacks) {
            const callbackResult = callback(data.playerXuid, data.claim);
            if (callbackResult instanceof Promise) {
                await callbackResult;
            }
        }
    }
    EnteredLeftClaimEvent.handleFireCallbacks = handleFireCallbacks;
})(EnteredLeftClaimEvent = exports.EnteredLeftClaimEvent || (exports.EnteredLeftClaimEvent = {}));
(0, eventStorage_1.registerEventType)(EnteredLeftClaimEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50ZXJlZExlZnRDbGFpbUV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZW50ZXJlZExlZnRDbGFpbUV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlEQUFnRTtBQUVoRSxJQUFpQixxQkFBcUIsQ0FrQnJDO0FBbEJELFdBQWlCLHFCQUFxQjtJQUNyQix3QkFBRSxHQUFHLHVCQUF1QixDQUFDO0lBQzdCLGdDQUFVLEdBQUcsS0FBSyxDQUFDO0lBQ25CLG1DQUFhLEdBQUcsSUFBSSxDQUFDO0lBR2xDLFNBQWdCLFFBQVEsQ0FBQyxRQUFrQjtRQUN2QyxJQUFBLDRCQUFhLEVBQUMsc0JBQUEsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFGZSw4QkFBUSxXQUV2QixDQUFBO0lBRU0sS0FBSyxVQUFVLG1CQUFtQixDQUFDLFNBQXFCLEVBQUUsSUFBUztRQUN0RSxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtZQUM5QixNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDN0QsSUFBSSxjQUFjLFlBQVksT0FBTyxFQUFFO2dCQUNuQyxNQUFNLGNBQWMsQ0FBQzthQUN4QjtTQUNKO0lBQ0wsQ0FBQztJQVBxQix5Q0FBbUIsc0JBT3hDLENBQUE7QUFDTCxDQUFDLEVBbEJnQixxQkFBcUIsR0FBckIsNkJBQXFCLEtBQXJCLDZCQUFxQixRQWtCckM7QUFFRCxJQUFBLGdDQUFpQixFQUFDLHFCQUFxQixDQUFDLENBQUMifQ==