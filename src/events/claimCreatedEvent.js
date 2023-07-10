"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimCreationEvent = void 0;
const eventStorage_1 = require("./eventStorage");
var ClaimCreationEvent;
(function (ClaimCreationEvent) {
    ClaimCreationEvent.ID = 'ClaimCreationEvent';
    ClaimCreationEvent.CANCELABLE = true;
    ClaimCreationEvent.ASYNC_ALLOWED = true;
    function register(callback) {
        (0, eventStorage_1.registerEvent)(ClaimCreationEvent.ID, callback);
    }
    ClaimCreationEvent.register = register;
    async function handleFireCallbacks(callbacks, data) {
        let shouldExecute = true;
        for (const callback of callbacks) {
            const callbackResult = callback(data.claim, data.ownerXuid);
            let res;
            if (typeof callbackResult === "boolean") {
                res = callbackResult;
            }
            else {
                res = await callbackResult;
            }
            if (res !== undefined && !res) {
                shouldExecute = false;
            }
        }
        return shouldExecute;
    }
    ClaimCreationEvent.handleFireCallbacks = handleFireCallbacks;
})(ClaimCreationEvent = exports.ClaimCreationEvent || (exports.ClaimCreationEvent = {}));
(0, eventStorage_1.registerEventType)(ClaimCreationEvent);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhaW1DcmVhdGVkRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGFpbUNyZWF0ZWRFdmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpREFBZ0U7QUFFaEUsSUFBaUIsa0JBQWtCLENBNkJsQztBQTdCRCxXQUFpQixrQkFBa0I7SUFDbEIscUJBQUUsR0FBRyxvQkFBb0IsQ0FBQztJQUMxQiw2QkFBVSxHQUFHLElBQUksQ0FBQztJQUNsQixnQ0FBYSxHQUFHLElBQUksQ0FBQztJQUdsQyxTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDdkMsSUFBQSw0QkFBYSxFQUFDLG1CQUFBLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRmUsMkJBQVEsV0FFdkIsQ0FBQTtJQUVNLEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxTQUFxQixFQUFFLElBQVM7UUFDdEUsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFO1lBQzlCLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM1RCxJQUFJLEdBQVksQ0FBQztZQUNqQixJQUFJLE9BQU8sY0FBYyxLQUFLLFNBQVMsRUFBRTtnQkFDckMsR0FBRyxHQUFHLGNBQWMsQ0FBQzthQUN4QjtpQkFBTTtnQkFDSCxHQUFHLEdBQUcsTUFBTSxjQUFjLENBQUM7YUFDOUI7WUFHRCxJQUFJLEdBQUcsS0FBSyxTQUFTLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQzNCLGFBQWEsR0FBRyxLQUFLLENBQUM7YUFDekI7U0FDSjtRQUVELE9BQU8sYUFBYSxDQUFDO0lBQ3pCLENBQUM7SUFsQnFCLHNDQUFtQixzQkFrQnhDLENBQUE7QUFDTCxDQUFDLEVBN0JnQixrQkFBa0IsR0FBbEIsMEJBQWtCLEtBQWxCLDBCQUFrQixRQTZCbEM7QUFFRCxJQUFBLGdDQUFpQixFQUFDLGtCQUFrQixDQUFDLENBQUMifQ==