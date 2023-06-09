"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimCreationEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var ClaimCreationEvent;
(function (ClaimCreationEvent) {
    ClaimCreationEvent.ID = 'ClaimCreationEvent';
    ClaimCreationEvent.CANCELABLE = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(ClaimCreationEvent.ID, callback);
    }
    ClaimCreationEvent.register = register;
    function handleFireCallbacks(callbacks, data) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const res = callback(data.claim, data.ownerXuid);
            if (!res) {
                shouldExecute = false;
            }
        }
        return shouldExecute;
    }
    ClaimCreationEvent.handleFireCallbacks = handleFireCallbacks;
})(ClaimCreationEvent = exports.ClaimCreationEvent || (exports.ClaimCreationEvent = {}));
(0, eventStorage_1.registerEventType)(ClaimCreationEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1DcmVhdGVkRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbUNyZWF0ZWRFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpREFBZ0U7QUFFaEUsSUFBaUIsa0JBQWtCLENBb0JsQztBQXBCRCxXQUFpQixrQkFBa0I7SUFDbEIscUJBQUUsR0FBRyxvQkFBb0IsQ0FBQztJQUMxQiw2QkFBVSxHQUFHLElBQUksQ0FBQztJQUcvQixTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDdkMsSUFBQSw0QkFBYSxFQUFDLG1CQUFBLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRmUsMkJBQVEsV0FFdkIsQ0FBQTtJQUVELFNBQWdCLG1CQUFtQixDQUFDLFNBQXFCLEVBQUUsSUFBUztRQUNoRSxJQUFJLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDekIsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUU7WUFDOUIsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ04sYUFBYSxHQUFHLEtBQUssQ0FBQzthQUN6QjtTQUNKO1FBRUQsT0FBTyxhQUFhLENBQUM7SUFDekIsQ0FBQztJQVZlLHNDQUFtQixzQkFVbEMsQ0FBQTtBQUNMLENBQUMsRUFwQmdCLGtCQUFrQixHQUFsQiwwQkFBa0IsS0FBbEIsMEJBQWtCLFFBb0JsQztBQUVELElBQUEsZ0NBQWlCLEVBQUMsa0JBQWtCLENBQUMsQ0FBQyJ9