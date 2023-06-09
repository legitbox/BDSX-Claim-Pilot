"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnteredLeftClaimEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var EnteredLeftClaimEvent;
(function (EnteredLeftClaimEvent) {
    EnteredLeftClaimEvent.ID = 'EnteredLeftClaimEvent';
    EnteredLeftClaimEvent.CANCELABLE = false;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(EnteredLeftClaimEvent.ID, callback);
    }
    EnteredLeftClaimEvent.register = register;
    function handleFireCallbacks(callbacks, data) {
        for (const callback of callbacks) {
            callback(data.player, data.claim);
        }
    }
    EnteredLeftClaimEvent.handleFireCallbacks = handleFireCallbacks;
})(EnteredLeftClaimEvent = exports.EnteredLeftClaimEvent || (exports.EnteredLeftClaimEvent = {}));
(0, eventStorage_1.registerEventType)(EnteredLeftClaimEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW50ZXJlZExlZnRDbGFpbUV2ZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZW50ZXJlZExlZnRDbGFpbUV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLGlEQUFnRTtBQUVoRSxJQUFpQixxQkFBcUIsQ0FjckM7QUFkRCxXQUFpQixxQkFBcUI7SUFDckIsd0JBQUUsR0FBRyx1QkFBdUIsQ0FBQztJQUM3QixnQ0FBVSxHQUFHLEtBQUssQ0FBQztJQUdoQyxTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDdkMsSUFBQSw0QkFBYSxFQUFDLHNCQUFBLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRmUsOEJBQVEsV0FFdkIsQ0FBQTtJQUVELFNBQWdCLG1CQUFtQixDQUFDLFNBQXFCLEVBQUUsSUFBUztRQUNoRSxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtZQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDckM7SUFDTCxDQUFDO0lBSmUseUNBQW1CLHNCQUlsQyxDQUFBO0FBQ0wsQ0FBQyxFQWRnQixxQkFBcUIsR0FBckIsNkJBQXFCLEtBQXJCLDZCQUFxQixRQWNyQztBQUVELElBQUEsZ0NBQWlCLEVBQUMscUJBQXFCLENBQUMsQ0FBQyJ9